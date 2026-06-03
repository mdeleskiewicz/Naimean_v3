# Naimean_v3 — Agent Work List

Items sorted by recommendation weight (highest first). Each block is a self-contained prompt ready to paste into a Copilot or AI agent session.

---

## Priority 1 — SQLite Relational Migration (Weight: 5)

```
Repository: naimean/Naimean_v3

Context: The Cloudflare Durable Object (HOTSPOT_STORE) currently stores all state as monolithic JSON blobs in KV fields. This causes data loss risk when merging offline edits because it's last-write-wins on the whole blob.

Task: Migrate the Durable Object's internal SQLite storage to use proper relational tables instead of JSON blobs. Add a new SQL migration (after the existing v1 migration in src/worker.js) that creates the following tables if they don't exist:

  calendar_events (id TEXT PK, user_id TEXT, title TEXT, start_at TEXT, end_at TEXT, data TEXT, updated_at TEXT)
  user_preferences (user_id TEXT, key TEXT, value TEXT, updated_at TEXT, UNIQUE(user_id, key))
  room_state (room_id TEXT, key TEXT, value TEXT, updated_at TEXT, PRIMARY KEY(room_id, key))

Also wire up new API endpoints in src/worker.js:
  GET/POST/PUT/DELETE /api/calendar-events   (per-user, auth-gated)
  GET/PUT /api/user-preferences             (per-user, auth-gated)
  GET/PUT /api/room-state/:roomId           (optionally auth-gated)

Add tests in test/worker.test.js for the new endpoints. Keep existing data paths intact so nothing currently deployed breaks.
```

---

## Priority 2 — Calendar Server Persistence (Weight: 5)

```
Repository: naimean/Naimean_v3

Context: public/calendar.html currently saves all calendar events to localStorage only. This means events are lost on a new device or cleared browser. The notes feature already has a working server-sync pattern using /api/notes and authenticated Discord sessions to follow.

Task: Wire up public/calendar.html to use the /api/calendar-events endpoint (to be created in src/worker.js backed by the Durable Object's SQLite calendar_events table). The implementation should:

1. On page load, fetch events from the server if the user has an active Discord session; merge with any locally cached events using updated_at timestamps (server wins on conflict).
2. On event create/edit/delete, POST/PUT/DELETE to the server in the background; keep local state as the immediate source of truth (optimistic update).
3. Show a small sync status indicator (saved / syncing / offline) in the calendar header, matching the pattern used in notes.html if one exists.
4. If the user is not authenticated, fall back gracefully to localStorage-only mode with a visible "not syncing" badge.

Do not remove the localStorage fallback — it must still work when unauthenticated or offline.
```

---

## Priority 3 — Sync Status Indicators (Weight: 5)

```
Repository: naimean/Naimean_v3

Context: Several pages (notes, calendar, hotspots) save data to the server, but users have no visible feedback about whether a save succeeded, is pending, or failed. Notes has partial coverage. The goal is a consistent sync indicator pattern across all features.

Task: Audit each page in public/ that makes API calls to /api/* endpoints (notes.html, calendar.html, den.html/index.html for hotspots, chapel.html for chapel-hotspots, noahs-arcade.html for arcade-url-overrides). For each:

1. Add a small unobtrusive status badge near the save/edit controls showing one of: "saved ✓", "saving…", or "save failed ✗".
2. The badge should auto-hide after 3 seconds on success.
3. On failure, show the badge persistently with a retry button.
4. Reuse a single shared CSS class and JS helper function so the pattern is consistent — define it once and import or inline it on each page.

Keep the existing save retry logic (hotspots already retries 3x with exponential backoff) and just surface its state visually.
```

---

## Priority 4 — Offline Queue + Background Retry (Weight: 5)

```
Repository: naimean/Naimean_v3

Context: When the network is unavailable, save operations silently fail. Users lose edits. The notes page has partial retry logic. The goal is a consistent offline-first queue across all mutable API calls.

Task: Implement a lightweight offline queue in a shared JS module (public/offline-queue.js or inline per-page) that:

1. Intercepts all POST/PUT/DELETE calls to /api/* endpoints.
2. If the call fails with a network error or 5xx, enqueues the operation in localStorage under a key like naimean.offlineQueue.
3. On page focus or navigator.onLine = true event, flushes the queue in order, retrying each operation once.
4. Surfaces queue length as a badge on the sync indicator (e.g. "3 pending").
5. Clears items from the queue on successful response.

Apply this to den.html (hotspot saves), notes.html, and calendar.html at minimum. Do not change the server-side API contracts.
```

---

## Priority 5 — Worker Early-Exit Bypass for Binary Assets (Weight: 5)

