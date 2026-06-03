# Naimean_v3 — GPT Architectural Recommendations

GPT-sourced master architecture and implementation roadmap. Captures security, reliability, persistence, identity, and UX recommendations for evolving Naimean_v3 from a collection of themed pages into a persistent virtual environment.

---

## Overview

Naimean_v3 is evolving from a collection of themed webpages into a persistent virtual environment powered by Cloudflare Workers, Durable Objects, Discord authentication, and room-based navigation.

The project already has a strong technical foundation. The next stage is focused on improving:

* Security
* Reliability
* Persistence
* User trust
* Maintainability
* Scalability

The primary objective is to eliminate "pretend saving" and ensure every user-facing action has real, reliable persistence.

---

## Current Architecture

### Frontend

* Static assets hosted from `/public`
* Vanilla HTML/CSS/JavaScript
* Room-based navigation system
* Interactive hotspots
* Media-driven experiences
* Calendar
* Notes
* Commodore
* Noah's Arcade
* Chapel
* Aquarium

### Backend

* Cloudflare Worker (`src/worker.js`)
* Durable Objects (`HOTSPOT_STORE`)
* Discord OAuth
* Worker-first routing
* Static asset serving
* API endpoints

### Persistence

Currently persisted:

* Hotspots
* Chapel configuration
* Arcade URL overrides
* Corner score
* User notes

Still partially local:

* Calendar
* User preferences
* Commodore state
* Various UI settings

---

## Priority 1 — Security Hardening

### Remove SESSION_SECRET Fallback

Current code allows authentication to silently fall back to a hardcoded development secret.

**Risk:**
* Production misconfiguration may go unnoticed
* Session tokens could become forgeable
* Authentication appears functional even when improperly configured

**Required change:** Replace all fallback logic with hard failure.

```js
if (!env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET is not configured");
}
```

**Status: CRITICAL**

---

### Fix Discord Configuration

Current Wrangler configuration contains placeholder values.

**Verify:**
* `DISCORD_GUILD_ID`
* `DISCORD_ALLOWED_ROLE_IDS`
* `DISCORD_CLIENT_SECRET`

Replace placeholders with actual values.

**Status: CRITICAL**

---

### Protect Shared Write Endpoints

The following endpoints must require authenticated admin access before accepting POST requests:

* `/api/hotspots`
* `/api/chapel-hotspots`
* `/api/arcade-url-overrides`
* `/api/corner-score`

Currently these appear to be writable without role validation.

**Implement:**
* Session verification
* Discord role verification
* Admin authorization

**Status: CRITICAL**

---

## Priority 2 — Reliability

### Eliminate Pretend Saving

**Current problem:** Several systems rely on local-only storage or hybrid persistence. Users may believe data is saved when it is not.

Every saveable feature must display actual save state.

**Required states:**
* Saving
* Saved
* Offline
* Retry Pending
* Failed

**Status: HIGH**

---

### Offline Queue & Retry System

**Implement:**
* Local queue
* Automatic retries
* User-visible sync status

**Benefits:**
* Prevents silent data loss
* Improves user trust
* Supports future offline workflows

**Status: HIGH**

---

## Priority 3 — Calendar Persistence

### Server-First Calendar

Calendar should become fully server-backed. Do NOT store all events as a single JSON blob. Instead use relational SQLite tables.

**Example schema:**

```sql
calendar_events
---------------
id
user_id
title
description
start_time
end_time
rrule
created_at
updated_at
deleted_at
```

**Benefits:**
* Better synchronization
* Multi-device support
* Search support
* Recurring events
* Sharing support
* Conflict reduction

**Status: HIGH**

---

## Priority 4 — Durable Object Refactor

**Current HotspotStore responsibilities:**
* Hotspots
* Chapel configuration
* Arcade overrides
* Corner score
* Notes

**Before adding:**
* Calendar
* Preferences
* User profiles

Refactor handlers into modular functions.

**Example:**
* `handleHotspots()`
* `handleChapel()`
* `handleArcade()`
* `handleNotes()`
* `handleScores()`

