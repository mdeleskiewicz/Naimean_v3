# Cloudflare Workers

## What Is a Cloudflare Worker?

A **Cloudflare Worker** is a piece of server-side JavaScript (or TypeScript) code that runs at the edge — meaning it executes on Cloudflare's network, which has data centres in hundreds of cities around the world. When a visitor loads your site, their request is handled by the nearest Cloudflare data centre rather than a single origin server far away.

Think of it like this: instead of your web server living in one place (e.g. a computer in New York), your code is copied to every city Cloudflare operates in and runs wherever the visitor happens to be. This means low latency for everyone, no server to maintain, and automatic global scaling.

Workers use the **Web Platform APIs** — the same `fetch`, `Request`, `Response`, `Headers`, `URL`, and `crypto` objects you may already know from browser JavaScript — so the code feels familiar.

---

## How This Project Uses Workers

The file **`src/worker.js`** is the single Cloudflare Worker for the entire Naimean V3 site.

Every HTTP request that arrives at the site passes through this file first. The worker decides what to do with it:

| Request type | What the worker does |
|---|---|
| Static binary files (`.mp4`, `.png`, `.gif`, `.css`, etc.) | Bypasses all logic and hands directly to the Asset binding (see [Cloudflare Pages and Assets](Cloudflare-Pages-and-Assets.md)) |
| `/api/discord/auth` `/api/discord/callback` `/api/discord/me` `/api/discord/logout` | Handles Discord OAuth login/logout and session management |
| `/api/hotspots` `/api/chapel-hotspots` `/api/arcade-url-overrides` `/api/corner-score` | Forwards to the **HotspotStore Durable Object** (see [Durable Objects](Durable-Objects.md)) |
| `/api/notes` `/api/calendar-events` `/api/user-preferences` | Forwards to per-user Durable Object instances (requires login) |
| `/api/room-state/:roomId` | Forwards to the `room-state` Durable Object instance |
| `/api/aquarium/shrimp-clips` `/api/aquarium/shrimp-clip/:id` | Proxies to Google Drive or returns local shrimp video catalogue |
| `/api/health` | Returns a JSON health check |
| All other HTML paths (`/`, `/notes`, `/commodore.html`, etc.) | Serves static HTML from the Assets binding, with auth-gating for protected pages |

### The `fetch` Export

The worker's entry point is the `fetch` export at the bottom of `src/worker.js`:

```js
export default {
  async fetch(request, env) {
    // ...routing logic...
  }
};
```

Cloudflare calls this function for every incoming HTTP request. The `request` object is a standard web `Request`. The `env` object contains all the **bindings** — references to other Cloudflare services the worker is allowed to talk to (the Assets binding, the Durable Object binding, secret variables, etc.).

### The `HotspotStore` Export

The same file also exports the `HotspotStore` **class**, which is a Durable Object (explained in its own page):

```js
export class HotspotStore { ... }
```

Workers can export multiple things: the default `fetch` handler *and* any Durable Object classes.

---

## Key Concepts for Learning

| Term | Plain-English meaning |
|---|---|
| **Edge computing** | Running code close to the user instead of in one centralised server |
| **Worker** | The JavaScript file that handles requests (`src/worker.js`) |
| **Binding** | A named reference in `env` that lets the worker talk to another Cloudflare service |
| **`env`** | The second argument to `fetch(request, env)` — holds all bindings and environment variables |
| **`compatibility_date`** | Tells Cloudflare which version of the Workers runtime to use; set to `2026-06-15` in this project |
| **`nodejs_compat`** | A compatibility flag that allows some Node.js built-in APIs (like `Buffer`, `crypto`) to work inside the Worker |

---

## Where to Look in This Repo

- **`src/worker.js`** — the entire worker: routing, session management, API handlers, and the HotspotStore class
- **`wrangler.toml`** — tells Cloudflare which file is the worker (`main = "src/worker.js"`), what bindings it has, and what environment variables to inject
- **`test/worker.test.js`** — unit tests for the worker's routing and API behaviour

## Runtime Binding Snapshot

From `wrangler.toml`, this worker currently has:

- `ASSETS` (static assets from `public/`)
- `HOTSPOT_STORE` (Durable Object class `HotspotStore`)
- `DB` (D1 database `naimean-v3-db`, id `0798d2f2-618b-4044-91f5-a2c762922184`)
- `ASSETS_STORAGE` (R2 bucket `naimean-v3-assets`)

---

## Further Reading

- [Cloudflare Workers — official docs](https://developers.cloudflare.com/workers/)
- [Workers Runtime APIs](https://developers.cloudflare.com/workers/runtime-apis/)
