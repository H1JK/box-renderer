import { RendererConfig } from "./config/root";
import { RendererConfigTemplate, RendererConfigTemplateAppend, RendererConfigTemplateOptions } from "./config/template";
import { GistFiles } from "./gist";
import { sha256hex } from "./hash";
import { Resource, Routable, RoutableGroup } from "./parts/resource";
import { Template } from "./parts/template";
import { SemVer } from "./semver";

export class Renderer {
    private resourceMap: Map<string, Resource>;

    constructor(
        public config: RendererConfig,
        public userVersion: SemVer | null,
        public gist: GistFiles,
        public cache: KVNamespace<string> | undefined
    ) {
        this.resourceMap = new Map();
    }

    private regexGo(re: string): RegExp {
        // we only support the "case-insensitive" flag here
        // since other flags are usually not used by our cases
        let flag = "";
        if (re.startsWith("(?i)")) {
            re = re.substring("(?i)".length);
            flag = "i";
        }
        return new RegExp(re, flag);
    }

    async render(): Promise<object> {
        let template = this.config.templates[0];
        // find template by rule
        if (this.config.template_rules !== undefined) {
            const templateTag = this.findTemplateTagByRule();
            if (templateTag !== undefined) {
                const matchedTemplate = this.config.templates.find(it => it.tag === templateTag);
                if (matchedTemplate === undefined) {
                    return Promise.reject(`Matched template tag [${templateTag}] is not found`);
                }
                template = matchedTemplate;
            }
        }

        const promises: any[] = [];
        // gather resources
        if (this.config.resources !== undefined && template.options !== undefined) {
            const tags = this.collectResourceTags(template.options);
            promises.push(...await this.loadResources(tags));
        }

        // load template
        const templatePromise = this.loadTemplate(template);
        promises.push(templatePromise);
        await Promise.allSettled(promises);
        const output = await templatePromise; // should have already settled

        // render config
        if (template.options !== undefined) {
            const typedEntries = <T extends object>(obj?: T): [string, T[keyof T]][] => {
                if (obj === undefined) return [];
                return Object.entries(obj) as [string, T[keyof T]][];
            };
            const included = new Set<Routable>();
            for (const [tag, option] of typedEntries(template.options?.append?.outbounds)) {
                const filterMatchers = option?.filter?.map(this.regexGo);
                const excludeMatchers = option?.exclude?.map(this.regexGo);
                const filterAndAppend = (resource: Resource, _resourceTag: string) => {
                    resource.outbounds?.forEach(outbound => {
                        if (filterMatchers !== undefined && filterMatchers.every(matcher => matcher.test(outbound.tag))) return;
                        if (excludeMatchers !== undefined && excludeMatchers.some(matcher => matcher.test(outbound.tag))) return;
                        if (output.outbounds === undefined) output.outbounds = [];
                        output.outbounds.push(outbound);
                        included.add(outbound);
                    });
                };
                if (tag === "*") {
                    this.resourceMap.forEach(filterAndAppend);
                    break;
                } else {
                    const resource = this.resourceMap.get(tag);
                    if (resource === undefined) return Promise.reject(`Resource tag [${tag}] is not found`);
                    filterAndAppend(resource, tag);
                }
            }
            for (const [tag, option] of typedEntries(template.options?.append?.endpoints)) {
                const filterMatchers = option?.filter?.map(this.regexGo);
                const excludeMatchers = option?.exclude?.map(this.regexGo);
                const filterAndAppend = (resource: Resource, _resourceTag: string) => {
                    resource.endpoints?.forEach(endpoint => {
                        if (filterMatchers !== undefined && filterMatchers.every(matcher => matcher.test(endpoint.tag))) return;
                        if (excludeMatchers !== undefined && excludeMatchers.some(matcher => matcher.test(endpoint.tag))) return;
                        if (output.endpoints === undefined) output.endpoints = [];
                        output.endpoints.push(endpoint);
                        included.add(endpoint);
                    });
                };
                if (tag === "*") {
                    this.resourceMap.forEach(filterAndAppend);
                    break;
                } else {
                    const resource = this.resourceMap.get(tag);
                    if (resource === undefined) return Promise.reject(`Resource tag [${tag}] is not found`);
                    filterAndAppend(resource, tag);
                }
            }


            for (const [groupTag, option] of typedEntries(template.options?.append_groups)) {
                const group = output.outbounds?.find(outbound => outbound.tag === groupTag) as RoutableGroup | undefined;
                if (group === undefined) {
                    return Promise.reject(`Routable group tag [${groupTag}] is not found`);
                }
                const filterMatchers = option?.filter?.map(this.regexGo);
                const excludeMatchers = option?.exclude?.map(this.regexGo);
                included.forEach(routable => {
                    if (filterMatchers !== undefined && !filterMatchers.every(matcher => matcher.test(routable.tag))) return;
                    if (excludeMatchers !== undefined && !excludeMatchers.some(matcher => matcher.test(routable.tag))) return;
                    if (group.outbounds === undefined) group.outbounds = [];
                    group.outbounds.push(routable.tag);
                });
            }
        }

        return output;
    }

