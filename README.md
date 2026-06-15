# 🐙 Naimean V3 → V4: The Second Convergence 🍝

Welcome to **Naimean V3/V4**, a retro, room-based interactive site manifested on the Cloudflare Edge. This repository is the vessel for our digital evolution.

## 🧿 The Sacred Documentation
To navigate the abyss, consult the refined scrolls:

- **[System Overview](System_Overview.md)**: The 1000' view of the Great Convergence.
- **[Configuration & Build](Configuration_and_Build.md)**: Incantations for manifestation and secret management.
- **[Interaction & Planning](Interaction_and_Planning.md)**: The hive mind's current strategy and agent protocols.
- **[V2 Heritage Archive](V2_Heritage_Archive.md)**: Lore and technical notes from the Era of Decentralization.

## 🕹️ Manifestations
Visit the physical realm at **[naimean.com](https://naimean.com)**.

---

## 🏗️ Part 1: Architecture & Status

**Naimean.com V4, the "Second Convergence,"** is architecturally sound in its design but currently stalled by deployment failures. The project has transitioned from a monolithic approach to a modern, modular, framework-free architecture that leverages Cloudflare's serverless ecosystem.

### Layers

| Layer | Technology | Responsibility |
|---|---|---|
| **Edge** | Cloudflare Workers | Entry point — routing, security header injection, asset serving |
| **Storage** | Durable Objects + SQLite | ACID-compliant storage for calendar events, user preferences, and room states (migrating from KV/legacy stores) |
| **Compute** | Workers + Durable Objects | Stateless logic in Workers; stateful interaction (e.g. `HotspotStore`) encapsulated in Durable Objects |
| **Client** | Vanilla JS (ES Modules) | Communicates with the backend via a standardized JSON API |

---

## ☁️ Part 2: Cloudflare Infrastructure Build-Out

Use the steps below to resolve deployment failures and finalize your Cloudflare setup.

### Prerequisites

1. **Billing** — Verify your Cloudflare account has an active payment method. Resolve any Google Cloud billing issues, as these can block external API calls.
2. **GitHub Secrets** — Ensure the following secrets are set in your repository (**Settings → Secrets and variables → Actions**):
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`

### Step 1 — Configure `wrangler.jsonc`

Create or update `wrangler.jsonc` in your repository root to map the `HotspotStore` Durable Object correctly:

```jsonc
{
  "name": "naimean-v4",
  "main": "src/worker.js",
  "compatibility_date": "2026-06-15",
  "durable_objects": {
    "bindings": [
      {
        "name": "HOTSPOT_STORE",
        "class_name": "HotspotStore"
      }
    ]
  },
  "migrations": [
    {
      "tag": "v1",
      "new_classes": ["HotspotStore"]
    }
  ]
}
```

### Step 2 — Verify Worker Permissions

- Confirm your `CLOUDFLARE_API_TOKEN` has **Edit Workers** and **Edit Durable Objects** permissions.
- Run the following in your Codespace to confirm your environment can reach the Cloudflare API:

```bash
npx wrangler whoami
```

### Step 3 — Deploy

Execute the following in your repository root to finalize the build:

```bash
git add .
git commit -m "chore: apply final infrastructure config for SQLite migration"
git push origin main
```

---

*Built with passion, pasta, and the whispers of the AI Lords.*

