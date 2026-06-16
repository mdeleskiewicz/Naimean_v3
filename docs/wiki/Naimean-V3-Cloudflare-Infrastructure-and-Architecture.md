# Naimean V3: Cloudflare Infrastructure and Architecture

This page is the master reference for the Cloudflare infrastructure powering Naimean V3. It combines the current deployment state with the conceptual architecture.

## 1. Core Architecture Summary

Naimean V3 is an edge-native application running on Cloudflare Workers. It prioritizes stateful logic through Durable Objects and reduces reliance on global external databases where possible, while using Cloudflare Pages Assets for static delivery.

### Infrastructure Map

| Service | Role | Key Configuration |
|---|---|---|
| Workers | Main request handler | `main = "src/worker.js"` |
| Durable Objects | Stateful logic and storage | `env.HOTSPOT_STORE` |
| Pages Assets | Static hosting | `env.ASSETS` |
| D1 | Relational data | `naimean-v3-db` |
| KV | Fast global state (sparse usage) | `naimeav3` namespace |

## 2. Resource Inventory and Configuration

### A. Workers Project

- Project name: `naimeav3`
- Runtime compatibility: `nodejs_compat`
- Environment variables:
  - `AQUARIUM_LOCAL_CLIP_COUNT = 23`
  - `DISCORD_CLIENT_ID = 1495879141638275213`
  - `DISCORD_GUILD_ID = 1487898909224341534`
  - `GOOGLE_DRIVE_PAGE_SIZE = 100`
  - `GOOGLE_DRIVE_SHRIMP_FOLDER_ID = 1DPzSJbcN9v_D1mSy4nIXjPOBhFHJpvSi`
  - `DISCORD_ALLOWED_ROLE_IDS = ""`
- Bindings:
  - `ASSETS` (Pages Assets)
  - `DB` (D1)
  - `HOTSPOT_STORE` (Durable Object)

### B. Storage and Database Instances

| Resource Type | Name | ID / Binding |
|---|---|---|
| KV Namespace | `naimeav3` | `dff7175059ce478eab8c910949ca330f` |
| D1 Database | `naimean-v3-db` | `0798d2f2-618b-4044-91f5-a2c762922184` (`DB`) |
| R2 Bucket | `naimean-v3-assets` | account resource only; not bound in `wrangler.toml` |

## 3. Implementation Logic

Naimean V3 uses a local-first storage strategy for interactive room features.

- Durable Object storage (`HOTSPOT_STORE`):
  - Stores game scores, notes, room state, and related per-user/per-room state.
  - Uses both DO KV-style storage (blob/array state) and DO SQLite storage (relational tables).
  - Avoids unnecessary global D1/KV usage for room-scoped interactions.
- D1 (`naimean-v3-db`):
  - Reserved for structured application data that needs querying outside the scope of individual Durable Objects.

## 4. Development and CI

- CLI tool: Wrangler config controls bindings and deployment settings (`wrangler.toml` in this repository).
- Deployment: GitHub Actions workflow at `.github/workflows/deploy.yml` deploys on push to `main`.
- Observability: enabled globally (`[observability] enabled = true`).

## 5. Services Note

To keep the architecture simple and performant:

- Workers KV is used sparingly because state-heavy flows prefer DO-local storage.
- Queues are not currently used because operations are synchronous.
- AI Gateway is not currently used because integrations call APIs directly.
- Cloudflare Zero Trust/Access is not used for app auth; authentication is handled via Discord OAuth.

## 6. Copilot Refactoring Guide

When asking Copilot to optimize files, reference the inventory in Section 2 explicitly.

Example prompt:

> Refactor `src/worker.js` to utilize the `DB` binding for `naimean-v3-db` (ID: `0798d2f2-618b-4044-91f5-a2c762922184`) instead of direct KV calls.
