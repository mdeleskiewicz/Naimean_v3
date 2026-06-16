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
   `HotspotStore` instance model and route dispatch patterns.
5. [Durable Object Storage](Durable-Object-Storage.md)
   KV-style and SQLite storage usage inside `HotspotStore`.
6. [Wrangler](Wrangler.md)
   `wrangler.toml` config layout, bindings, vars, and secrets.
7. [Deployment and CI](Deployment-and-CI.md)
   GitHub Actions deploy flow, required secrets, and validation workflow.
8. [Product Features](features/README.md)
   Feature-level docs for room behavior and overlays.

## Quick Reference: Active Cloudflare Wiring

| Service | Binding / Config key | Where used |
|---|---|---|
| Workers | `main = "src/worker.js"` | `src/worker.js` |
| Assets (Pages) | `env.ASSETS` | `serveAsset()` in `src/worker.js` |
| Durable Objects | `env.HOTSPOT_STORE` | DO dispatch helpers in `src/worker.js` |
| DO KV Storage | `this.state.storage.get/put` | `HotspotStore` blob state handlers |
| DO SQLite Storage | `this.state.storage.sql` | `HotspotStore` SQL handlers |
| D1 | `DB` | `/api/db-test` and `wrangler.toml` |
| Observability | `[observability] enabled = true` | `wrangler.toml` |
| CI Deploy | `.github/workflows/deploy.yml` | push to `main` |

## Cloudflare Storage Inventory (Provided Reference)

| Type | Name | ID / Notes |
|---|---|---|
| Workers KV | `naimean-kv` | `dff7175059ce478eab8c910949ca330f` |
| D1 | `naimean-v3-db` | `0798d2f2-618b-4044-91f5-a2c762922184` (bound as `DB`) |
| D1 | `naimean-db` | `0871f90d-f7e3-467a-a1f9-4e74ac8aef42` |
| D1 | `barrelroll-counter-db` | `22277fbe-031d-4ca2-8937-245309e981cd` |
| R2 | `naimean-v3-assets` | account resource only; not bound in `wrangler.toml` |

Only resources explicitly declared in `wrangler.toml` are available as runtime bindings in this codebase.
