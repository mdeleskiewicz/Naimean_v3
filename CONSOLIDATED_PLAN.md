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

### Agent 4 — GPT (Master Architecture & Implementation Roadmap)
**Session focus:** Full system review with primary emphasis on security hardening, eliminating pretend saving, and a long-term vision for Naimean as a persistent virtual OS.

**Three new CRITICAL security gaps identified (not previously surfaced):**

1. **SESSION_SECRET fallback** — Auth silently falls back to a hardcoded dev secret when the env var is missing. Production misconfiguration goes unnoticed; session tokens become forgeable.
2. **Placeholder Discord config** — `DISCORD_GUILD_ID`, `DISCORD_ALLOWED_ROLE_IDS`, and `DISCORD_CLIENT_SECRET` may contain placeholder values in `wrangler.jsonc`, leaving Discord role gating non-functional.
3. **Unprotected shared write endpoints** — `/api/hotspots`, `/api/chapel-hotspots`, `/api/arcade-url-overrides`, and `/api/corner-score` accept POST/PUT with no session or role verification. Any anonymous caller can overwrite shared state.

**Additional architectural priorities:**

| Focus Area | Current State | Target State | Impact |
|---|---|---|---|
| SESSION_SECRET | Silent fallback to hardcoded secret | Hard fail with thrown error on missing env var | Prevents silent auth misconfiguration in production |
| Shared write endpoints | Open POST/PUT — no auth check | Require valid session + Discord role before mutating | Closes anonymous write attack surface |
| HotspotStore handlers | Single monolithic class | Modular `handleHotspots()`, `handleChapel()`, etc. | Enables CalendarStore, UserStore, PreferenceStore expansion |
| User identity | No `/api/user` endpoint | `{ discordId, displayName, joined, inventory, achievements, preferences }` | Enables profiles, progression, personalization |
| Preferences | Scattered localStorage keys | `/api/preferences` — cross-device JSON blob (or row-level) | Cross-device consistency + accessibility settings |
| Long-term vision | Themed pages | Virtual OS — every object is a functional application | Arcade → real apps, Commodore → AI terminal, etc. |

**Recommended implementation phases (GPT):**

1. Security (SESSION_SECRET, Discord config, endpoint auth)
2. Reliability (Range requests, save indicators, offline queue)
3. Architecture (DO modularization, Calendar SQLite, Calendar API)
4. Identity (User API, Preferences API, settings persistence)
5. UX (Global nav, onboarding, mobile pass)
6. Expansion (achievements, inventory, collectibles, shared experiences)

See `GPT_RECOMMENDATIONS.md` for the full roadmap.

---

## Recommendation Weight Matrix

Each item scored across agents (1 = mentioned, 2 = high priority, 3 = critical/structural risk).

**Scoring key:**
- `Copilot UX` — Agent 1 priority rank
- `Gemini Arch` — Agent 2 structural severity
- `Commit Freq` — frequency signal from PR history
- `GPT` — Agent 4 severity rating
- **Total** = sum; items are sorted descending

### Security — must be addressed before any new feature work

| Recommendation | Copilot UX | Gemini Arch | Commit Freq | GPT | **Total Weight** |
|---|---|---|---|---|---|
| Remove SESSION_SECRET fallback (hard fail) | 0 | 0 | 0 | 3 | **3 🔴 CRITICAL** |
| Fix Discord config placeholders | 0 | 0 | 0 | 3 | **3 🔴 CRITICAL** |
| Protect shared write endpoints (`/api/hotspots` etc.) | 0 | 2 | 0 | 3 | **5 🔴 CRITICAL** |

### Core Architecture & Reliability

| Recommendation | Copilot UX | Gemini Arch | Commit Freq | GPT | **Total Weight** |
|---|---|---|---|---|---|
| Calendar server-side persistence (SQLite, not blob) | 3 | 2 | 0 | 3 | **8** |
| Sync status indicators across all features | 2 | 2 | 1 | 3 | **8** |
| Offline queue + background retry | 2 | 2 | 1 | 3 | **8** |
| SQLite relational migration for calendar/preferences | 2 | 3 | 0 | 2 | **7** |
| HTTP Range request passthrough for `.mp4` | 1 | 3 | 0 | 2 | **6** |
| Worker early-exit bypass for binary assets | 1 | 3 | 1 | 1 | **6** |
| Mobile-first interaction pass | 2 | 1 | 1 | 2 | **6** |
| Auth middleware for protected HTML pages | 1 | 3 | 0 | 1 | **5** |
| Durable Object modular refactor | 0 | 1 | 0 | 2 | **3** |

