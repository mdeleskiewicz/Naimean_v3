# Durable Object Storage

## Overview

A Durable Object has its own built-in storage — no external database is needed. This project uses the `HotspotStore` Durable Object with **two different storage modes** side-by-side, depending on what is being stored.

| Storage mode | Used for | API |
|---|---|---|
| **Key-Value storage** | Hotspots, chapel config, arcade URLs, corner score, notes | `this.state.storage.get()` / `.put()` |
| **SQLite storage** | Calendar events, user preferences, room state | `this.state.storage.sql.exec()` |

Both live inside the same `HotspotStore` class, accessed through `this.state.storage`.

---

## Key-Value (KV) Storage

### What It Is

KV storage inside a Durable Object is a simple key-value store — you save a value under a string key, and later read it back. Values can be any JavaScript-serializable type (objects, arrays, strings, numbers).

### How It's Used Here

The KV storage is used for data that fits naturally as a single JSON blob per "topic":

```js
// Reading hotspots from storage
const saved = await this.state.storage.get('hotspots');
// saved is the full hotspots array (or undefined if nothing was saved yet)

// Saving hotspots to storage
await this.state.storage.put('hotspots', sanitizedHotspotsArray);
```

| Storage key | What is stored |
|---|---|
| `'hotspots'` | Array of Den room hotspot positions `[{ id, x, y, w, h }, ...]` |
| `'chapel-hotspots'` | Chapel anchor points + hotspot config object |
| `'arcade-url-overrides'` | Object of `{ cabinetName: url }` overrides for Noah's Arcade |
| `'corner-score'` | Object `{ score: number, initials: string }` for the high score |
| `'notes'` | Notes state object `{ notes: [...], viewMode, version }` |

### Why KV Here?

These are all self-contained blobs that are always read and written in full. KV is simple and efficient for this pattern. There's no need for querying, filtering, or joining.

---

## SQLite Storage

### What It Is

SQLite is a full relational database — you define tables with columns, and query them with SQL (`SELECT`, `INSERT`, `UPDATE`, `DELETE`). Cloudflare now embeds a SQLite database directly inside each Durable Object instance, accessed via `this.state.storage.sql`.

This is a newer and more powerful option than KV storage. It supports proper relational data, filtering by user, ordering, and partial updates.

### How It's Used Here

The `HotspotStore` includes a migration system that creates tables automatically on first use:

```js
const HOTSPOT_SQL_MIGRATIONS = [
  { version: 1, statements: [] },
  {
    version: 2,
    statements: [
      `CREATE TABLE IF NOT EXISTS calendar_events (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        title TEXT,
        start_at TEXT,
        end_at TEXT,
        data TEXT,
        updated_at TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS user_preferences (
        user_id TEXT,
        key TEXT,
        value TEXT,
        updated_at TEXT,
        UNIQUE(user_id, key)
      )`,
      `CREATE TABLE IF NOT EXISTS room_state (
        room_id TEXT,
        key TEXT,
        value TEXT,
        updated_at TEXT,
        PRIMARY KEY(room_id, key)
      )`
    ]
  }
];
```

The migration system tracks the current schema version with `PRAGMA user_version` and only runs new migrations, so tables aren't re-created on every request.

### Tables

#### `calendar_events`

Stores calendar events for authenticated users.

| Column | Type | Description |
|---|---|---|
| `id` | TEXT (PK) | Unique event ID (UUID or client-provided) |
| `user_id` | TEXT | The Discord user ID of the owner |
| `title` | TEXT | Event title |
| `start_at` | TEXT | Start time (ISO 8601 string) |
| `end_at` | TEXT | End time (ISO 8601 string) |
| `data` | TEXT | Additional JSON data (serialized) |
| `updated_at` | TEXT | Last-modified timestamp |

#### `user_preferences`

Stores arbitrary per-user key-value preferences (e.g. UI settings).

| Column | Type | Description |
|---|---|---|
| `user_id` | TEXT | The Discord user ID |
| `key` | TEXT | Preference name (e.g. `"theme"`) |
| `value` | TEXT | Preference value (serialized JSON or plain string) |
| `updated_at` | TEXT | Last-modified timestamp |
| UNIQUE constraint | `(user_id, key)` | Each user has at most one value per key |

Upsert pattern used: `INSERT ... ON CONFLICT DO UPDATE SET ...` — this creates or overwrites in one statement.

#### `room_state`

Stores per-room shared state. For example, the Commodore room tracks whether the power is on or off.

| Column | Type | Description |
|---|---|---|
| `room_id` | TEXT | Room name (e.g. `"commodore"`) |
| `key` | TEXT | State key (e.g. `"powerState"`) |
| `value` | TEXT | State value (serialized JSON) |
| `updated_at` | TEXT | Last-modified timestamp |
| PRIMARY KEY | `(room_id, key)` | Each room has at most one value per key |

### SQL API

Queries are run with `this.state.storage.sql.exec(sql, ...params)`:

```js
// SELECT example
const rows = this.ensureSqlCursorRows(
  sql.exec(
    'SELECT id, title FROM calendar_events WHERE user_id = ? ORDER BY updated_at DESC',
    userId
  )
);

// INSERT example
sql.exec(
  'INSERT INTO calendar_events (id, user_id, title, ...) VALUES (?, ?, ?, ...)',
  id, userId, title, ...
);
```

The `?` placeholders are positional parameters — they prevent SQL injection by keeping data separate from the query string.

---

## Storage Architecture Summary

```
HotspotStore (Durable Object)
├── state.storage (KV store)
│   ├── 'hotspots'            → Den room hotspot array
│   ├── 'chapel-hotspots'     → Chapel config object
│   ├── 'arcade-url-overrides'→ Arcade URL object
│   ├── 'corner-score'        → { score, initials }
│   └── 'notes'               → Notes state blob
│
└── state.storage.sql (SQLite)
    ├── calendar_events       → Rows per user
    ├── user_preferences      → Rows per user, per key
    └── room_state            → Rows per room, per key
```

The `calendar_events`, `user_preferences`, and `room_state` tables all live in the **`room-state`** named instance of the Durable Object (see [Durable Objects](Durable-Objects.md) for the full list of instances).

---

## Key Concepts for Learning

| Term | Plain-English meaning |
|---|---|
| **KV storage** | A simple dictionary: save and retrieve one value by name |
| **SQLite** | A relational database embedded in the Durable Object; supports tables and SQL queries |
| **`state.storage.get(key)`** | Read a value from KV storage |
| **`state.storage.put(key, value)`** | Write a value to KV storage |
| **`state.storage.sql.exec(sql, ...params)`** | Run a SQL query against the embedded SQLite database |
| **Migration** | A versioned script that creates or alters database tables, run once on first use |
| **`PRAGMA user_version`** | A SQLite mechanism to track which migration version has been applied |
| **Upsert** | `INSERT ... ON CONFLICT DO UPDATE` — insert if the row doesn't exist, update if it does |

---

## Further Reading

- [Durable Objects: Storage API](https://developers.cloudflare.com/durable-objects/api/storage-api/)
- [Durable Objects: SQLite storage](https://developers.cloudflare.com/durable-objects/best-practices/access-durable-objects-storage/#sqlite-storage-backend)
