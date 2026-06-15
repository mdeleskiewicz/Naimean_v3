# Configuration and Build

## Prerequisites

- Node.js 18+
- npm
- Cloudflare Wrangler CLI (via `npx wrangler ...` or local dependency)

## Repository Scripts

From `package.json`:

- `npm run build` -> placeholder build check (`No build step`)
- `npm test` -> full Node test suite (`node --test`)

## Local Workflow

```bash
npm install
npm run build
npm test
npx wrangler dev
```

## Cloudflare Config (`wrangler.toml`)

Core runtime wiring in this repository:

- Worker entry: `main = "src/worker.js"`
- Assets binding: `[assets]` with `directory = "public"` and `binding = "ASSETS"`
- Durable Object binding: `HOTSPOT_STORE` -> `HotspotStore`
- D1 binding: `DB` -> `naimean-v3-db` (`0798d2f2-618b-4044-91f5-a2c762922184`)
- R2 binding: `ASSETS_STORAGE` -> `naimean-v3-assets`
- Observability enabled

## Variables vs Secrets

### Variables committed in `wrangler.toml`

- `GOOGLE_DRIVE_SHRIMP_FOLDER_ID`
- `GOOGLE_DRIVE_PAGE_SIZE`
- `AQUARIUM_LOCAL_CLIP_COUNT`
- `DISCORD_CLIENT_ID`
- `DISCORD_GUILD_ID`
- `DISCORD_ALLOWED_ROLE_IDS`

### Runtime secrets (set in Cloudflare, not in repo)

- `DISCORD_CLIENT_SECRET`
- `SESSION_SECRET`
- `GOOGLE_DRIVE_API_KEY`
- optional runtime flags/secrets used by the worker auth/config paths

## Storage Inventory Reference

| Type | Name | ID / Notes |
|---|---|---|
| Workers KV | `naimean-kv` | `dff7175059ce478eab8c910949ca330f` |
| D1 | `naimean-v3-db` | `0798d2f2-618b-4044-91f5-a2c762922184` (bound as `DB`) |
| D1 | `naimean-db` | `0871f90d-f7e3-467a-a1f9-4e74ac8aef42` |
| D1 | `barrelroll-counter-db` | `22277fbe-031d-4ca2-8937-245309e981cd` |
| R2 | `naimean-v3-assets` | bound as `ASSETS_STORAGE` |

## Deploy Validation

Dry-run config validation:

```bash
npx --yes wrangler@latest deploy --dry-run
```

CI deployment automation is defined in `.github/workflows/deploy.yml`.
