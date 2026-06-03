# GitHub and Cloudflare Interaction in Naimean_v3

This document focuses on the boundary between what lives in GitHub and what executes or persists on Cloudflare, plus what should be changed if the goal is to stop "pretend saving" in the browser and make state truly server-side.

## Current split of responsibilities

## GitHub side

GitHub currently holds:

- the source of truth for site pages, Worker code, tests, and Wrangler config
- the full V3 implementation history and merged PR trail
- the branch/PR workflow used to evolve the site
- Copilot/agent-driven contribution history reflected in many PRs and commits

There are no repository GitHub Actions workflows in this clone, so GitHub is primarily the code-review and history layer, not the deployment executor.

## Cloudflare side

Cloudflare currently provides:

- Worker runtime (`src/worker.js`)
- static asset hosting from `public/`
- Worker-first routing for the entire site
- Durable Object persistence through `HOTSPOT_STORE`
- SQLite-backed storage inside the Durable Object
- environment variables and secrets for Discord and Google Drive integration

In practice: GitHub stores the app definition, while Cloudflare is the live runtime, auth gate, API layer, and persistence layer.

## Where GitHub and Cloudflare intersect

The main intersections are:

1. **Deployment shape is versioned in GitHub**
   - `wrangler.jsonc` defines the Worker entrypoint, asset binding, and Durable Object migration
   - `src/worker.js` defines the runtime routes Cloudflare executes

2. **Cloudflare behavior is testable from GitHub-managed code**
   - `test/worker.test.js` validates routing, auth, persistence, and cache/header behavior
   - changes to Cloudflare behavior are reviewed in PRs before they are deployed

3. **Cloudflare persistence contracts are defined in repo code**
   - the request/response shapes for hotspots, notes, scores, and overrides are all encoded in GitHub-tracked JavaScript

4. **Secrets stay outside GitHub**
   - Discord client secret, session secret, and Google Drive API key belong in Cloudflare environment/secrets, not the repository

5. **Commit history shows the Cloudflare migration path**
   - the repo history moves from static/front-end behavior toward Worker-based APIs, Durable Objects, and auth-backed state

## What is already genuinely server-side

- **Den hotspot saves** via `/api/hotspots`
- **Chapel hotspot config** via `/api/chapel-hotspots`
- **Arcade URL overrides** via `/api/arcade-url-overrides`
- **Corner score + initials** via `/api/corner-score`
- **Authenticated notes** via `/api/notes`

These are real Cloudflare-backed writes, not just local browser state.

## What is still only local or partly local

### Fully local today

- **Calendar events** in `public/api-client.js`
- **Calendar UI preferences** in `public/calendar.html`
- **Commodore debug layout** in `public/commodore.html`

### Hybrid / fallback behavior

- **Arcade URL overrides**
  - reads server data when available
  - falls back to `localStorage` on read failure
- **Notes**
  - persists locally immediately
  - then schedules a background server save when authenticated

This is the area that still feels like "pretending" to save when the server path is unavailable or deferred.

## Recommended path to make saving actually server-side

## 1. Treat the Worker as the source of truth

For any feature that matters across devices or sessions:

- load from the Worker first
- save to the Worker first
- use browser storage only for short-lived offline draft buffering
- clearly surface save failures instead of silently falling back

If a save does not reach Cloudflare, the UI should say so.

## 2. Add missing server APIs for the local-only features

### Calendar

Best next step:

- add `/api/calendar/events`
- store events server-side instead of in `public/api-client.js` local storage
- keep ICS generation in the Worker so exported calendars reflect server truth

Recommended storage model:

- **Per-user Durable Object** if each user mainly manages their own calendar
- **D1** if the goal is shared calendars, querying by date range, and more relational access patterns

### Commodore debug layout

Best next step:

- add `/api/commodore-layout`
- decide whether layout is:
  - global
  - admin-only
  - per-user

This should not remain local if the layout is intended to affect the live site.

### Calendar preferences and other UI personalization

Good candidates for a small per-user settings endpoint:

- hidden labels
- label renames
- color type names
- preferred view mode

These fit well in a per-user Durable Object or a D1 user-settings table.

## 3. Remove silent fallback semantics

Current weak pattern:

- try server
- if it fails, quietly use local storage

Better pattern:

- read from server
- if server fails, show degraded/offline state
- optionally load last known local draft copy marked as **unsynced**
- on save, queue retry but keep the unsynced badge until Cloudflare confirms the write

That preserves usability without pretending the data is truly saved.

## 4. Put auth in front of mutable shared state where needed

Some current state is global and unauthenticated. That may be fine for deliberate public features, but if vandalism or accidental edits matter:

- require Discord auth for admin/edit routes
- separate public read endpoints from authenticated write endpoints
- consider role-based access using the existing Discord session and allowed-role checks

The repo already has the start of this pattern through `/api/discord/me` and per-user notes auth.

## 5. Choose the right Cloudflare data product by feature

### Keep in Durable Objects

Use Durable Objects for:

- counters and scoreboards
- hotspot/layout state that benefits from serialized writes
- per-user note collections
- small settings blobs

This matches the repo's existing architecture and avoids unnecessary system sprawl.

### Use D1 when querying matters

Use D1 for:

- calendar events across ranges
- shared event feeds
- reporting or filtering
- anything that will want SQL queries beyond a single object/blob

### Use R2 only for large binary objects

Use R2 for:

- uploaded media
- large attachments
- exports worth storing as files

Not for notes, scores, hotspot rectangles, or preferences.

## Suggested implementation order

1. **Calendar server persistence**
2. **Per-user settings API for calendar/preferences**
3. **Commodore layout persistence**
4. **UI changes that mark local drafts as unsynced instead of saved**
5. **Auth/role gating for mutable shared config**

## Practical recommendation

For this repo specifically, the simplest consistent strategy is:

- keep **Durable Objects** for hotspots, notes, scores, overrides, and user settings
- add **D1** only when calendar data needs shared querying or broader reporting
- stop using `localStorage` as the success path
- keep browser storage only as an explicitly labeled offline draft cache

That would make GitHub the place where behavior is defined and reviewed, and Cloudflare the place where state is actually owned and persisted.