    private findTemplateTagByRule(): string | undefined {
        if (this.config.template_rules === undefined) return undefined;
        return this.config.template_rules.find(it => {
            let matched = true;
            if (this.userVersion !== null) {
                if (matched && it.version_eq !== undefined && !new SemVer(it.version_eq).eq(this.userVersion)) matched = false;
                if (matched && it.version_gte !== undefined && !new SemVer(it.version_gte).gte(this.userVersion)) matched = false;
                if (matched && it.version_gt !== undefined && !new SemVer(it.version_gt).gt(this.userVersion)) matched = false;
                if (matched && it.version_lte !== undefined && !new SemVer(it.version_lte).lte(this.userVersion)) matched = false;
                if (matched && it.version_eq !== undefined && !new SemVer(it.version_eq).lt(this.userVersion)) matched = false;
            }
            return matched;
        })?.tag;
    }

    private collectResourceTags(options: RendererConfigTemplateOptions): string[] {
        const collectAppendTags = (
            append: RendererConfigTemplateAppend,
            set: Set<string>
        ) => {
            if (append.outbounds) {
                for (const tag of Object.keys(append.outbounds)) {
                    if (tag === "*") return true;
                    set.add(tag)
                }
            }

            if (append.endpoints) {
                for (const tag of Object.keys(append.endpoints)) {
                    if (tag === "*") return true;
                    set.add(tag)
                }
            }

            return false;
        };
        const set = new Set<string>();
        let loadAll = false;

        if (options.append) {
            loadAll = collectAppendTags(options.append, set);
        }

        if (!loadAll && options.append_groups) {
            for (const tag of Object.keys(options.append_groups)) {
                if (tag === "*") {
                    loadAll = true;
                    break;
                }
                set.add(tag)
            }
        }

        if (loadAll && this.config.resources !== undefined) {
            // we can return mapped tags directly here
            // but I want to retain tags that exist in the set but not in the resource list
            // so we add all of it to set and then convert it back to array
            this.config.resources.forEach(it => set.add(it.tag));
        }
        return Array.from(set);
    }

