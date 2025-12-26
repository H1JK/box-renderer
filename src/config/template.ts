import { Template } from "../parts/template"

export interface RendererConfigTemplate {
    tag: string
    from: 'remote' | 'local' | 'inline'
    options?: RendererConfigTemplateOptions

    /**
     * Remote fields
     */
    remote_url?: string
    remote_header?: {
        [k: string]: string
    }
    remote_disable_cache?: boolean

    /**
     * Local fields
     */
    local_path?: string

    /**
     * Inline fields
     */
    payload?: Template
}

export interface RendererConfigTemplateOptions {
    append?: RendererConfigTemplateAppend
    append_groups?: RendererConfigTemplateAppendGroups
}

export interface RendererConfigTemplateAppend {
    outbounds?: {
        [tag: string]: RendererConfigTemplateFilter | null
    }
    endpoints?: {
        [tag: string]: RendererConfigTemplateFilter | null
    }
}

export interface RendererConfigTemplateAppendGroups {
    [tag: string]: RendererConfigTemplateFilter | null
}

export interface RendererConfigTemplateFilter {
    filter?: string[]
    exclude?: string[]
}
