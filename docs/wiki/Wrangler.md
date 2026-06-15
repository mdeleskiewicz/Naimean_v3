# Wrangler

## What Wrangler Does Here

Wrangler is the CLI used to validate and deploy this Cloudflare project. The active repo config is in `wrangler.toml`.

## `wrangler.toml` Overview

Current high-value config sections:

```toml
name = "naimeav3"
main = "src/worker.js"
compatibility_date = "2026-06-15"
compatibility_flags = ["nodejs_compat"]

[assets]
directory = "public"
binding = "ASSETS"
run_worker_first = ["/*"]

[[d1_databases]]
binding = "DB"
database_name = "naimean-v3-db"
database_id = "0798d2f2-618b-4044-91f5-a2c762922184"

[[r2_buckets]]
binding = "ASSETS_STORAGE"
bucket_name = "naimean-v3-assets"

[[durable_objects.bindings]]
name = "HOTSPOT_STORE"
class_name = "HotspotStore"
```

## Cloudflare Storage Reference

### Bound resources

| Type | Binding | Resource |
|---|---|---|
| Assets | `ASSETS` | `public/` static files |
| D1 | `DB` | `naimean-v3-db` (`0798d2f2-618b-4044-91f5-a2c762922184`) |
| R2 | `ASSETS_STORAGE` | `naimean-v3-assets` |
| Durable Object | `HOTSPOT_STORE` | `HotspotStore` class |

### Additional account resources provided for Copilot/refactoring context

| Type | Name | ID |
|---|---|---|
| Workers KV | `naimean-kv` | `dff7175059ce478eab8c910949ca330f` |
| D1 | `naimean-db` | `0871f90d-f7e3-467a-a1f9-4e74ac8aef42` |
| D1 | `barrelroll-counter-db` | `22277fbe-031d-4ca2-8937-245309e981cd` |

These extra resources are inventory references only unless/until they are declared as bindings in `wrangler.toml`.

## Vars and Secrets

### Vars in `wrangler.toml` (`[vars]`)

Non-sensitive values such as folder IDs, client IDs, and page sizes.

### Secrets in Cloudflare runtime

Set sensitive values with:

```bash
npx wrangler secret put SECRET_NAME
```

Examples: `DISCORD_CLIENT_SECRET`, `SESSION_SECRET`, `GOOGLE_DRIVE_API_KEY`.

## Common Commands

| Command | Use |
|---|---|
| `npx wrangler dev` | Local development runtime |
| `npx wrangler deploy` | Deploy worker + assets |
| `npx --yes wrangler@latest deploy --dry-run` | Validate config/build without deploying |
| `npx wrangler secret put SECRET_NAME` | Set/update runtime secret |

## CI Note

Deployment workflow is in `.github/workflows/deploy.yml`. Keep any `--config` path used there aligned with the canonical config file in this repository.