    private async loadResources(tags: string[]): Promise<Promise<void>[]> {
        if (this.config.resources === undefined) return Promise.resolve([]);
        let unknownTag: string | undefined = tags.find(tag => !this.config.resources!.some(it => it.tag === tag));
        if (unknownTag !== undefined) {
            return Promise.reject(`Resource tag [${unknownTag}] is not found`);
        }
        const promises: Promise<void>[] = tags.map(tag => {
            const resourceConfig = this.config.resources!.find(it => it.tag === tag)!;
            let failed = false;
            if (resourceConfig.from === "local") {
                if (resourceConfig.local_path == "") return Promise.reject(`${tag}: Empty local path`);
                const fileURL = this.gist[resourceConfig.local_path!]?.raw_url;
                if (fileURL === undefined) return Promise.reject(`${tag}: Can't find URL for local file [${resourceConfig.local_path}]`);
                resourceConfig.remote_url = fileURL;
            }
            const process = (resource: Resource) => {
                resourceConfig.options?.filter?.forEach(re => {
                    const matcher = this.regexGo(re);
                    resource.outbounds = resource.outbounds?.filter(it => matcher.test(it.tag));
                    resource.endpoints = resource.endpoints?.filter(it => matcher.test(it.tag));
                });
                resourceConfig.options?.exclude?.forEach(re => {
                    const matcher = this.regexGo(re);
                    resource.outbounds = resource.outbounds?.filter(it => !matcher.test(it.tag));
                    resource.endpoints = resource.endpoints?.filter(it => !matcher.test(it.tag));
                });
                resourceConfig.options?.filter_type?.forEach(re => {
                    const matcher = this.regexGo(re);
                    resource.outbounds = resource.outbounds?.filter(it => matcher.test(it.type));
                    resource.endpoints = resource.endpoints?.filter(it => matcher.test(it.type));
                });
                resourceConfig.options?.exclude_type?.forEach(re => {
                    const matcher = this.regexGo(re);
                    resource.outbounds = resource.outbounds?.filter(it => !matcher.test(it.type));
                    resource.endpoints = resource.endpoints?.filter(it => !matcher.test(it.type));
                });
                return resource;
            }
            switch (resourceConfig.from) {
                case "inline":
                    this.resourceMap.set(tag, process(resourceConfig.payload as Resource));
                    return Promise.resolve();
                default: // local or remote
                    if (resourceConfig.remote_url == "") return Promise.reject(`${tag}: Empty remote URL`);
                    const tryLoadFromCache = async () => {
                        if (this.cache !== undefined) {
                            const cachedBody = await this.cache.get(await sha256hex(resourceConfig.remote_url!));
                            return cachedBody === null ? null : new Response(cachedBody);
                        }
                        return null;
                    }
                    return fetch(resourceConfig.remote_url!, {
                        headers: resourceConfig.remote_header
                    }).catch(async reason => {
                        failed = true;
                        console.warn("Error when loading resource at ", resourceConfig.remote_url, " , reason: ", reason);
                        if (!resourceConfig.remote_disable_cache) {
                            return await tryLoadFromCache() ?? new Response("{}");
                        }
                        return new Response("{}");
                    }).then(async response => {
                        if (!response.ok && !resourceConfig.remote_disable_cache) {
                            failed = true;
                            response = await tryLoadFromCache() ?? new Response("{}");
                        }
                        let resource = await response.json<Resource>();
                        if (!failed && !resourceConfig.remote_disable_cache && this.cache !== undefined) {
                            this.cache.put(await sha256hex(resourceConfig.remote_url!), JSON.stringify(resource));
                        }
                        resource = process(resource);
                        if (resourceConfig.options?.tag_prefix !== undefined) {
                            resource.outbounds?.forEach(outbound => outbound.tag = resourceConfig.options!.tag_prefix + outbound.tag);
                            resource.endpoints?.forEach(endpoint => endpoint.tag = resourceConfig.options!.tag_prefix + endpoint.tag);
                        }
                        this.resourceMap.set(tag, resource);
                    })
            }
        });
        return promises;
    }

    private async loadTemplate(templateConfig: RendererConfigTemplate): Promise<Template> {
        let failed = false;
        if (templateConfig.from === "local") {
            if (templateConfig.local_path == "") return Promise.reject(`${templateConfig.tag}: Empty local path`);
            const fileURL = this.gist[templateConfig.local_path!]?.raw_url;
            if (fileURL === undefined) return Promise.reject(`${templateConfig.tag}: Can't find URL for local file [${templateConfig.local_path}]`);
            templateConfig.remote_url = fileURL;
        }
        switch (templateConfig.from) {
            case "inline":
                return Promise.resolve(templateConfig.payload as Template);
            default: // local or remote
                if (templateConfig.remote_url == "") return Promise.reject(`${templateConfig.tag}: Empty remote URL`);
                const tryLoadFromCache = async () => {
                    if (this.cache !== undefined) {
                        const cachedBody = await this.cache.get(await sha256hex(templateConfig.remote_url!));
                        return cachedBody === null ? null : new Response(cachedBody);
                    }
                    return null;
                }
                return fetch(templateConfig.remote_url!, {
                    headers: templateConfig.remote_header
                }).catch(async reason => {
                    failed = true;
                    console.warn("Error when loading template at ", templateConfig.remote_url, " , reason: ", reason);
                    if (!templateConfig.remote_disable_cache) {
                        return await tryLoadFromCache() ?? new Response("{}");
                    }
                    return new Response("{}");
                }).then(async response => {
                    if (!response.ok && !templateConfig.remote_disable_cache) {
                        failed = true;
                        response = await tryLoadFromCache() ?? new Response("{}");
                    }
                    const template = await response.json<Template>();
                    if (!failed && !templateConfig.remote_disable_cache && this.cache !== undefined) {
                        this.cache.put(await sha256hex(templateConfig.remote_url!), JSON.stringify(template));
                    }
                    return template;
                });
        }
    }
}
