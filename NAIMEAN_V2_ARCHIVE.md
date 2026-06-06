# NAIMEAN V2 Archive: Technical Specifications & Evolution

This document serves as the high-fidelity record of the Naimean V2 architecture and logic, consolidated from the archived `naimeanv2.0` repository to ensure the V3 shell maintains continuity with previous development goals.

## 1. Multi-Worker Architecture
V2 was decentralized, splitting concerns across three primary Cloudflare Workers:
- **Edge Router (`src/index.js`)**: Managed global ingress.
  - *Logic*: Implemented path-based routing (`/api/*` vs `/jukebox/*`).
  - *Security*: Handled IP blocking and dynamic Content Security Policy (CSP) headers.
  - *Injection*: Dynamically injected `APPLE_MUSIC_DEVELOPER_TOKEN` into the jukebox HTML shell at the edge.
- **Main Backend (`cloudflare-worker/worker.js`)**: The core application logic.
  - *Features*: Authentication, complex layout generation, and sub-app state orchestration.
- **API Service (`naimean-api/src/worker.js`)**: A dedicated RESTful endpoint.
  - *Endpoints*: Health checks, D1 entry logging, and Apple MusicKit JWT generation.

## 2. Core Logic & State Management
- **Persistent State (D1)**: V2 relied on Cloudflare D1 SQL for system-wide state.
  - `rickroll_counter`: Global interaction tracking.
  - `hotspot_overrides`: Persistent, per-user UI layouts for the Commodore and Den interfaces.
  - `entries`: High-volume logging and user feedback storage.
- **Session Auth**: Custom implementation using `HMAC-SHA-256` signatures on session tokens, verified via a `SESSION_SECRET` environment variable.
- **MusicKit Integration**: Generated short-lived developer tokens to enable the public Jukebox sub-app to interface with the Apple Music API.

## 3. Advanced Features & Improvements
Key advancements developed in V2 to be preserved/evolved in V3:
- **AI Art Generation (Bedroom Switcher)**: A 5-image sequence generation system utilizing Server-Sent Events (SSE) for real-time progress updates.
- **Unified Auth-Ban**: A centralized middleware to handle user identity and administrative access restrictions.
- **Live Agent Feed**: A UI component designed to "tail" the AI's internal thought process for transparency.
- **Interface Constraints**: Mobile landscape blockers to preserve the aesthetic integrity of complex "retro" UI components.
- **Calendar UX**: Dynamic "glowing star" pins for priority events and a tabbed system for switching between personal and global schedules.

## 4. Porting Reconciliation (V2 to V3)

| Feature | V2 Implementation | V3 Transition |
| :--- | :--- | :--- |
| **Worker Structure** | Fragmented (3 Workers) | **Consolidated** into a single unified worker for performance and DX. |
| **Routing** | Regex-heavy Edge Routing | **Middleware-based** routing in the unified shell. |
| **State** | Direct D1 queries | **Abstraction Layer** in V3 for better testability. |
| **9-Level Progression** | Linear path files | **Open World** room-based navigation (Intentionally Dropped). |
| **Builders/Cabinets** | Dedicated HTML tools | **Integrated Plugins** in the V3 shell. |
