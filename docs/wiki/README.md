# Cloudflare Architecture — Wiki Index

This section documents every Cloudflare service and feature used in Naimean V3. Each page is written assuming you're new to Cloudflare and want to understand both the concept and how it's actually used in this codebase.

---

## Pages

### 1. [Cloudflare Workers](Cloudflare-Workers.md)
The core runtime. `src/worker.js` is a Cloudflare Worker — JavaScript that runs at the edge (globally, close to users) and handles every HTTP request to the site. Covers routing, API handling, auth, and the `env` binding system.

### 2. [Cloudflare Pages and Assets](Cloudflare-Pages-and-Assets.md)
How static files (HTML, images, video, CSS, audio) are hosted and served. Covers the `ASSETS` binding, the `public/` directory structure, path aliasing, cache headers, and the `_redirects` file.

### 3. [Durable Objects](Durable-Objects.md)
Stateful singleton Workers with persistent storage. The `HotspotStore` class is a Durable Object that stores hotspot positions, game scores, notes, calendar events, and room state. Covers the concept, named instances, and how the main Worker dispatches requests to them.

### 4. [Durable Object Storage](Durable-Object-Storage.md)
The two storage modes used inside `HotspotStore`: **KV storage** (simple key-value for blobs like hotspot arrays) and **SQLite storage** (relational tables for calendar events, user preferences, and room state). Covers the migration system, table schemas, and the SQL API.

### 5. [Wrangler](Wrangler.md)
Cloudflare's CLI and the `wrangler.jsonc` config file. Covers every config section (name, main, assets, vars, durable_objects, migrations, observability), the difference between `vars` and secrets, and common Wrangler commands.

### 6. [Deployment and CI](Deployment-and-CI.md)
The GitHub Actions workflow that automatically deploys to Cloudflare on every push to `main`. Covers the deploy steps, required GitHub secrets, Cloudflare runtime secrets, and the Google Drive log reporting hook.

---

## Quick Reference: Cloudflare Services Used in This Project

| Service | Binding / Config key | Where used |
|---|---|---|
| **Workers** | `"main": "src/worker.js"` | `src/worker.js` — all request handling |
| **Assets (Pages)** | `env.ASSETS` | `serveAsset()` in `src/worker.js` |
| **Durable Objects** | `env.HOTSPOT_STORE` | `dispatchToHotspotStore()` in `src/worker.js` |
| **DO KV Storage** | `this.state.storage.get/put` | Inside `HotspotStore.fetch()` |
| **DO SQLite Storage** | `this.state.storage.sql` | Inside `HotspotStore` SQL handlers |
| **Observability** | `"observability": { "enabled": true }` | Automatic — no code needed |
| **Wrangler** | `wrangler.jsonc` | CLI deploy tool |
| **CI / GitHub Actions** | `.github/workflows/deploy.yml` | Auto-deploy on push to main |

---

## Services This Project Does NOT Use (But You May Hear About)

Cloudflare has many more products. These are commonly mentioned but **not used** in this project:

| Service | What it is | Why not used here |
|---|---|---|
| **KV (Workers KV)** | A globally-distributed key-value store *outside* a Durable Object | The project uses Durable Object storage instead, which is simpler for this use case |
| **R2** | Object storage (like Amazon S3) for large files | Video assets are stored in the `public/` directory (served via Assets) and Google Drive |
| **D1** | A serverless SQLite database *outside* a Durable Object | The project uses the SQLite storage built into the Durable Object |
| **Queues** | Message queuing for async background jobs | Not needed — all operations are synchronous |
| **AI Gateway** | Proxying and caching AI API calls | Not used |
| **Zero Trust / Access** | Authentication and access control for teams | Discord OAuth is used instead for auth |
