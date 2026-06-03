# Gemini Architectural Review & Roadmap — Naimean_v3

## Part 1: Codebase Overview & UX Improvement Roadmap

### System Configuration
Naimean_v3 is a retro, room-based interactive site built around a virtual den and deployed on Cloudflare Workers. The repository combines static HTML/CSS/JS pages in `public/` with a Worker in `src/worker.js` that handles routing, auth, persistence, and media APIs.

### Core Architecture
* **Frontend:** vanilla HTML, CSS, and inline JavaScript under `/public`
* **Backend/runtime:** Cloudflare Worker in `/src/worker.js`
* **Static hosting:** Cloudflare assets binding from `/public`
* **Persistence:** Cloudflare Durable Object `HOTSPOT_STORE` (with SQLite-backed storage)
* **Auth:** Discord OAuth with signed session cookies
* **Routing:** Worker-first routing on all asset paths (`run_worker_first: ["/*"]` via `wrangler.jsonc`)

### UX & Workflow Improvement Plan (Top 10)
1. Server-first calendar persistence
2. Visible sync status for all saved data
3. Offline queue + retry UX
4. Unified in-app navigation layer
5. Onboarding and contextual guidance
6. Mobile-first interaction pass
7. Accessibility hardening
8. Global settings panel
9. Performance budgeting and asset optimization
10. Workflow simplification for content/admin updates

---

## Part 2: Architectural & UX Assessment

### 1. The Threat of "Split-Brain" State in Hybrid Features

Items **1 (Server-first calendar)**, **2 (Sync status)**, and **3 (Offline queue)** in the plan are highly interdependent. Currently, features like the Calendar use local state, while notes have an authenticated server sync. Because the Durable Object runs a single-threaded SQLite instance per storage entity, introducing transactional, rapidly changing event arrays can cause lock-contention or massive serialized object writes if everything is stored as a single monolithic JSON blob.

**The Risk:** If a user modifies a calendar event offline while another updates it on a desktop, merging two large JSON strings in a Durable Object without row-level atomic edits will result in the last write winning, erasing data.

**Recommendation:** Since migrations are already enabled, do not store calendar events as serialized JSON fields. Leverage the Durable Object's relational SQLite capabilities. Create explicit tables for `calendar_events` and `user_preferences` with structural `updated_at` columns. This allows clean row-level updates, making the planned **Offline Queue + Retry UX** significantly easier to implement via standard timestamp checking.

---

### 2. Assets Caching vs. Worker-First Friction

The `wrangler.jsonc` uses `run_worker_first: ["/*"]`. This means *every single static asset request* passes through the `src/worker.js` routing logic before falling back to Cloudflare Assets.

**The Flaw:** For heavy binary assets like `.mp4` aquarium clips or `.wav` soundboard files, passing through the worker engine adds unnecessary CPU execution time and edge latency if the custom header injection logic isn't aggressively optimized.

**Recommendation:** Ensure that `src/worker.js` intercepts image/video/audio extensions immediately at the top of the `fetch` handler and returns a bare asset bind response, bypassing session checking, cookie parsing, or routing tables. The plan for **Performance Budgeting (Item 9)** will fail if the Worker execution overhead bottlenecks streaming assets on mobile pipes.

---

### 3. The Auth Security Loophole on Static Assets

The plan mentions **Onboarding & Guidance (Item 5)** and **Workflow Simplification (Item 10)** for admin updates. Right now, HTML files live under `/public` and are served based on aliases.

**The Leak:** If an unauthenticated user guesses the URL path `/mame-gui.html` or `/notes.html`, the worker-first router may protect the `/api/notes` data endpoint, but it still serves the entire structural frontend client shell, script tags, and DOM elements to the open web. This leaks application structure and client-side logic.

**Recommendation:** Implement an inline middleware check in `src/worker.js` for paths ending in `.html` or matching system pages. If a user requests a protected room layout (like `/mame-gui` or `/notes`) and lacks a valid signed Discord session cookie, issue a `302 Redirect` to `/api/discord/auth` *before* letting Cloudflare serve the static asset from the `public` binding.

---

### Technical Recommendations Matrix

| Focus Area | Current Implementation Pattern | Recommended Target Pattern | Why it Matters |
| :--- | :--- | :--- | :--- |
| **Data Persistence** | Serialized JSON blobs stored inside `HOTSPOT_STORE` variables. | Structured relational tables via the Durable Object's internal SQLite. | Prevents data corruption during offline-to-online sync merges. |
| **Routing Efficiency** | All assets process through full Worker routing layers. | Early-exit routing rule for extensions (`.mp4`, `.png`, `.wav`) at the top of `worker.js`. | Lowers edge computing costs and prevents audio/video asset clipping on high-latency mobile devices. |
| **Asset Delivery** | High-fidelity static loops inside `/public/assets`. | Implement HTTP Range requests in the worker for `.mp4` background layers. | Crucial for **Mobile-first interaction (Item 6)**; without range requests, iOS Safari refuses to play inline looping background video layers. |
| **State Hydration** | `sessionStorage` tracking for Commodore power states. | Hybridized `localStorage` synced via a minor `/api/preferences` object. | Unifies **Global Settings Panel (Item 8)** so retro states persist across browser tabs. |

---

## Part 3: Priority Tasks

### Task 1: SQLite Schema Migration
Prepare a SQL migration script for the Durable Object to house calendar events, user preferences, and room state data relationally. Ensure columns include tracking fields for `updated_at` and `user_id` to enable robust background synchronization merging.

**Target schema (conceptual):**
```sql
CREATE TABLE IF NOT EXISTS calendar_events (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  title       TEXT NOT NULL,
  start_at    TEXT NOT NULL,
  end_at      TEXT,
  data        TEXT,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id     TEXT PRIMARY KEY,
  key         TEXT NOT NULL,
  value       TEXT,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, key)
);

CREATE TABLE IF NOT EXISTS room_state (
  room_id     TEXT NOT NULL,
  key         TEXT NOT NULL,
  value       TEXT,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (room_id, key)
);
```

---

### Task 2: Worker Routing & Security Enforcement
Refactor `src/worker.js` to implement:
1. An **early-exit bypass** at the very top of the `fetch` handler for static binary extensions (`.mp4`, `.png`, `.jpg`, `.gif`, `.wav`, `.mp3`, `.webp`, `.svg`, `.ico`, `.woff2`) — skip session parsing entirely and pass directly to `env.ASSETS.fetch(request)`.
2. An **authentication middleware interceptor** that checks for the signed session cookie on incoming requests for protected pages (`/mame-gui`, `/notes`, `/calendar`, `/noahs-arcade`), redirecting to `/api/discord/auth` upon failure before the asset binding resolves the HTML file.

---

### Task 3: HTTP Range Request Support for Media
Ensure the Worker correctly forwards `Range` headers on `.mp4` asset requests so that iOS Safari can play inline looping video layers. Without range request passthrough, mobile browsers that issue a `Range: bytes=0-` preflight will receive a `200` instead of `206`, causing playback failures.

---

## Execution Order

1. **Task 1** (SQLite Migration) — foundational; unblocks calendar server-persistence and offline sync without risking data loss.
2. **Task 2** (Worker Routing + Auth Shield) — security and performance win; protects layout shells and reduces edge CPU overhead.
3. **Task 3** (Range Requests) — mobile UX fix; required for reliable video playback on iOS Safari.
