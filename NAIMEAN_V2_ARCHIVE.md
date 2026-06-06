# NAIMEAN V2 Archive: Technical Specifications & Missing Functionalities

This document provides a high-fidelity record of the Naimean V2 architecture and logic, specifically identifying features and plans from the `naimeanV2.0` repository that are currently absent or significantly different in V3.

## 1. Core Architecture (Multi-Worker System)
Unlike the consolidated V3 shell, V2 operated as a distributed system across multiple Cloudflare Workers:
- **Edge Router (`src/index.js`):** Handled IP blocking, path-based routing, and dynamic injection of `APPLE_MUSIC_DEVELOPER_TOKEN` into jukebox pages.
- **Main Backend (`cloudflare-worker/worker.js`):** The central logic engine handling Auth, Layouts, and specialized tools.
- **Counter Service (`naimean-api`):** A dedicated worker for the "Rickroll" counter logic and analytics.

## 2. Key Functional Components (Missing in V3)

### A. 9-Level Progression System
V2 featured a linear, level-based user journey (`first_level.html` through `ninth_level.html`). Users were intended to progress through specific challenges to unlock new areas of the "Den."
- **Status in V3:** Missing. V3 uses an open, room-based navigation shell.

### B. Specialized Builders & Cabinet Management
V2 included dedicated tools for content creation that are not yet in V3:
- **MAME/Arcade Builders:** `mame_builder.html` and `arcade-builder.html` for configuring retro game cabinets.
- **Cabinet CRUD:** Backend endpoints (`/cabinet*`) for saving, updating, and listing virtual arcade machines.

### C. Advanced Authentication & Third-Party Integration
While V3 focuses on Discord OAuth, V2 had a broader auth plan:
- **Providers:** Apple Sign-In and Spotify OAuth logic were implemented in the backend.
- **Token Injection:** Dynamic injection of developer tokens for Apple MusicKit.

### D. Hotspot Layout Overrides
V2 allowed for persistent, user-specific layout overrides:
- **Logic:** Users could "rearrange" room hotspots, with coordinates saved to a D1 database (`/layout` endpoints).
- **Status in V3:** V3 currently uses a more static or globally managed hotspot alignment system.

### E. "Brain Protocol" & Gold State
Referenced in `diagnostics.js` and `scripts.js`, this was a plan for a "Gold State" initialization—a synchronized state management system for AI-agent interactions and site-wide consistency.

## 3. Infrastructure Details (`wrangler.toml`)
- **D1 Database:** `barrelroll-counter-db` for persistence of notes, layouts, and counter stats.
- **KV Namespaces:** Used for session management and quick-lookup configurations.
- **Environment Logic:** Explicit handling of `PROD` vs. `STAGING` environments with service bindings for cross-worker communication.

## 4. Visual & Interaction Logic
- **C64 Boot Sequence:** The `index.html` contained a detailed Commodore 64-themed boot sequence logic that integrated with the Rickroll counter.
- **SSE Art Pipeline:** `bedroom-switcher.js` used Server-Sent Events to track the progress of AI-generated art across multiple generation steps (the "5-image switcher").
