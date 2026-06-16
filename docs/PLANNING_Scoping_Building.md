# Planning: Scoping & Building

## Overview
This document details the technical roadmap, build protocols, and infrastructure scoping for Naimean V3.

## Technical Notes
- **Wrangler Configuration:** The project standardizes on `wrangler.toml` as the authoritative Cloudflare config.
- **Environment:** Runs on Cloudflare Workers (`naimeav3`).
- **Database:** Uses Cloudflare D1 (`naimean_v3_db`).
- **Compatibility:** Compatibility date is set to `2024-04-03`.
- **Assets:** Static assets are served from the `/public` directory.

## Build Protocols
- Deploys are handled via GitHub Actions, intersecting with Cloudflare's API for seamless delivery.
- Build scripts are managed through the Cloudflare environment, with `wrangler` handling the local-to-cloud handoff.

## Planned features
- Deep analytics for worker performance.
- Automated D1 migrations.
