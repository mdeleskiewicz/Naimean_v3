# Durable Objects

## What Is a Durable Object?

A **Durable Object** is a special kind of Cloudflare Worker that has two extra superpowers:

1. **It has persistent storage** — it can save data that survives restarts, deployments, and time.
2. **It is a singleton** — a single named instance runs in one place at a time, so requests to the same instance are always handled by the same in-memory object. This makes it safe to keep state in memory and update a database without race conditions.

Regular Cloudflare Workers are *stateless* — they can't remember anything between requests unless they use an external database. Durable Objects solve this by giving each named instance its own isolated storage and guaranteeing that only one instance with a given name is ever active at once.

Think of a Durable Object as a tiny, always-on, server-side object that you can call like an API endpoint. It's like having a single-threaded server dedicated to a specific piece of data.

---

## How This Project Uses Durable Objects

There is one Durable Object **class** in this project: `HotspotStore`, defined and exported from `src/worker.js`.

```js
export class HotspotStore {
  constructor(state) {
    this.state = state;  // state.storage is the persistent storage API
    this.sqlSchemaReady = false;
  }
  // ...
  async fetch(request) {
    // handles API requests to this Durable Object
  }
}
```

The class has a `fetch` method just like a regular Worker. When the main Worker wants to talk to a Durable Object instance, it gets a **stub** (a reference) and calls `stub.fetch(request)`.

---

## Named Instances

Durable Objects are identified by a **name**. Each unique name corresponds to a single isolated instance with its own storage. This project uses several named instances:

| Instance name | Purpose | Who can write |
|---|---|---|
| `den-hotspots` | Positions of clickable hotspots in the Den room | Anyone (unauthenticated) |
| `chapel-hotspots` | Anchor points and hotspot config for the Chapel room | Anyone |
| `arcade-url-overrides` | Custom game URLs for Noah's Arcade cabinets | Anyone |
| `corner-score` | The persistent high score for the Corner Score game | Anyone |
| `notes-{userId}` | Personal notes for each logged-in user | That user only |
| `calendar-events` | Calendar events shared across users | Authenticated users |
| `user-preferences` | Per-user UI preferences | That user only |
| `room-state` | Shared room state (e.g. Commodore power state) | Configurable |

The naming pattern `notes-{userId}` is clever — it means each user gets their own completely separate Durable Object instance, so their notes are fully isolated.

---

## How the Main Worker Talks to a Durable Object

The main Worker dispatches requests to a Durable Object instance using the `dispatchToHotspotStore` helper:

```js
async function dispatchToHotspotStore(env, request, instanceName) {
  // Get the Durable Object binding from env
  const doBinding = env.HOTSPOT_STORE;

  // Convert the name to a stable ID
  const id = doBinding.idFromName(instanceName);

  // Get a stub (a proxy object you can call fetch on)
  const stub = doBinding.get(id);

  // Forward the request
  return await stub.fetch(request);
}
```

The flow for a request to `/api/hotspots`:

```
Browser → Worker (src/worker.js)
              ↓
  pathname === '/api/hotspots'
              ↓
  dispatchToHotspotStore(env, request, 'den-hotspots')
              ↓
  env.HOTSPOT_STORE.idFromName('den-hotspots')  →  stable ID
              ↓
  env.HOTSPOT_STORE.get(id)  →  stub (network proxy to the DO instance)
              ↓
  stub.fetch(request)  →  HotspotStore.fetch() runs in the DO
              ↓
  Response flows back to the browser
```

---

## The `HOTSPOT_STORE` Binding

The Durable Object class is registered in `wrangler.toml`:

```toml
[[durable_objects.bindings]]
name = "HOTSPOT_STORE"     # name used in env (env.HOTSPOT_STORE)
class_name = "HotspotStore" # exported class in src/worker.js

[[migrations]]
tag = "v1"
new_sqlite_classes = ["HotspotStore"]  # creates with SQLite storage enabled
```

The `migrations` block tells Cloudflare to create the `HotspotStore` instances with **SQLite storage** enabled (the new, recommended storage backend). This is the "v1" migration tag.

---

## API Routes Handled by the Durable Object

The `HotspotStore.fetch()` method routes requests internally by `pathname`:

| Pathname | Method(s) | What it does |
|---|---|---|
| `/api/hotspots` | `GET`, `POST` | Load or save Den room hotspot positions |
| `/api/chapel-hotspots` | `GET`, `POST` | Load or save Chapel anchor points and hotspots |
| `/api/arcade-url-overrides` | `GET`, `POST` | Load or save Noah's Arcade custom URLs |
| `/api/corner-score` | `GET`, `POST` | Read or update the high score |
| `/api/notes` | `GET`, `POST` | Read or save personal notes (per-user instance) |
| `/api/calendar-events` | `GET`, `POST`, `PUT`, `DELETE` | CRUD for calendar events (SQLite table) |
| `/api/user-preferences` | `GET`, `PUT` | Read or update user preferences (SQLite table) |
| `/api/room-state/:roomId` | `GET`, `PUT` | Read or update a room's shared state (SQLite table) |

---

## Key Concepts for Learning

| Term | Plain-English meaning |
|---|---|
| **Durable Object** | A stateful, singleton Worker that persists data between requests |
| **Instance** | A single named copy of a Durable Object, with its own isolated storage |
| **Binding** | The `env.HOTSPOT_STORE` reference that lets the Worker contact the Durable Object |
| **Stub** | A proxy object returned by `doBinding.get(id)` — calling `.fetch()` on it sends a request to the Durable Object instance |
| **`idFromName`** | Converts a human-readable name like `"den-hotspots"` into a stable, globally-unique Durable Object ID |
| **Migration** | A versioned declaration that creates or modifies Durable Object storage on first deployment |

---

## Further Reading

- [Cloudflare Durable Objects — official docs](https://developers.cloudflare.com/durable-objects/)
- [Durable Objects: Use cases](https://developers.cloudflare.com/durable-objects/reference/use-cases/)
- [Accessing Durable Objects from Workers](https://developers.cloudflare.com/durable-objects/get-started/)
