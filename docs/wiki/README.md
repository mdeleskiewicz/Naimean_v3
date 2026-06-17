# Cloudflare Architecture — Wiki Index

This wiki explains how Naimean V3 uses Cloudflare services in the current repository state.

## Pages

1. [Naimean V3 Cloudflare Infrastructure and Architecture](Naimean-V3-Cloudflare-Infrastructure-and-Architecture.md)
   Master reference for current Cloudflare deployment architecture and resource inventory.
2. [Cloudflare Workers](Cloudflare-Workers.md)
   Runtime request handling in `src/worker.js` (routing, auth, APIs, headers).
3. [Cloudflare Pages and Assets](Cloudflare-Pages-and-Assets.md)
   Static files in `public/`, `ASSETS` binding behavior, aliasing, and caching.
4. [Durable Objects](Durable-Objects.md)
   `Hotspotstore` instance model and route dispatch patterns.
5. [Durable Object Storage](Durable-Object-Storage.md)
   KV-style and SQLite storage usage inside `Hotspotstore`.
6. [Wrangler](Wrangler.md)
   `wrangler.toml` config layout, bindings, vars, and secrets.
7. [Deployment and CI](Deployment-and-CI.md)
   GitHub Actions deploy flow, required secrets, and validation workflow.
8. [Product Features](features/README.md)
   Feature-level docs for room behavior and overlays.
9. [Discord Auth](Discord_Auth.md)
   Module for Discord-based authentication and invite tracking.
10. [Card System](Card_System.md)
    Core system for handling cards and score tracking.

## Quick Reference: Active Cloudflare Wiring

| Service | Binding / Config key | Where used |
|---|---|---|
| Workers | `main = "src/worker.js"` | `src/worker.js` |
| Assets (Pages) | `env.ASSETS` | `serveAsset()` in `src/worker.js` |
| Durable Objects | `env.HOTSPOT_STORE` | DO dispatch helpers in `src/worker.js` |
| DO KV Storage | `this.state.storage.get/put` | `Hotspotstore` blob state handlers |
| DO SQLite Storage | `this.state.storage.sql` | `Hotspotstore` SQL handlers |
| D1 | `DB` | `/api/db-test` and `wrangler.toml` |
| Observability | `[observability] enabled = true` | `wrangler.toml` |
| CI Deploy | `.github/workflows/deploy.yml` | push to `main` |

## Cloudflare Storage Inventory (Provided Reference)

| Type | Name | ID / Notes |
|---|---|---|
| Workers KV | `naimean-kv` | `dff7175859ce478eab8c918949ca330f` |
| Durable Object | `HOTSPOT_STORE` | Main application state |
| D1 Database | `NAIMEAN_DB` | Experimental SQLite |
