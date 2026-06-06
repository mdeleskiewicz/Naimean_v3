# Naimean V3 Build Configuration & Environment Heritage

This document reconciles the build processes from V2 and defines the unified configuration for V3.

## 1. Environment Variables Heritage (V2 -> V3)
V3 consolidates variables that were previously spread across three workers in V2.

| Variable Name | Origin (V2) | V3 Usage | Description |
| :--- | :--- | :--- | :--- |
| `SESSION_SECRET` | Backend | Unified | Used for HMAC session signing. |
| `APPLE_DEVELOPER_TOKEN` | API / Edge | Unified | For MusicKit JWT generation. |
| `DB` (D1 Binding) | API / Backend | Unified | Primary persistence layer. |
| `DISCORD_CLIENT_ID` | Backend | Unified | OAuth2 integration. |
| `DISCORD_CLIENT_SECRET` | Backend | Unified | OAuth2 integration. |

## 2. Worker Configuration (`wrangler.jsonc`)
V3 uses a consolidated `wrangler.jsonc` compared to the individual `wrangler.toml` files in V2.

### Key Configuration Points:
- **Main Entry**: `src/worker.js`
- **Compatibility Date**: `2024-04-03` (Updated from V2's legacy dates)
- **D1 Database**: Bound to the same production D1 instance used in V2 to preserve user data (counters, overrides).

## 3. Build & Deployment
- **Bundling**: V3 uses `esbuild` via Wrangler to bundle all modules into a single edge-compatible script.
- **V2 Dropped features**: The manual path-based edge injection logic from V2's Edge Router is replaced by dynamic module imports in V3 for better performance.
