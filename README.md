# Naimean V3

Naimean V3 is a Cloudflare edge application that serves a room-based interactive site (`public/*.html`) and API endpoints from a single Worker (`src/worker.js`).

## Repository Structure

| Path | Purpose |
|---|---|
| `src/worker.js` | Main Cloudflare Worker router, Discord auth flow, API handlers, Durable Object class (`HotspotStore`) |
| `public/` | Static site pages and media assets served through the `ASSETS` binding |
| `test/` | Node test suite for Worker routing, auth, Durable Object behavior, and UI fixture integrity |
| `docs/` | Project documentation and architecture notes |
| `docs/wiki/` | Cloudflare-focused wiki pages (Workers, Assets, Durable Objects, Wrangler, CI) |
| `.github/workflows/deploy.yml` | Automatic deployment workflow on pushes to `main` |
| `wrangler.toml` | Cloudflare runtime/config bindings used by this codebase |

## Key Technologies

- Cloudflare Workers (edge runtime)
- Cloudflare Durable Objects with SQLite-backed storage (`HOTSPOT_STORE`)
- Cloudflare Assets/Pages static hosting (`ASSETS`)
- Cloudflare D1 binding (`DB` -> `naimean-v3-db`)
- Cloudflare R2 binding (`ASSETS_STORAGE` -> `naimean-v3-assets`)
- Vanilla HTML/CSS/JavaScript frontend (no framework)
- Discord OAuth for authenticated routes
- Node.js built-in test runner (`node --test`)

## Code Organization

### Worker and API

`src/worker.js` handles:

- static asset serving and path aliases (`/den`, `/mame-gui`, etc.)
- security/cache headers
- Discord OAuth endpoints (`/api/discord/*`)
- Durable Object backed APIs (`/api/hotspots`, `/api/notes`, `/api/calendar-events`, `/api/room-state/:roomId`, etc.)
- shrimp clip catalog/proxy routes

### Stateful Data Model

The `HotspotStore` Durable Object stores:

- KV-style object/blob state (hotspots, chapel config, arcade URL overrides, score, notes)
- SQLite table data (calendar events, user preferences, room state)

### Frontend

`public/` contains room pages and static assets:

- main den UI: `public/index.html`
- room/app pages: `public/commodore.html`, `public/chapel.html`, `public/noahs-arcade.html`, `public/notes.html`, `public/calendar.html`, `public/mame-gui.html`, etc.
- media: `public/assets/images`, `public/assets/video`, `public/assets/audio`, `public/assets/GIF`

## Cloudflare Infrastructure Snapshot

### Bound in this repository (`wrangler.toml`)

| Service | Binding | Resource |
|---|---|---|
| Assets | `ASSETS` | `public/` directory |
| Durable Objects | `HOTSPOT_STORE` | `HotspotStore` class |
| D1 | `DB` | `naimean-v3-db` (`0798d2f2-618b-4044-91f5-a2c762922184`) |
| R2 | `ASSETS_STORAGE` | `naimean-v3-assets` |

### Account-level storage inventory provided

| Type | Name | ID / Notes |
|---|---|---|
| Workers KV | `naimean-kv` | `dff7175059ce478eab8c910949ca330f` |
| D1 | `naimean-v3-db` | `0798d2f2-618b-4044-91f5-a2c762922184` (bound as `DB`) |
| D1 | `naimean-db` | `0871f90d-f7e3-467a-a1f9-4e74ac8aef42` |
| D1 | `barrelroll-counter-db` | `22277fbe-031d-4ca2-8937-245309e981cd` |
| R2 | `naimean-v3-assets` | bound as `ASSETS_STORAGE` |

## Development

```bash
npm install
npm run build
npm test
```

Optional local worker runtime:

```bash
npx wrangler dev
```

## Deployment

- Deploy automation is in `.github/workflows/deploy.yml`.
- Repository secrets required in GitHub Actions: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
- Runtime secrets should be set in Cloudflare (for example `DISCORD_CLIENT_SECRET`, `SESSION_SECRET`, `GOOGLE_DRIVE_API_KEY`).

## Docs

- [System Overview](docs/System_Overview.md)
- [Configuration and Build](docs/Configuration_and_Build.md)
- [Cloudflare Wiki Index](docs/wiki/README.md)
