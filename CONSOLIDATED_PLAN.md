# Naimean_v3 — Consolidated Agent Plan

All architectural reviews, agent sessions, and UX improvement recommendations consolidated into one document, sorted by weight of recommendation across agents.

---

## Agent Sessions Summary

### Agent 1 — Copilot (UX & Workflow Plan, PR #460)
**Session focus:** Eliminated redundant README files, created initial UX workflow plan.
**Recommendations (ranked by agent):**
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

### Agent 2 — Gemini (Architectural Review, PR #461–462)
**Session focus:** Deep architectural analysis; surfaced three structural vulnerabilities; proposed concrete migration and security work.

**Top 3 structural vulnerabilities identified:**

1. **Split-Brain State (Highest Risk)** — Calendar and other hybrid-local features store state as monolithic JSON blobs. When users edit offline and reconnect, a simple last-write-wins merge on the Durable Object will erase data. Requires row-level SQLite tables with `updated_at` timestamps.
2. **Worker-First Routing Overhead** — `run_worker_first: ["/*"]` means every binary asset (`.mp4`, `.png`, `.wav`) passes through full Worker execution before being served. This is unnecessary CPU overhead that bottlenecks streaming media on mobile.
3. **Auth Loophole on Static Pages** — The `/api/*` endpoints are session-protected, but the HTML shells (`/notes.html`, `/mame-gui.html`, etc.) are served to unauthenticated users. Structure and client-side logic are publicly leakable.

**Technical Recommendations Matrix:**

| Focus Area | Current State | Target State | Impact |
|---|---|---|---|
| Data persistence | Monolithic JSON blobs in Durable Object KV | Relational SQLite tables with `updated_at` | Prevents offline-sync data loss |
| Worker routing | All assets through full execution path | Early-exit bypass for binary extensions at top of `worker.js` | Lower edge CPU cost; reliable mobile streaming |
| Page auth | APIs session-gated; HTML shells public | 302 redirect to `/api/discord/auth` before serving protected HTML | Closes client-logic leak |
| Media delivery | Static loops without Range header support | Range request passthrough in Worker for `.mp4` | iOS Safari inline video playback |

**Priority execution order:**
1. SQLite schema migration (foundational; unblocks calendar sync and offline queue)
2. Worker routing + auth shield (security + performance)
3. HTTP Range request support (mobile UX)

---

### Agent 3 — Copilot (Feature Sprints, PRs #413–458)
**Session focus:** Implemented feature backlog items across ~45 PRs. Primary work areas and frequency:

| Theme | PR Count | Key PRs |
|---|---|---|
| DVD screensaver & corner score game | ~22 | #416–#450 |
| Initials entry and high score server sync | ~8 | #436–#446 |
| Notes backend API and sync | ~3 | #413–#415 |
| Clock/desk clock tuning | ~3 | #424, #453, #458 |
| Aquarium hotspot and shrimp playback | ~3 | #420, #421, #435 |
| Worker optimization pass | 1 | #454 |
| Auth / session fixes | 1 | #450 |

---

## Recommendation Weight Matrix

Each item scored across agents (1 = mentioned, 2 = high priority, 3 = critical/structural risk):

| Recommendation | Copilot UX Plan | Gemini Arch | Commit Frequency | **Total Weight** |
|---|---|---|---|---|
| SQLite relational migration for calendar/preferences | 2 | 3 | 0 | **5** |
| Worker early-exit bypass for binary assets | 1 | 3 | 1 | **5** |
| Auth middleware for protected HTML pages | 1 | 3 | 0 | **4** |
| HTTP Range request passthrough for `.mp4` | 1 | 3 | 0 | **4** |
| Calendar server-side persistence | 3 | 2 | 0 | **5** |
| Sync status indicators across all features | 2 | 2 | 1 | **5** |
| Offline queue + background retry | 2 | 2 | 1 | **5** |
| Mobile-first interaction pass | 2 | 1 | 1 | **4** |
| Accessibility hardening (ARIA, focus, motion) | 2 | 0 | 0 | **2** |
| Global settings panel (preferences persistence) | 1 | 1 | 0 | **2** |
| Unified in-app navigation layer | 2 | 0 | 0 | **2** |
| Performance budgeting / asset optimization | 1 | 1 | 0 | **2** |
| Onboarding and contextual guidance | 1 | 0 | 0 | **1** |
| Admin workflow simplification | 1 | 0 | 0 | **1** |
| Commodore layout + state persistence | 1 | 1 | 0 | **2** |

---

## Items Still in Active Iteration (from commit history)

These are features that have already been partially implemented but may need hardening or completion:

- **Corner score game** — many PRs, mostly stable; consider performance audit and mobile testing
- **Hotspot editing and persistence** — server-side via Durable Object; persisted control hotspots in debug mode
- **Notes sync** — server API exists; local-first merge and conflict handling may need hardening
- **Shrimp/aquarium video** — playback transition logic has been updated; Range requests needed for iOS
- **Flip-clock / tuning dial** — tuned; audio behavior is stable
- **Big TV screensaver and tools overlay** — rotation, menu/editor mode implemented

---

## Open Technical Debt

1. Calendar events are still stored locally — no server API exists
2. Commodore power/nav state uses `sessionStorage` only — lost on tab close
3. User label preferences (calendar, etc.) are not persisted server-side
4. HTML shells for protected tools (MAME GUI, Notes) are publicly accessible
5. Binary assets pass through full Worker execution even when no logic applies