### Identity & Settings

| Recommendation | Copilot UX | Gemini Arch | Commit Freq | GPT | **Total Weight** |
|---|---|---|---|---|---|
| Preferences API (`/api/preferences`) | 1 | 1 | 0 | 2 | **4** |
| Global settings panel (preferences persistence) | 1 | 1 | 0 | 2 | **4** |
| User API (`/api/user`) | 0 | 0 | 0 | 2 | **2** |

### UX & Accessibility

| Recommendation | Copilot UX | Gemini Arch | Commit Freq | GPT | **Total Weight** |
|---|---|---|---|---|---|
| Unified in-app navigation layer | 2 | 0 | 0 | 2 | **4** |
| Accessibility hardening (ARIA, focus, motion) | 2 | 0 | 0 | 2 | **4** |
| Onboarding and contextual guidance | 1 | 0 | 0 | 2 | **3** |
| Commodore layout + state persistence | 1 | 1 | 0 | 1 | **3** |
| Performance budgeting / asset optimization | 1 | 1 | 0 | 1 | **3** |
| Admin workflow simplification | 1 | 0 | 0 | 0 | **1** |

---

## Recommended Execution Order (Consolidated)

Derived from weight matrix + GPT security-first phasing:

**Phase 0 — Security (CRITICAL — block all other work)**
1. 🔴 Remove SESSION_SECRET fallback — hard fail if env var missing
2. 🔴 Fix Discord config — verify guild ID, role IDs, client secret
3. 🔴 Protect shared write endpoints — session + role check on POST/PUT for hotspots, chapel, arcade, corner-score

**Phase 1 — Core Reliability (Weight 6–8)**
4. Calendar server-side persistence (SQLite schema + `/api/calendar-events`)
5. Sync status indicators on all save-capable pages
6. Offline queue + background retry system
7. SQLite relational migration (foundational; unblocks calendar + preferences)

**Phase 2 — Performance & Mobile (Weight 5–6)**
8. HTTP Range request passthrough for `.mp4` (iOS Safari)
9. Worker early-exit bypass for binary assets
10. Auth middleware for protected HTML pages
11. Mobile-first touch interaction pass

**Phase 3 — Architecture (Weight 3–4)**
12. Durable Object modular refactor (`handleHotspots()`, `handleChapel()`, etc.)
13. Preferences API (`/api/preferences`)
14. Global settings panel

**Phase 4 — Identity (Weight 2–4)**
15. User API (`/api/user`)
16. Persist user settings cross-device

**Phase 5 — UX Polish (Weight 2–4)**
17. Unified in-app navigation shell
18. Accessibility hardening
19. Onboarding flow
20. Commodore state persistence
21. Performance budgeting / asset optimization

**Phase 6 — Expansion (Future)**
22. Achievements system
23. Inventory
24. Collectibles
25. Progression systems
26. Shared experiences

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

1. 🔴 SESSION_SECRET fallback allows silent auth misconfiguration in production
2. 🔴 Shared write endpoints (`/api/hotspots`, `/api/chapel-hotspots`, `/api/arcade-url-overrides`, `/api/corner-score`) have no auth/role gate on mutations
3. 🔴 Discord config may contain placeholder values — role gating non-functional
4. Calendar events are still stored locally — no server API exists
5. Commodore power/nav state uses `sessionStorage` only — lost on tab close
6. User label preferences (calendar, etc.) are not persisted server-side
7. HTML shells for protected tools (MAME GUI, Notes) are publicly accessible
8. Binary assets pass through full Worker execution even when no logic applies
9. HotspotStore is a monolithic handler — will become unmanageable before CalendarStore/UserStore expansion
