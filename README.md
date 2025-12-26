# box-renderer

*Server-side Rendering for Proxy Platforms*

Simple server-side config renderer for sing-box, built with Cloudflare Workers and GitHub Gist.

Like [serenity](https://github.com/SagerNet/serenity) and [Sub-Store](https://github.com/sub-store-org/Sub-Store), but it:

- Focuses on sing-box (*for now*).
- Works serverlessly on Cloudflare Worker.
- Has zero dependency (except TypeScript).
- Does no "subscription conversion", just bundles multiple sing-box configurations.
- Includes a simple cache built with Cloudflare Workers KV for failover.
- Stores settings in GitHub Gist, accessed via (default) token and Gist ID provided by the URL, thus supports multi-user seamlessly.
- Supports template rules for delivering per-client-version template.
