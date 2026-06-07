# Configuration: CloudFlare

## Infrastructure Overview
Naimean V3 is built on the Cloudflare ecosystem, utilizing Workers, Pages, and D1 for a resilient, edge-first architecture.

## Worker Configuration (`naimeav3`)
- **Compatibility Date:** `2024-04-03`
- **Main Entry:** Defined in `wrangler.jsonc`.
- **Functionality:** Handles dynamic requests, AI model handoffs, and database interactions.

## Database (D1)
- **Database Name:** `naimean_v3_db`
- **Purpose:** Persistent storage for user state, session data, and project metadata.
- **Access:** Accessed via the Worker binding.

## Static Assets
- **Source Directory:** `/public`
- **Delivery:** Served via Cloudflare's global edge network.

## Bindings & Environment
- **D1_DATABASE:** Binding to `naimean_v3_db`.
- **ASSETS:** Binding to the static asset directory.
- **Environment Variables:** Managed via the Cloudflare Dashboard and Cloudflare Secrets for sensitive data.

## Deployment
- Automated via GitHub Actions using the Cloudflare API token.
- Local development is supported through `wrangler dev`.
