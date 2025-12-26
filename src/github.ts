import { BaseGist, GistFiles } from "./gist";

const USER_AGENT = "cloudflare-worker box-renderer/0.1";

export class GitHubClient {
    constructor(public token: string, public gist: string) {
    }

    public async files(): Promise<GistFiles> {
        const response = await fetch(`https://api.github.com/gists/${this.gist}`, {
            headers: {
                "Accept": "application/vnd.github+json",
                "Authorization": `Bearer ${this.token}`,
                "User-Agent": USER_AGENT,
                "X-GitHub-Api-Version": "2022-11-28",
            },
        });
        if (!response.ok) {
            console.error("Fetch gist file list error:", await response.text());
            return Promise.reject("Failed to fetch gist file list");
        }
        return (await response.json<BaseGist>()).files;
    }

    public async downloadFile(url: string): Promise<Response> {
        const response = await fetch(url, {
            headers: {
                "User-Agent": USER_AGENT,
            },
        });
        if (!response.ok) {
            console.error("Download gist file error:", await response.text());
            return Promise.reject("Failed to download gist file");
        }
        return response;
    }
}
