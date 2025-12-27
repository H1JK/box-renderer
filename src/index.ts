import { RendererConfig } from "./config/root";
import { GitHubClient } from "./github";
import { Renderer } from "./renderer";
import { parseSingBoxVersionFromUA } from "./user_agent";

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);
		if ("RENDERER_VERIFY_HOSTNAME" in env && typeof env.RENDERER_VERIFY_HOSTNAME === "string") {
			if (url.hostname !== env.RENDERER_VERIFY_HOSTNAME) {
				return new Response(null, {
					status: 404
				});
			}
		}
		if ("RENDERER_VERIFY_PATH" in env && typeof env.RENDERER_VERIFY_PATH === "string") {
			if (url.pathname !== env.RENDERER_VERIFY_PATH) {
				return new Response(null, {
					status: 404
				});
			}
		}
		let fallbackToken: string | undefined = undefined;
		if ("RENDERER_FALLBACK_TOKEN" in env && typeof env.RENDERER_FALLBACK_TOKEN === "string") {
			fallbackToken = env.RENDERER_FALLBACK_TOKEN;
		}
		const resourceCache: KVNamespace<string> | undefined = env.RENDERER_RESOURCE_CACHE;

		const token = url.searchParams.get("token") ?? fallbackToken;
		const gistID = url.searchParams.get("gist");
		if (gistID === null) {
			return new Response("invalid credentials");
		}
		const client = new GitHubClient(gistID, token);
		const gistFiles = await client.files().catch((reason) => {
			return new Response(`Failed to fetch gist files: ${reason}`, {
				status: 400
			});
		});
		if (gistFiles instanceof Response) {
			return gistFiles;
		}

		// load config
		const configGistFile = gistFiles["config.json"] ?? null;
		if (configGistFile === null) {
			return new Response("Cannot find config in gist files");
		}
		const rendererConfig = await (await client.downloadFile(configGistFile.raw_url)).json<RendererConfig>();

		// parse user client version
		const singBoxVersion = parseSingBoxVersionFromUA(request.headers.get("User-Agent"));

		const renderer = new Renderer(rendererConfig, singBoxVersion, gistFiles, resourceCache);
		return new Response(JSON.stringify(await renderer.render()), {
			headers: {
				"Content-Type": "application/json"
			}
		});
	},
} satisfies ExportedHandler<Env>;