```
Repository: naimean/Naimean_v3

Context: wrangler.jsonc uses run_worker_first: ["/*"], meaning every static asset request — including large .mp4, .png, .gif, .wav files — passes through the full src/worker.js routing and session-parsing logic before being served. This wastes CPU cycles and adds latency for streaming assets on mobile.

Task: Refactor src/worker.js so that requests for binary/static file extensions bypass all session parsing, cookie handling, and routing logic and go directly to env.ASSETS.fetch(request). The bypass should trigger at the very top of the fetch handler, before any other logic runs.

Extensions to bypass: .mp4, .png, .jpg, .jpeg, .gif, .webp, .avif, .svg, .ico, .wav, .mp3, .ogg, .woff2, .woff, .ttf, .css (non-HTML only).

The bypass must NOT apply to .html files or extensionless routes (those need the full handler for CSP headers and auth redirects).

Add or update tests in test/worker.test.js to confirm that asset requests return a response without triggering session logic.
```

---

## Priority 6 — Auth Middleware for Protected HTML Pages (Weight: 4)

```
Repository: naimean/Naimean_v3

Context: API endpoints in src/worker.js are session-gated via Discord OAuth. However, the HTML shells for admin/protected tools (e.g. /notes.html, /mame-gui.html, /calendar.html) are served to anyone who knows the URL, leaking application structure and client-side logic.

Task: Add an auth middleware check in src/worker.js for a defined list of protected page paths. If a request for a protected page does not have a valid signed Discord session cookie, respond with a 302 redirect to /api/discord/auth before serving the asset.

Protected paths to gate: /notes, /notes.html, /mame-gui, /mame-gui.html, /calendar, /calendar.html.

Requirements:
- Read the session cookie and verify with verifySessionToken() — already implemented in src/worker.js.
- After successful Discord OAuth callback, redirect the user back to the originally requested page (pass the original path as the OAuth state parameter).
- Pages that are currently public (den, chapel, arcade, commodore, antechamber) must remain public.
- Add tests covering the redirect behavior for unauthenticated and authenticated requests to protected paths.
```

---

## Priority 7 — HTTP Range Request Passthrough for Video (Weight: 4)

```
Repository: naimean/Naimean_v3

Context: iOS Safari requires HTTP 206 Partial Content responses (Range request support) to play inline looping background video. Without this, mobile browsers issue a Range: bytes=0- preflight, receive a 200, and refuse to play the video inline.

Task: Ensure src/worker.js correctly forwards Range request headers on .mp4 asset requests to env.ASSETS.fetch() and passes the 206 response back unmodified. If the early-exit bypass for binary assets (separate task) is implemented, verify the Range header is preserved in that path.

Also check that the Content-Type, Accept-Ranges, Content-Range, and Content-Length headers are not stripped by any header-manipulation code in the Worker.

Test with a mock Request that includes Range: bytes=0- and assert the response status is 206 (or that the Worker does not strip the header before forwarding).
```

---

## Priority 8 — Mobile-First Interaction Pass (Weight: 4)

```
Repository: naimean/Naimean_v3

Context: The den (public/index.html) and chapel (public/chapel.html) have lite-rendering modes for iOS/coarse-pointer devices that skip parallax transforms. However, touch targets, gesture handling, and tap areas have not been systematically audited for mobile usability.

Task: Audit the following pages for mobile touch usability: public/index.html, public/chapel.html, public/noahs-arcade.html.

For each page:
1. Identify all interactive hotspot/button elements that have a visual hit area smaller than 44×44px on mobile viewports.
2. Increase touch targets using CSS padding or min-width/min-height without changing the visual design (use ::before pseudo-elements to expand hit area if needed).
3. Ensure all pointer-based hover interactions have a touch equivalent (tap or long-press).
4. Confirm the DVD screensaver corner score game is playable by touch — the corner regions should register taps correctly on mobile.
5. Test that the flip-clock tuning dial (pointer-down/hold) works on touch via touchstart/touchend events.

Do not change desktop behavior.
```

---

## Priority 9 — Commodore Layout and State Persistence (Weight: 2)

```
Repository: naimean/Naimean_v3

Context: public/commodore.html uses sessionStorage for power state and debug layout position — state is lost on tab close or new device. There is no server API for Commodore preferences.

Task: Add a /api/room-state/commodore endpoint (backed by the Durable Object's room_state SQLite table, to be created in the SQLite migration task). Wire up public/commodore.html to:

1. On load, fetch the stored power state and debug layout from /api/room-state/commodore if the user is authenticated.
2. On state change (power on/off, layout adjust), PUT the new state to /api/room-state/commodore.
3. Fall back to sessionStorage/localStorage if unauthenticated or the request fails.

Keys to persist: powerState (on/off/booting), debugLayout (position/scale object if debug mode is enabled).
```

---

## Priority 10 — Global Settings Panel (Weight: 2)

