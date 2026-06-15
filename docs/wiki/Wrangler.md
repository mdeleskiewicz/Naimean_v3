# Wrangler

## What Is Wrangler?

**Wrangler** is Cloudflare's official command-line tool for developing, testing, and deploying Cloudflare Workers (and Pages). It is the equivalent of tools like the AWS CLI or the Firebase CLI — it bridges your local code and Cloudflare's cloud infrastructure.

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

## `wrangler.jsonc` — The Configuration File

The `wrangler.jsonc` file is the project's Cloudflare configuration. It tells Wrangler (and Cloudflare) everything it needs to know about the deployment: which Worker file to use, what static files to serve, what services the Worker can access, and what environment variables to inject.

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",

  // The name of your Worker in Cloudflare's dashboard
  "name": "naimeav3",

  // The main Worker entry point file
  "main": "src/worker.js",

  // Locks the runtime API version for stability
  "compatibility_date": "2026-05-18",

  // Enables some Node.js APIs inside the Worker
  "compatibility_flags": ["nodejs_compat"],

  // Static file hosting configuration
  "assets": {
    "directory": "public",        // Local folder to deploy
    "binding": "ASSETS",          // Name in env (env.ASSETS)
    "run_worker_first": ["/*"]    // Run Worker before serving any file
  },

  // Enables Cloudflare's built-in logging and tracing
  "observability": {
    "enabled": true
  },

  // Environment variables injected into env
  "vars": {
    "GOOGLE_DRIVE_SHRIMP_FOLDER_ID": "...",
    "GOOGLE_DRIVE_PAGE_SIZE": "100",
    "AQUARIUM_LOCAL_CLIP_COUNT": "23",
    "DISCORD_CLIENT_ID": "...",
    "DISCORD_GUILD_ID": "REQUIRED_SET_DISCORD_GUILD_ID",
    "DISCORD_ALLOWED_ROLE_IDS": "..."
  },

  // Durable Object class registration
  "durable_objects": {
    "bindings": [
      {
        "name": "HOTSPOT_STORE",
        "class_name": "HotspotStore"
      }
    ]
  },

  // Schema migrations for Durable Object storage
  "migrations": [
    {
      "tag": "v1",
      "new_sqlite_classes": ["HotspotStore"]
    }
  ]
}
```

### Key Sections Explained

#### `name`
The identifier for your Worker in Cloudflare's dashboard. The deployed Worker will be reachable at `https://naimeav3.<your-subdomain>.workers.dev` by default (though in this project it uses a custom domain).

#### `main`
The JavaScript entry point file. Wrangler bundles and uploads this file (and anything it imports) to Cloudflare.

#### `compatibility_date`
Cloudflare occasionally changes how Workers behave. Setting a `compatibility_date` means your Worker always uses the runtime behaviour from that date, even as Cloudflare evolves. This prevents surprise breakages from Cloudflare's changes.

#### `compatibility_flags`
Feature flags for the runtime. `nodejs_compat` enables Node.js compatibility APIs (e.g. some `crypto` and `Buffer` behaviour) inside the Worker.

#### `assets`
See [Cloudflare Pages and Assets](Cloudflare-Pages-and-Assets.md) for a full explanation.

#### `observability`
Enables Cloudflare's built-in **Workers Observability** — logs and traces from your Worker are automatically collected and viewable in the Cloudflare dashboard under "Workers & Pages → your worker → Logs". This is how you debug a live deployment.

#### `vars`
Plain-text environment variables that are injected into the Worker's `env` object. These are visible to anyone who can read `wrangler.jsonc`, so they should not contain secrets.

**Secrets** (like `DISCORD_CLIENT_SECRET`, `SESSION_SECRET`, `GOOGLE_DRIVE_API_KEY`) are stored separately using Cloudflare's encrypted secrets system and set via the Cloudflare dashboard or `wrangler secret put`. They appear in `env` just like vars, but are never stored in the repository.

#### `durable_objects`
Registers the `HotspotStore` class (exported from `src/worker.js`) as a Durable Object and gives it the binding name `HOTSPOT_STORE`. See [Durable Objects](Durable-Objects.md).

#### `migrations`
A versioned list of changes to Durable Object storage. The `v1` migration uses `new_sqlite_classes` to tell Cloudflare that `HotspotStore` should be created with SQLite storage enabled. This migration only runs once, on the first deployment that includes it.

---

## The `wrangler.toml` File

There is also a `wrangler.toml` file in the repo root. It contains the same core settings (name, main, assets, durable objects) in TOML format instead of JSON. Wrangler supports both formats. The `.jsonc` file is the authoritative one used for deployment (specified explicitly in the GitHub Actions deploy workflow with `--config wrangler.jsonc`).

---

## Common Wrangler Commands

| Command | What it does |
|---|---|
| `npx wrangler deploy` | Deploys the Worker and assets to Cloudflare |
| `npx wrangler deploy --dry-run` | Validates the config and builds the Worker *without* actually deploying |
| `npx wrangler dev` | Starts a local development server that emulates the Cloudflare runtime |
| `npx wrangler secret put SECRET_NAME` | Uploads an encrypted secret to Cloudflare |
| `npx wrangler tail` | Streams live logs from your deployed Worker |
| `npx wrangler d1 execute ...` | Run SQL against a D1 database (not used in this project) |

In this project, the deploy command used in CI is:

```bash
npx wrangler deploy --config wrangler.jsonc --color=always
```

---

## Environment Variables vs Secrets

| Type | Where defined | Visible in repo | When to use |
|---|---|---|---|
| `vars` | `wrangler.jsonc` | ✅ Yes | Non-sensitive config (folder IDs, counts, client IDs) |
| Secrets | Cloudflare dashboard / `wrangler secret put` | ❌ No | Sensitive values (API keys, tokens, passwords) |

Both appear in the Worker's `env` object at runtime — the Worker code cannot tell the difference. Only the storage location differs.

---

## Key Concepts for Learning

| Term | Plain-English meaning |
|---|---|
| **Wrangler** | Cloudflare's CLI — used to deploy, develop, and manage Workers |
| **`wrangler.jsonc`** | The project's Cloudflare configuration file |
| **`compatibility_date`** | Locks the Workers runtime version for your project |
| **`vars`** | Plain-text environment variables defined in config |
| **Secrets** | Encrypted environment variables stored securely in Cloudflare, not in the repo |
| **`--dry-run`** | A Wrangler flag that validates and builds without deploying |
| **Observability** | Cloudflare's built-in logging and tracing for live Workers |

---

## Further Reading

- [Wrangler — official docs](https://developers.cloudflare.com/workers/wrangler/)
- [Wrangler configuration reference](https://developers.cloudflare.com/workers/wrangler/configuration/)
- [Managing secrets with Wrangler](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Workers Observability / Logs](https://developers.cloudflare.com/workers/observability/logs/)
