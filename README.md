# Naimean_v3

Naimean_v3 is a retro, room-based interactive site (naimean.com) built around a virtual den, deployed on Cloudflare Workers. The repository combines static HTML/CSS/JS pages in `public/` with a Worker in `src/worker.js` that handles routing, auth, persistence, and media APIs.

## V2 Heritage & Evolution
Naimean V3 is the evolution of the archived V2 system. For a deep dive into the architectural changes, functional porting, and build configurations, please refer to the following documentation:
- [NAIMEAN_V2_ARCHIVE.md](./NAIMEAN_V2_ARCHIVE.md) - Technical specifications of the V2 codebase.
- [SYSTEM_OVERVIEW.md](./SYSTEM_OVERVIEW.md) - Detailed evolution from V2 to V3.
- [BUILD_CONFIG.md](./BUILD_CONFIG.md) - Reconciled build and environment configurations.

## Site pages

| Page | URL | Description |
|---|---|---|
| **Den** | `/` | Main interactive side-scrolling room — hotspots, overlays, debug editing, Discord embeds, dual monitors, DVD screensaver, corner score game, audio/video behavior, and links into the rest of the site |
| **Noah's Arcade** | `/noahs-arcade.html` | Arcade cabinet launcher with per-cabinet URL overrides (MAME GUI) |
| **Chapel** | `/chapel.html` | Hotspot-driven interactive soundboard scene with persistent config |
| **Commodore** | `/commodore.html` | Commodore 64-themed screen with power-state transitions and debug layout controls |
| **Antechamber** | `/antechamber.html` | Themed transition/room page |
| **Calendar** | `/calendar.html` | Full calendar — event creation, recurrence, schedule/day/week/month views, search, print, ICS export/subscription |
| **Notes** | `/notes.html` | Retro notes board — tags, pinning, completion, list/grid modes, authenticated server sync |
| **Recombobulator** | `/recombobulator.html` | Themed media utility for audio/video volume adjustment |
| **MAME GUI** | `/mame-gui.html` | Editor for arcade cabinet URL overrides (saved to server via `/api/arcade-url-overrides`) |
| **Commodore states** | `/commodore_on.html`, `/commodore_off.html` | Visual state variants for the Commodore page |

## Architecture

- **Frontend:** vanilla HTML, CSS, and inline JavaScript under `/public`
- **Backend/runtime:** Cloudflare Worker in `src/worker.js`
- **Static hosting:** Cloudflare Pages assets binding from `public/`
- **Persistence:** Cloudflare Durable Object `HOTSPOT_STORE` (SQLite-backed)
- **Auth:** Discord OAuth with HMAC-signed session cookies
- **Media:** optional Google Drive-backed aquarium clip catalog with local fallback; shrimp video assets in `public/assets/video/shrimp`

## Worker API endpoints

| Endpoint | Purpose |
|---|---|
| `GET /` | Den main page (`/index.html`) |
| `/den`, `/den.html`, `/index.html` | Alias -> `/index.html` |
| `/mame_gui`, `/mame-gui`, `/mame-gui.html` | Alias -> `/mame-gui.html` |
| `GET /api/health` | Health check |
| `GET/PUT /api/hotspots` | Den hotspot layout (Durable Object) |
| `GET/PUT /api/chapel-hotspots` | Chapel hotspot config (Durable Object) |
| `GET/PUT /api/arcade-url-overrides` | Arcade cabinet URLs (Durable Object) |
| `GET/POST /api/corner-score` | Corner high score + initials (Durable Object) |
| `GET/POST/PUT/DELETE /api/notes` | Per-user authenticated notes (Durable Object) |
| `GET /api/aquarium/shrimp-clips` | Aquarium clip catalog |
| `GET /api/aquarium/shrimp-clips/:id` | Individual aquarium clip |
| `/api/discord/auth`, `/callback`, `/me`, `/logout` | Discord OAuth session management |

## Persistence status

### Server-side (Durable Object)
- Den hotspot layout
- Chapel hotspot configuration
- Arcade URL overrides
- Corner high score + initials
- Authenticated per-user notes

### Still local or hybrid (not yet server-synced)
- Calendar events and label preferences
- Commodore debug layout and power/navigation state (`sessionStorage`)
- Arcade URL overrides offline fallback cache
- Notes local-first pending sync behavior

## Repository layout
---
/public          site pages and all static assets
/src/worker.js   Worker: routing, auth, persistence
/test            Node test suite
/wrangler.jsonc  Cloudflare deployment config
/package.json    build/test scripts
---

## Development
---
npm run build    # no-op (no build step)
npm test         # runs Node test suite (node --test)
