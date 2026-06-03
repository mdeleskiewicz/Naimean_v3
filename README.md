# Naimean_v3

Naimean_v3 is a retro, room-based interactive site built around a virtual den and deployed on Cloudflare Workers. The repo combines static HTML/CSS/JS pages in `public/` with a Worker in `src/worker.js` that handles routing, auth, persistence, and media APIs.

## What the site is

The site is a collection of themed spaces and utilities:

- **Den (`/`)** — the main interactive side-scrolling room with hotspots, overlays, debug editing tools, Discord embeds, screens, audio/video behavior, and links into the rest of the site
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

## Cloudflare setup

`/wrangler.jsonc` defines the deployed shape of the app:

- Worker entrypoint: `src/worker.js`
- Assets directory: `public`
- Worker-first routing on all asset paths via `run_worker_first: ["/*"]`
- Durable Object binding: `HOTSPOT_STORE`
- SQLite-backed Durable Object migration `v1`

That means all routes, including extensionless pages and API endpoints, can be mediated by the Worker before assets are served.

## Backend functionality

The Worker currently provides:

- **Static asset serving and route aliases**
  - `/` serves the main den page
  - `/den` and `/den.html` are aliased to the main den asset
  - `/mame_gui`, `/mame_gui.html`, and `/mame-gui` are aliased to `/mame-gui.html`
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

## Persistent functionality already implemented

The repo is not purely static. Several features already save server-side:

- **Den hotspot layout** is stored in Durable Objects via `/api/hotspots`
- **Chapel hotspot configuration** is stored in Durable Objects via `/api/chapel-hotspots`
- **Arcade URL overrides** are stored in Durable Objects via `/api/arcade-url-overrides`
- **Corner high score and initials** are stored in Durable Objects via `/api/corner-score`
- **Authenticated per-user notes** are stored in per-user Durable Object instances via `/api/notes`

## Where the site still relies on browser storage

Several features still use `localStorage` or `sessionStorage` on the client:

- **Calendar events and calendar preferences** are local-only through `public/api-client.js` and `public/calendar.html`
- **Arcade URL overrides** use local storage as a fallback cache if server reads fail
- **Notes** are written locally first and then scheduled for server save when the user is authenticated
- **Commodore debug layout** is stored locally
- **Commodore power/navigation state** uses `sessionStorage`
- **Calendar label visibility / rename / color naming preferences** are local-only

## Commit history scan summary

The full V3 history in this clone contains **1,297 commits** from **2026-05-05 through 2026-06-02**. The major phases are:

1. **Initial import and asset migration**
   - V2 assets copied into V3
   - early den art and video composition work
2. **Den experience build-out**
   - fixed-coordinate den scene
   - mobile handling, parallax, hotspot tuning, accessibility, debug controls
3. **Cloudflare migration**
   - Wrangler config added
   - routing moved to a single Worker entrypoint
   - asset binding and worker-first routing hardened
4. **Persistence work**
   - hotspot saving
   - chapel config persistence
   - arcade URL override persistence
   - corner score persistence with initials
   - authenticated notes persistence
5. **Feature expansion and polish**
   - Discord auth
   - aquarium clip integration
   - overlay/screen behavior
   - ongoing UI tuning and test coverage improvements

The history is heavily PR-driven and shows repeated iteration on interactive UI details, Cloudflare deployment shape, and moving key features from front-end-only behavior toward Worker-backed persistence.

## Repository layout

- `/public` — site pages and static assets
- `/src/worker.js` — Worker runtime, routing, auth, and persistence
- `/test` — Node test suite covering Worker behavior and some page-specific expectations
- `/wrangler.jsonc` — Cloudflare deployment config
- `/package.json` — minimal scripts for build/test

## Local development and verification

- `npm run build` — placeholder build script (`No build step required`)
- `npm test` — runs the Node test suite

Current tests cover Worker routing, Durable Object behavior, Discord auth flows, aquarium endpoints, asset caching rules, and related persistence behavior.