**Long-term direction:**
* `HotspotStore`
* `CalendarStore`
* `UserStore`
* `PreferenceStore`

**Benefits:**
* Easier maintenance
* Reduced complexity
* Better scalability

**Status: HIGH**

---

## Priority 5 — Mobile & Media Reliability

### Verify HTTP Range Requests

Naimean is media-heavy. iOS Safari requires proper Range support for:

* Seeking
* Scrubbing
* Pause/Resume
* Inline playback

**Test:**
* iPhone Safari
* iPad Safari

**Verify:**
* MP4 playback
* Seeking
* Scrubbing

**Status: HIGH**

---

## Priority 6 — User Identity Layer

### User API

Create `/api/user`.

**Example structure:**

```json
{
  "discordId": "",
  "displayName": "",
  "joined": "",
  "lastSeen": "",
  "inventory": [],
  "achievements": [],
  "preferences": {}
}
```

**Benefits:**
* Profiles
* Achievements
* Inventory
* Progression
* Personalization

**Status: MEDIUM**

---

### Preferences API

Create `/api/preferences`.

**Example:**

```json
{
  "theme": "crt",
  "volume": 75,
  "calendarView": "month",
  "reducedMotion": false
}
```

**Benefits:**
* Cross-device consistency
* Accessibility support
* Future customization

**Status: MEDIUM**

---

## Priority 7 — User Experience

### Global Navigation Shell

Add persistent navigation visible from every room.

**Example:**
* Den
* Arcade
* Chapel
* Commodore
* Calendar
* Notes

**Benefits:**
* Faster navigation
* Better discoverability
* Reduced user confusion

**Status: MEDIUM**

---

### First-Time Onboarding

Add lightweight onboarding flow.

**Example:**
* Welcome to Naimean
* Click objects to interact
* Explore the Commodore
* Visit Noah's Arcade

**Benefits:**
* Better retention
* Reduced confusion
* Improved first impressions

**Status: MEDIUM**

---

## Priority 8 — Accessibility

**Recommended improvements:**
* Keyboard navigation
* Focus indicators
* ARIA improvements
* Reduced motion support
* Contrast validation

**Important due to:**
* CRT effects
* Animated scenes
* Media-heavy content

**Status: MEDIUM**

---

## Priority 9 — Performance

Current Worker-first routing is acceptable. No urgent performance bottlenecks identified.

**Future improvements:**
* AVIF/WebP optimization
* Video compression review
* Lazy loading
* Asset budgets

**Optional future optimization:** Early exit routing for `.mp4`, `.avif`, `.webp`.

**Status: LOW**

---

## Recommended Implementation Order

**Phase 1 — Security**
1. Remove SESSION_SECRET fallback
2. Fix Discord configuration
3. Protect shared POST endpoints

**Phase 2 — Reliability**
4. Verify Range requests
5. Add save-state indicators
6. Add offline queue and retry system

**Phase 3 — Architecture**
7. Modularize HotspotStore
8. Create Calendar SQLite schema
9. Build Calendar API

**Phase 4 — User Identity**
10. Create User API
11. Create Preferences API
12. Persist user settings

**Phase 5 — UX**
13. Global navigation shell
14. Onboarding system
15. Mobile optimization pass

**Phase 6 — Expansion**
16. Achievements
17. Inventory
18. Collectibles
19. Progression systems
20. Shared experiences

---

## Long-Term Vision

Naimean should evolve into a virtual operating system rather than a traditional website.

**Examples:**
* Calendar becomes a real calendar
* Mail becomes a real mailbox
* Commodore becomes an AI terminal
* Arcade cabinets launch real applications
* Whiteboards become real project boards
* Rooms become application containers

The Cloudflare Worker + Durable Object architecture already supports this vision.

Future development should prioritize:
1. Security
2. Reliability
3. Persistence
4. Identity
5. Maintainability

before major feature expansion.

The goal is to create a persistent virtual world where every object is a functional application and every user interaction is reliably remembered.
