What this repo actually is
This is a Cloudflare Worker + static-assets app for an interactive virtual “den” site.

The core split is:

Backend/runtime: /home/runner/work/Naimean_v3/Naimean_v3/src/worker.js
Frontend pages/assets: /home/runner/work/Naimean_v3/Naimean_v3/public
Cloudflare config: /home/runner/work/Naimean_v3/Naimean_v3/wrangler.toml
Tests: /home/runner/work/Naimean_v3/Naimean_v3/test
The real architecture
1. One Worker is the server
/home/runner/work/Naimean_v3/Naimean_v3/src/worker.js is the single entrypoint.

It handles:

Discord auth routes:
/api/discord/auth
/api/discord/callback
/api/discord/me
/api/discord/logout
app APIs:
/api/hotspots
/api/chapel-hotspots
/api/arcade-url-overrides
/api/corner-score
/api/notes
/api/calendar-events
/api/user-preferences
/api/room-state/:roomId
/api/aquarium/shrimp-clips
/api/aquarium/shrimp-clip/:id
/api/health
/api/db-test
It also does path aliasing and protected-page redirects.

2. Static files are first-class, but the Worker still runs first
/home/runner/work/Naimean_v3/Naimean_v3/wrangler.toml has:

main = "src/worker.js"
[assets] directory = "public"
binding = "ASSETS"
run_worker_first = ["/*"]
So the Worker sees every request first, then decides whether to:

serve an asset,
redirect,
enforce auth,
or forward to storage logic.
3. Most app state lives in one Durable Object class
The main state engine is HotspotStore in /home/runner/work/Naimean_v3/Naimean_v3/src/worker.js.

It stores two kinds of data:

KV/blob-style state

den hotspots
chapel hotspot config
arcade URL overrides
corner score
notes
SQLite tables inside the Durable Object

calendar_events
user_preferences
room_state
Important nuance: although there is also a D1 binding in wrangler.toml, the code shows that most real app state is not using D1 directly. D1 appears to be bound mainly for /api/db-test; the feature data is mostly in Durable Object storage.

How the frontend is organized
1. The main Den page is modular
The main scene is /home/runner/work/Naimean_v3/Naimean_v3/public/index.html.

It loads:

/home/runner/work/Naimean_v3/Naimean_v3/public/assets/css/index.css
/home/runner/work/Naimean_v3/Naimean_v3/public/assets/js/index.js
/home/runner/work/Naimean_v3/Naimean_v3/public/assets/js/index.js is just a safe bootstrap wrapper.

Actual app boot happens in:

/home/runner/work/Naimean_v3/Naimean_v3/public/assets/js/appRuntime.js
That bootstraps modules from:

core/
systems/
ui/
2. JS is split by responsibility
The module structure is meaningful:

Core

/home/runner/work/Naimean_v3/Naimean_v3/public/assets/js/core/constants.js
/home/runner/work/Naimean_v3/Naimean_v3/public/assets/js/core/state.js
/home/runner/work/Naimean_v3/Naimean_v3/public/assets/js/core/domRefs.js
/home/runner/work/Naimean_v3/Naimean_v3/public/assets/js/core/utils.js
/home/runner/work/Naimean_v3/Naimean_v3/public/assets/js/core/media.js
Systems

hotspots
monitors
dvd
cornerScore
aquarium
login
tools
flipClock
performance
scene
leftMonitorCards
These live under: /home/runner/work/Naimean_v3/Naimean_v3/public/assets/js/systems

UI

/home/runner/work/Naimean_v3/Naimean_v3/public/assets/js/ui/overlays.js
That file is important: it creates/positions much of the interactive overlay DOM.

3. Other pages are more self-contained
Several pages are standalone HTML files with large inline scripts/styles, rather than using the full modular Den runtime:

/home/runner/work/Naimean_v3/Naimean_v3/public/commodore.html
/home/runner/work/Naimean_v3/Naimean_v3/public/noahs-arcade.html
/home/runner/work/Naimean_v3/Naimean_v3/public/notes.html
/home/runner/work/Naimean_v3/Naimean_v3/public/calendar.html
So this repo is a hybrid:

main Den page = modular app
room/app pages = mostly self-contained documents
Feature organization that matches the docs
The feature README points to four documented features, and the code supports that split:

Big TV Tools
Documented in the wiki, implemented mainly in:

/home/runner/work/Naimean_v3/Naimean_v3/public/assets/js/systems/tools.js
Validated behaviors:

menu/editor modes
built-in Notes shortcut
custom tools saved in localStorage
URLs open in a new tab
Hotspot debug/persistence
Implemented mainly in:

/home/runner/work/Naimean_v3/Naimean_v3/public/assets/js/systems/hotspots.js
/home/runner/work/Naimean_v3/Naimean_v3/src/worker.js
Validated behaviors:

hotspots can be edited
saved to /api/hotspots
fallback modal exists if server save fails
some per-hotspot URL overrides are localStorage-based
Discord auth + protected pages
Implemented in:

/home/runner/work/Naimean_v3/Naimean_v3/src/worker.js
/home/runner/work/Naimean_v3/Naimean_v3/public/assets/js/systems/login.js
Validated behaviors:

/notes, /mame-gui, and /calendar are protected
unauthenticated users get redirected to /api/discord/auth
frontend polls /api/discord/me
there is a Discord session chip in /home/runner/work/Naimean_v3/Naimean_v3/public/index.html
Commodore power behavior
Implemented across:

/home/runner/work/Naimean_v3/Naimean_v3/public/assets/js/systems/monitors.js
/home/runner/work/Naimean_v3/Naimean_v3/public/assets/js/ui/overlays.js
/home/runner/work/Naimean_v3/Naimean_v3/public/assets/css/index.css
Validated behaviors:

on/off sequence
shadow-layer animation
delayed side monitor activation
persisted power state
Storage model in plain English
A good mental model is:

Worker = router/auth/gateway
Assets = HTML/CSS/JS/media hosting
Durable Object = app state store
D1 = present, but currently secondary
Named Durable Object instances are used for different concerns, including:

den-hotspots
chapel-hotspots
arcade-url-overrides
corner-score
notes-${userId}
calendar-events
user-preferences
room-state
So the codebase uses a single Durable Object class but multiple named instances to isolate different kinds of state.

Tests and operational setup
Tests
/home/runner/work/Naimean_v3/Naimean_v3/package.json shows:

npm run build = placeholder only (No build step)
npm test = node --test
The test folder is broader than the root README summary suggests. It includes targeted suites like:

aquarium
big TV
chapel
Discord auth/session UI
left/right monitor overlays
flip clock
browser modules
worker routing
under /home/runner/work/Naimean_v3/Naimean_v3/test.

Deployment
Deployment is defined in:

/home/runner/work/Naimean_v3/Naimean_v3/.github/workflows/deploy.yml
Validated behavior:

deploys on push to main
runs npx wrangler deploy --config wrangler.toml
strips ANSI from logs
uploads deploy logs to Google Drive afterward
A couple of doc/code nuances I found
These are worth knowing:

/home/runner/work/Naimean_v3/Naimean_v3/public/api-client.js is not really a generic API client.
It mainly contains the calendar sync engine plus notes API helpers.

D1 is not the main app datastore today.
Most meaningful state is in Durable Object storage.

One wiki doc appears slightly stale:
/home/runner/work/Naimean_v3/Naimean_v3/docs/wiki/Durable-Object-Storage.md says the SQL tables live in the room-state named instance, but the current Worker routes dispatch them to separate instances:

calendar-events
user-preferences
room-state
Short version
If you want the fastest way to understand the repo, read it in this order:

/home/runner/work/Naimean_v3/Naimean_v3/wrangler.toml
/home/runner/work/Naimean_v3/Naimean_v3/src/worker.js
/home/runner/work/Naimean_v3/Naimean_v3/public/index.html
/home/runner/work/Naimean_v3/Naimean_v3/public/assets/js/appRuntime.js
/home/runner/work/Naimean_v3/Naimean_v3/public/assets/js/core/constants.js
/home/runner/work/Naimean_v3/Naimean_v3/public/assets/js/systems/hotspots.js
/home/runner/work/Naimean_v3/Naimean_v3/public/assets/js/systems/login.js
/home/runner/work/Naimean_v3/Naimean_v3/public/assets/js/systems/tools.js
If you want, I can next turn this into either:

a page-by-page tour, or
a backend/API map, or
a frontend module map.
