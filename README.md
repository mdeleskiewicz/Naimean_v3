# Naimean_v3

Naimean_v3 is a retro, room-based interactive site built around a virtual den and deployed on Cloudflare Workers. The repository combines static HTML/CSS/JS pages in `public/` with a Worker in `src/worker.js` that handles routing, auth, persistence, and media APIs.

## What the site is

The site is a collection of themed spaces and utilities:

- **Den (`/`)** — main interactive side-scrolling room with hotspots, overlays, debug editing tools, Discord embeds, screens, audio/video behavior, and links into the rest of the site
- **Noah's Arcade (`/noahs-arcade.html`)** — arcade cabinet launcher with configurable cabinet destinations
- **Chapel (`/chapel.html`)** — interactive soundboard / hotspot-driven scene with persistent hotspot config
- **Commodore (`/commodore.html`)** — Commodore-themed interactive screen with power-state transitions and debug layout controls
- **Antechamber (`/antechamber.html`)** — themed transition / room page
- **Calendar (`/calendar.html`)** — calendar UI with event creation, recurrence, schedule/day/week/month views, search, print, and ICS export/subscription helpers
- **Notes (`/notes.html`)** — retro notes board with tags, pinning, completion state, list/grid modes, and authenticated server sync
- **Recombobulator (`/recombobulator.html`)** — themed media utility for audio/video volume adjustment workflows
- **MAME GUI (`/mame-gui.html`)** — editor for arcade cabinet URL overrides
- **Commodore state pages (`/commodore_on.html`, `/commodore_off.html`)** — visual state variants

## Core architecture

- **Frontend:** vanilla HTML, CSS, and inline JavaScript under `/public`
- **Backend/runtime:** Cloudflare Worker in `/src/worker.js`
- **Static hosting:** Cloudflare assets binding from `/public`
- **Persistence:** Cloudflare Durable Object `HOTSPOT_STORE`
- **Auth:** Discord OAuth with signed session cookies
- **Media integration:** optional Google Drive-backed aquarium clip catalog with local fallback

## GitHub ↔ Cloudflare responsibility split

### GitHub side

GitHub holds:

- the source of truth for site pages, Worker code, tests, and Wrangler config
- implementation history and PR trail
- branch/PR workflows for code review and iteration

### Cloudflare side

Cloudflare provides:

- Worker runtime (`src/worker.js`)
- static asset hosting from `public/`
- Worker-first routing for the whole site
- Durable Object persistence via `HOTSPOT_STORE`
- SQLite-backed storage in the Durable Object
- runtime secrets and environment variables (Discord + Google Drive)

In practice: GitHub is where behavior is defined and reviewed; Cloudflare is where behavior executes and state persists.

## Cloudflare setup

`/wrangler.jsonc` defines:

- Worker entrypoint: `src/worker.js`
- Assets directory: `public`
- Worker-first routing on all asset paths (`run_worker_first: ["/*"]`)
- Durable Object binding: `HOTSPOT_STORE`
- SQLite-backed Durable Object migration `v1`

## Backend functionality

The Worker provides:

- **Static asset serving and route aliases**
  - `/` serves the main den page
  - `/den` and `/den.html` alias to the main den asset
  - `/mame_gui`, `/mame_gui.html`, and `/mame-gui` alias to `/mame-gui.html`
- **Security/caching headers**
  - `no-store` on HTML
  - long-lived immutable caching on versioned `.png` and `.mp4` assets
- **Discord auth endpoints**
  - `/api/discord/auth`
  - `/api/discord/callback`
  - `/api/discord/me`
  - `/api/discord/logout`
- **Durable Object-backed persistence endpoints**
  - `/api/hotspots`
  - `/api/chapel-hotspots`
  - `/api/arcade-url-overrides`
  - `/api/corner-score`
  - `/api/notes`
- **Aquarium media endpoints**
  - `/api/aquarium/shrimp-clips`
  - `/api/aquarium/shrimp-clip/:id`
- **Health check**
  - `/api/health`

## Persistence status

### Already server-side

- Den hotspot layout (`/api/hotspots`)
- Chapel hotspot configuration (`/api/chapel-hotspots`)
- Arcade URL overrides (`/api/arcade-url-overrides`)
- Corner high score + initials (`/api/corner-score`)
- Authenticated per-user notes (`/api/notes`)

### Still local or hybrid

- Calendar events and preferences (`public/api-client.js`, `public/calendar.html`)
- Commodore debug layout
- Commodore power/navigation state (`sessionStorage`)
- Calendar label visibility/rename/color preferences
- Arcade URL overrides fallback cache when server read fails
- Notes local-first pending sync behavior

## Strategy to remove “pretend saving”

1. Treat the Worker API as source of truth for any cross-session/device state.
2. Add missing server APIs for local-only features (calendar, Commodore layout, user preferences).
3. Replace silent local fallback with explicit offline/unsynced states.
4. Protect mutable shared state with auth and role checks where appropriate.
5. Keep Durable Objects for serialized object/state writes; use D1 when relational querying is needed; use R2 only for large binary files.

## Repository layout

- `/public` — site pages and static assets
- `/src/worker.js` — Worker runtime, routing, auth, and persistence
- `/test` — Node tests for Worker behavior and related contracts
- `/wrangler.jsonc` — Cloudflare deployment config
- `/package.json` — minimal scripts for build/test

## Local development and verification

- `npm run build` — placeholder build script (`No build step required`)
- `npm test` — runs the Node test suite

Current tests cover Worker routing, Durable Object behavior, Discord auth flows, aquarium endpoints, asset caching rules, and persistence behavior.
