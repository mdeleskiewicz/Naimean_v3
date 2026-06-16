# System Overview

## Purpose

Naimean V3 is a single-repository Cloudflare application that combines:

- static room-based UI pages in `public/`
- an edge API/router in `src/worker.js`
- stateful storage through one Durable Object class (`HotspotStore`)

## Runtime Architecture

| Layer | Implementation | Responsibility |
|---|---|---|
| Edge Runtime | Cloudflare Worker (`src/worker.js`) | Routing, API responses, auth/session logic, static asset mediation |
| Stateful Compute | Durable Object (`HotspotStore`) | Serialized writes and persistent state per named instance |
| Structured Storage | DO SQLite + D1 (`DB`) | Calendar, room state, preferences in DO SQLite; D1 bound for broader relational workflows |
| Static Hosting | Cloudflare Assets (`ASSETS` -> `public/`) | HTML/CSS/JS/images/audio/video delivery |

## Request Flow (High Level)

1. A request enters `src/worker.js`.
2. Binary static asset requests bypass most routing logic and are served by `env.ASSETS.fetch`.
3. API routes are handled by worker logic or forwarded to `HOTSPOT_STORE` Durable Object instances.
4. Protected routes (notes/mame/calendar) enforce Discord session auth.
5. Responses are returned with security headers and cache-control behavior based on resource type.

## Codebase Map

| Area | Main Files |
|---|---|
| Worker + APIs | `src/worker.js` |
| Static pages | `public/index.html`, `public/commodore.html`, `public/chapel.html`, `public/noahs-arcade.html`, etc. |
| Shared client API helpers | `public/api-client.js` |
| Tests | `test/worker.test.js` and focused suite files under `test/*.test.js` |
| Cloudflare docs | `docs/wiki/*.md` |

## Cloudflare Resource Inventory

### Actively bound in this repo

- Durable Object: `HOTSPOT_STORE` (`HotspotStore`)
- D1: `DB` -> `naimean-v3-db` (`0798d2f2-618b-4044-91f5-a2c762922184`)
- Assets: `ASSETS` -> `public/`

### Additional account resources provided for reference

- Workers KV: `naimean-kv` (`dff7175059ce478eab8c910949ca330f`)
- D1: `naimean-db` (`0871f90d-f7e3-467a-a1f9-4e74ac8aef42`)
- D1: `barrelroll-counter-db` (`22277fbe-031d-4ca2-8937-245309e981cd`)
- R2: `naimean-v3-assets` (account resource only; not bound in `wrangler.toml`)

## Operational Notes

- Config source in this repo is `wrangler.toml`.
- CI workflow deploys with `--config wrangler.toml`; keep deployment automation aligned with the canonical config file.
