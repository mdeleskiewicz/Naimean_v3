# Naimean V3

Naimean V3 is a Cloudflare edge application that serves a room-based interactive site (`public/*.html`) and API endpoints from a single Worker (`src/worker.js`).

## Repository Structure

| Path | Purpose |
|---|---|
| `src/worker.js` | Main Cloudflare Worker router, Discord auth flow, API handlers, Durable Object class (`HotspotStore`) |
| `public/` | Static site pages and media assets served through the `ASSETS` binding |
| `test/` | Node test suite for Worker routing, auth, Durable Object behavior, and UI fixture integrity |
| `docs/` | Project documentation and architecture notes |
| `docs/wiki/` | Cloudflare-focused wiki pages (Workers, Assets, Durable Objects, Wrangler, CI) |
| `.github/workflows/deploy.yml` | Automatic deployment workflow on pushes to `main` |
| `wrangler.toml` | Cloudflare runtime/config bindings used by this codebase |

## Key Technologies

- Cloudflare Workers (edge runtime)
- Cloudflare Durable Objects with SQLite-backed storage (`HOTSPOT_STORE`)
- Cloudflare Assets/Pages static hosting (`ASSETS`)
- Cloudflare D1 binding (`DB` -> `naimean-v3-db`)
- Cloudflare R2 binding (`ASSETS_STORAGE` -> `naimean-v3-assets`)
- Vanilla HTML/CSS/JavaScript frontend (no framework)
- Discord OAuth for authenticated routes
- Node.js built-in test runner (`node --test`)

## Code Organization

### Worker and API

`src/worker.js` handles:

- static asset serving and path aliases (`/den`, `/mame-gui`, etc.)
- security/cache headers
- Discord OAuth endpoints (`/api/discord/*`)
- Durable Object backed APIs (`/api/hotspots`, `/api/notes`, `/api/calendar-events`, `/api/room-state/:roomId`, etc.)
- shrimp clip catalog/proxy routes

### Stateful Data Model

The `HotspotStore` Durable Object stores:

- KV-style object/blob state (hotspots, chapel config, arcade URL overrides, score, notes)
- SQLite table data (calendar events, user preferences, room state)

### Frontend

`public/` contains room pages and static assets:

- main den UI: `public/index.html`
- room/app pages: `public/commodore.html`, `public/chapel.html`, `public/noahs-arcade.html`, `public/notes.html`, `public/calendar.html`, `public/mame-gui.html`, etc.
- media: `public/assets/images`, `public/assets/video`, `public/assets/audio`, `public/assets/GIF`

## Cloudflare Infrastructure Snapshot

### Bound in this repository (`wrangler.toml`)

| Service | Binding | Resource |
|---|---|---|
| Assets | `ASSETS` | `public/` directory |
| Durable Objects | `HOTSPOT_STORE` | `HotspotStore` class |
| D1 | `DB` | `naimean-v3-db` (`0798d2f2-618b-4044-91f5-a2c762922184`) |
| R2 | `ASSETS_STORAGE` | `naimean-v3-assets` |

### Account-level storage inventory provided

| Type | Name | ID / Notes |
|---|---|---|
| Workers KV | `naimean-kv` | `dff7175059ce478eab8c910949ca330f` |
| D1 | `naimean-v3-db` | `0798d2f2-618b-4044-91f5-a2c762922184` (bound as `DB`) |
| D1 | `naimean-db` | `0871f90d-f7e3-467a-a1f9-4e74ac8aef42` |
| D1 | `barrelroll-counter-db` | `22277fbe-031d-4ca2-8937-245309e981cd` |
| R2 | `naimean-v3-assets` | bound as `ASSETS_STORAGE` |

## Development

```bash
npm install
npm run build
npm test
```

Optional local worker runtime:

```bash
npx wrangler dev
```

## Deployment

- Deploy automation is in `.github/workflows/deploy.yml`.
- Repository secrets required in GitHub Actions: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
- Runtime secrets should be set in Cloudflare (for example `DISCORD_CLIENT_SECRET`, `SESSION_SECRET`, `GOOGLE_DRIVE_API_KEY`).

