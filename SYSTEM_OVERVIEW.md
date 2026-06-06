# System Overview: Naimean V3 Evolution

## Evolution from V2 to V3
Naimean V3 represents a fundamental architectural shift from the fragmented multi-worker setup of V2 into a unified, high-performance edge application shell.

### Architectural Consolidation
- **V2 Heritage**: Three separate workers (Edge Router, Backend, API) coordinated via complex routing and shared secrets.
- **V3 Implementation**: A single, unified Worker entry point (`src/worker.js`) that leverages internal middleware for routing and feature orchestration.

### Core Pillars
- **Unified Shell**: All sub-apps (Commodore, Den, Jukebox) now run within a standardized runtime environment.
- **Edge Persistence**: Continued and optimized use of Cloudflare D1 for state management, inheriting the counter and entry logic from V2.
- **Enhanced DX**: Consolidating the codebase has reduced deployment complexity and synchronized versioning across the ecosystem.

## Key Sub-systems (Reconciled)
1. **Auth & Security**: Consolidated the fragmented V2 auth flows into a centralized middleware.
2. **AI Services**: Ported the AI Art generation logic from the V2 Bedroom Switcher into the V3 asset pipeline.
3. **Music Integration**: Refined Apple MusicKit JWT generation to be a core service within the unified worker.