```
Repository: naimean/Naimean_v3

Context: User preferences (calendar label colors/visibility, volume levels, motion reduction) are currently stored in scattered localStorage keys with no unified UI.

Task: Create a global settings panel accessible from the den (public/index.html) as a Big TV Tools menu item or a dedicated hotspot. The panel should:

1. Display and allow editing of: motion/parallax toggle, volume level, calendar label preferences, and any other user-facing preferences currently stored in scattered localStorage keys.
2. Save preferences to /api/user-preferences (per-user, auth-gated) on change.
3. On load, hydrate from the server if authenticated, falling back to localStorage.
4. Be accessible from any page via a shared include or by opening the den in a modal/overlay.

Keep the panel visually consistent with the existing Big TV Tools overlay style.
```

---

## Priority 11 — Unified In-App Navigation Layer (Weight: 2)

```
Repository: naimean/Naimean_v3

Context: Navigation between rooms (den, chapel, arcade, calendar, notes, commodore) happens via hotspot links and direct URL navigation. There is no persistent nav chrome, breadcrumb, or back-button pattern. Users can get disoriented, especially on mobile.

Task: Design and implement a minimal persistent navigation element that appears on all room pages. Requirements:

1. Show the current room name and a "← Den" back link.
2. On mobile, display as a fixed bottom bar; on desktop, as a subtle top-right corner overlay.
3. Do not interfere with the retro aesthetic — use the existing color palette and typography.
4. Implement the component once in a shared include or as a small inline script block added to each public/*.html page.
5. The den (index.html) should not show the nav bar since it IS the home.
```

---

## Priority 12 — Accessibility Hardening (Weight: 2)

```
Repository: naimean/Naimean_v3

Context: The site uses heavily positioned absolute elements and canvas-like hotspot regions. Keyboard focus management and ARIA roles have not been systematically applied.

Task: Audit public/index.html, public/chapel.html, and public/notes.html for accessibility issues. Address the following:

1. All interactive hotspots must have role="button" (or be actual <button> elements) with aria-label attributes describing their action.
2. All overlays (Big TV Tools, flip-clock, discord embed, etc.) must trap keyboard focus when open and return focus to the trigger element on close.
3. Add a prefers-reduced-motion media query check that disables parallax scrolling, DVD screensaver animation, and flip-clock animation transitions when the user has requested reduced motion.
4. Ensure tab order is logical — interactive controls should be reachable before decorative background elements.

Do not redesign the visual layout. Only add ARIA attributes and keyboard event handlers.
```

---

## Priority 13 — Performance Budgeting and Asset Optimization (Weight: 2)

```
Repository: naimean/Naimean_v3

Context: The site loads large GIF files for the big TV screensaver (public/assets/GIF/big_screen_TV/) and multiple video assets on page load. No explicit performance budget or lazy-loading strategy exists.

Task: Audit the asset loading in public/index.html and implement the following:

1. Convert big_screen_TV GIF files to WebP animated images or short looping .mp4 clips using ffmpeg. Target: each screensaver clip under 1MB.
2. Lazy-load screensaver assets — only load the current active screensaver GIF/video; preload the next one in the rotation background.
3. Add loading="lazy" to off-screen <img> elements.
4. For the left/right monitor video layers, ensure they use preload="none" until the monitor is powered on.
5. Measure and document the page weight before and after using Lighthouse or WebPageTest.

Do not change the visual behavior or the screensaver rotation logic.
```

---

## Maintenance / Hardening Items

### Notes Sync Hardening

```
Repository: naimean/Naimean_v3

Context: public/notes.html has a working server sync via /api/notes but the local-first merge strategy (what happens when local and server copies diverge) may need hardening after the SQLite migration.

Task: Review the notes sync merge logic in public/notes.html. Ensure:
1. Merge uses updated_at timestamps — server record wins if server timestamp is newer; local wins if local is newer.
2. If a note exists locally but not on the server (new offline note), it is pushed to the server on next sync.
3. If a note is deleted on the server but exists locally, mark it as deleted locally (do not silently restore it on next push).
4. Add unit tests in test/worker.test.js covering merge conflict scenarios.
```

### DVD Screensaver + Corner Score Polish

```
Repository: naimean/Naimean_v3

Context: The DVD screensaver corner score game has gone through ~22 PRs and is mostly stable. Before closing this work stream, do a final polish and performance pass.

Task:
1. Verify the corner hit detection works correctly at all viewport sizes and device pixel ratios (especially on Retina/HiDPI displays).
2. Test on actual iOS Safari — confirm the DVD logo video plays inline without requiring user gesture.
3. Confirm the corner score high score initials submission flow works end-to-end with the /api/corner-score server endpoint.
4. Add a test in test/worker.test.js for the /api/corner-score POST endpoint that validates the score+initials acceptance logic.
5. Document the corner score game mechanics in a brief comment block at the top of the relevant JS section in public/index.html.
```