## Monitor Overlay Architecture

The Den scene (`public/index.html`) features three physical monitors: **Left**, **Middle**, and **Right**. Each monitor is represented by a single unified DOM group element that contains all three visual layers as children. This "group" approach makes the overlay stack easy to position, resize, and reason about.

### Layer Hierarchy (per monitor)

```
.screen-overlay.monitor-group          ← positioned at full frame bounds
  ├── .monitor-frame-layer   (z-index 3)  ← frame PNG (L_Frame.png or R_Frame.png)
  ├── .monitor-shadow-layer  (z-index 2)  ← TV-off black curtain; animated on power on/off
  └── .monitor-overlay-layer (z-index 1)  ← interactive screen content
        ├── .monitor-screen-window        ← inset to the screen hole inside the frame
        └── (all interactive UI)
```

### Element IDs

| Monitor | Group ID | Control Hotspot ID |
|---|---|---|
| Left | `monitor-group-left` | `monitor-group-left-control` |
| Middle (CornerScore) | `monitor-group-middle` | `monitor-group-middle-control` |
| Right | `monitor-group-right` | `monitor-group-right-control` |

Constants for these IDs live in `public/assets/js/core/constants.js`:
- `MONITOR_GROUP_LEFT_ID`, `MONITOR_GROUP_MIDDLE_ID`, `MONITOR_GROUP_RIGHT_ID`
- `MONITOR_GROUP_LEFT_CONTROL_ID`, `MONITOR_GROUP_MIDDLE_CONTROL_ID`, `MONITOR_GROUP_RIGHT_CONTROL_ID`
- `MIDDLE_MONITOR_FRAME_BOUNDS` — design-space pixel bounds for the middle monitor group

### CSS Conventions

All layer classes are defined in `public/assets/css/index.css`:

| Class | Role |
|---|---|
| `.monitor-group` | Top-level container; `overflow: visible`; `pointer-events: none` |
| `.monitor-frame-layer` | Hosts the frame PNG image; `z-index: 3` within group |
| `.monitor-shadow-layer` | Black curtain for TV-off state; `z-index: 2` within group |
| `.monitor-overlay-layer` | Screen content container; `z-index: 1` within group |
| `.left-monitor-screen-window` | Percentage insets aligning to L_Frame.png screen hole |
| `.right-monitor-screen-window` | Percentage insets aligning to R_Frame.png screen hole |

TV power-on/off animations use the `.tv-turning-on`, `.tv-turning-off`, and `.is-monitor-on` classes on `.monitor-shadow-layer`.

### Frame Images

- Left monitor: `public/assets/images/L_Frame.png`
- Right monitor: `public/assets/images/R_Frame.png` (displayed with `transform: scaleY(-1)`)
- Middle monitor: no separate frame PNG; the Commodore desk image (`overlay-commodore-screen`) provides the visual bezel

### Adding a New Monitor

1. Add `MONITOR_GROUP_<NAME>_ID` and `MONITOR_GROUP_<NAME>_CONTROL_ID` constants in `constants.js`
2. Add a `MONITOR_GROUP_<NAME>_FRAME_BOUNDS` bounds constant (design-space pixels)
3. Add the group to `overlayDefaults` and `defaultHotspots` in `constants.js`
4. Add the binding to `OVERLAY_CONTROL_BINDINGS` and `HOTSPOT_READABLE_LABELS`
5. Add a matching entry in `src/worker.js` `DEFAULT_HOTSPOTS` and `test/fixtures/hotspots.js`
6. Implement the `if (overlay.id === MONITOR_GROUP_<NAME>_ID)` block in `public/assets/js/ui/overlays.js`
7. Add inset CSS rules for `.your-monitor-screen-window` if the frame has a transparent screen hole
8. Wire up any click handler in `public/assets/js/systems/hotspots.js`


## Docs

- [System Overview](docs/System_Overview.md)
- [Configuration and Build](docs/Configuration_and_Build.md)
- [Cloudflare Wiki Index](docs/wiki/README.md)
