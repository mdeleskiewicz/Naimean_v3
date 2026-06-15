# Wrangler

## What Is Wrangler?

**Wrangler** is Cloudflare's official command-line tool for developing, testing, and deploying Cloudflare Workers (and static assets).

In this project, Wrangler is used to:
- Deploy the Worker and static assets to Cloudflare
- Validate configuration before deploying

Wrangler is listed as a dev dependency in `package.json`:

```json
"devDependencies": {
  "wrangler": "^4.98.0"
}
```

---

## `wrangler.toml` — The Configuration File

The `wrangler.toml` file is the project's Cloudflare configuration source of truth. It tells Wrangler which Worker file to deploy, which static files to serve, what bindings to inject into `env`, and how Durable Objects are registered.

```toml
name = "naimeav3"
main = "src/worker.js"
compatibility_date = "2026-06-15"
compatibility_flags = ["nodejs_compat"]

[assets]
directory = "public"
binding = "ASSETS"
run_worker_first = ["/*"]

[observability]
enabled = true

[vars]
GOOGLE_DRIVE_SHRIMP_FOLDER_ID = "..."
GOOGLE_DRIVE_PAGE_SIZE = "100"
AQUARIUM_LOCAL_CLIP_COUNT = "23"
DISCORD_CLIENT_ID = "..."
DISCORD_GUILD_ID = "..."
DISCORD_ALLOWED_ROLE_IDS = ""

[[d1_databases]]
binding = "DB"
database_name = "naimean-v3-db"
database_id = "..."

[[durable_objects.bindings]]
name = "HOTSPOT_STORE"
class_name = "HotspotStore"

[[migrations]]
tag = "v1"
new_sqlite_classes = ["HotspotStore"]
```

### Key Sections Explained

#### `name`
The identifier for your Worker in Cloudflare's dashboard.

#### `main`
The JavaScript entry point file. Wrangler bundles and uploads this file (and anything it imports) to Cloudflare.

#### `compatibility_date`
Locks the Worker runtime behaviour to a specific date to avoid surprise breakages.

#### `compatibility_flags`
`nodejs_compat` enables Node.js compatibility APIs in the Worker runtime.

#### `assets`
Configures static asset serving from `public/` through the `ASSETS` binding.

#### `observability`
Enables Cloudflare Workers Observability logs/traces in the dashboard.

#### `vars`
Plain-text environment variables injected into the Worker's `env` object. These are visible in the repository and must not contain secrets.

#### `d1_databases`
Configures the `DB` binding. In this project it is used by the optional `/api/db-test` infrastructure diagnostic route.

#### `durable_objects`
Registers `HotspotStore` (exported by `src/worker.js`) with the binding name `HOTSPOT_STORE`.

#### `migrations`
Defines versioned Durable Object storage migrations. `new_sqlite_classes` enables SQLite-backed Durable Object storage.

---

## Common Wrangler Commands

| Command | What it does |
|---|---|
| `npx wrangler deploy --config wrangler.toml` | Deploys the Worker and assets to Cloudflare |
| `npx wrangler deploy --config wrangler.toml --dry-run` | Validates config and builds without deploying |
| `npx wrangler dev --config wrangler.toml` | Starts a local development server |
| `npx wrangler secret put SECRET_NAME` | Uploads an encrypted secret to Cloudflare |
| `npx wrangler tail` | Streams live logs from the deployed Worker |

In CI, the deploy workflow runs:

```bash
npx wrangler deploy --config wrangler.toml --color=always
```

---

## Environment Variables vs Secrets

| Type | Where defined | Visible in repo | When to use |
|---|---|---|---|
| `vars` | `wrangler.toml` | ✅ Yes | Non-sensitive config values |
| Secrets | Cloudflare dashboard / `wrangler secret put` | ❌ No | Sensitive values (API keys, tokens, passwords) |

Both appear in the Worker's `env` object at runtime.

---

## Key Concepts for Learning

| Term | Plain-English meaning |
|---|---|
| **Wrangler** | Cloudflare's CLI for deploying and managing Workers |
| **`wrangler.toml`** | This project's Cloudflare configuration file |
| **`compatibility_date`** | Locks runtime behavior to a known date |
| **`vars`** | Plain-text environment variables defined in config |
| **Secrets** | Encrypted runtime environment variables stored in Cloudflare |
| **`--dry-run`** | Validates and builds without deploying |

---

## Further Reading

- [Wrangler — official docs](https://developers.cloudflare.com/workers/wrangler/)
- [Wrangler configuration reference](https://developers.cloudflare.com/workers/wrangler/configuration/)
- [Managing secrets with Wrangler](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Workers Observability / Logs](https://developers.cloudflare.com/workers/observability/logs/)
