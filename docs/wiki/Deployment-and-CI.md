# Deployment and CI

## Overview

Naimean V3 uses **GitHub Actions** to automatically deploy to Cloudflare every time code is pushed to the `main` branch. You don't have to manually run Wrangler — the deployment happens on its own after every merge or push.

The workflow file is at **`.github/workflows/deploy.yml`**.

---

## How the Deployment Works

### Trigger

```yaml
on:
  push:
    branches:
      - main
```

The workflow fires automatically whenever commits are pushed to the `main` branch. This means merging a pull request or pushing directly to main will trigger a deploy.

### Steps

```
1. Checkout the code
2. Run: npx wrangler deploy --config wrangler.toml
3. Save the deploy log to Google Drive
```

#### Step 1: Checkout

```yaml
- uses: actions/checkout@v4
```

Clones the repository into the GitHub Actions runner (a temporary Linux VM).

#### Step 2: Deploy with Wrangler

```yaml
- name: Deploy
  env:
    CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
  run: |
    npx wrangler deploy --config wrangler.toml --color=always > raw-deploy.log 2>&1 || true
```

- `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are GitHub repository secrets — they authenticate Wrangler to your Cloudflare account without needing to log in interactively.
- `npx wrangler deploy` runs Wrangler without installing it globally (it downloads it from npm on demand).
- `--config wrangler.toml` explicitly uses the repository's TOML config file.
- `> raw-deploy.log 2>&1 || true` captures all output to a log file and ensures the step doesn't fail even if Wrangler exits with an error (the `|| true`). The outcome is checked from the log file instead.
- The log is then stripped of ANSI colour codes and saved as `full-deploy-log.txt`.

#### Step 3: Report to Google Drive

```yaml
- name: Report to Gemini Hooks
  if: always()
  env:
    REFRESH_TOKEN: ${{ secrets.GDRIVE_REFRESH_TOKEN }}
    CLIENT_ID: ${{ secrets.GDRIVE_CLIENT_ID }}
    CLIENT_SECRET: ${{ secrets.GDRIVE_CLIENT_SECRET }}
  run: |
    pip install google-api-python-client google-auth
    python3 - <<EOF
    # ... uploads full-deploy-log.txt to a Google Drive folder
    EOF
```

After every deploy (success or failure — note `if: always()`), a Python script uploads the deploy log to a specific Google Drive folder. This is the project's custom "deployment reporting" hook — logs are stored in Drive so they can be reviewed without needing access to GitHub.

---

## Required GitHub Secrets

These secrets must be set in the GitHub repository's **Settings → Secrets and variables → Actions** before the deploy workflow will work:

| Secret name | What it is | Where to get it |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | A Cloudflare API token with Workers deploy permissions | Cloudflare dashboard → My Profile → API Tokens |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID | Cloudflare dashboard → right sidebar on the Workers & Pages home |
| `GDRIVE_REFRESH_TOKEN` | Google OAuth refresh token for uploading logs | Google OAuth flow |
| `GDRIVE_CLIENT_ID` | Google OAuth client ID | Google Cloud Console |
| `GDRIVE_CLIENT_SECRET` | Google OAuth client secret | Google Cloud Console |

---

## Cloudflare Secrets (Runtime)

Separately from the GitHub CI secrets above, the Worker also needs several **Cloudflare secrets** set at runtime. These are not stored in the repo — they're uploaded to Cloudflare with:

```bash
npx wrangler secret put SECRET_NAME
```

| Secret name | Purpose |
|---|---|
| `DISCORD_CLIENT_SECRET` | Discord OAuth app secret for the auth flow |
| `SESSION_SECRET` | A random string used to sign and verify session tokens (HMAC) |
| `GOOGLE_DRIVE_API_KEY` | Google Drive API key for fetching shrimp video clips from Drive |
| `DISCORD_REDIRECT_URI` | (Optional) Override for the Discord OAuth callback URL |
| `ROOM_STATE_REQUIRE_AUTH` | Set to `"true"` to require login for room state writes |

These appear in `env` just like the `vars` in `wrangler.toml`, but are never stored in the repository.

---

## What Gets Deployed

When `wrangler deploy` runs, it packages and uploads:

1. **`src/worker.js`** — the compiled Worker script
2. **Everything in `public/`** — all static assets (HTML pages, images, videos, GIFs, audio, fonts, CSS, JS)

Cloudflare distributes these globally to all its edge data centres.

---

## Dry Run (Validation Without Deploying)

You can validate the configuration locally without actually deploying:

```bash
npx --yes wrangler@latest deploy --config wrangler.toml --dry-run
```

This builds the Worker and validates the config but makes no changes to Cloudflare. Useful for catching config errors before pushing.

---

## Deployment Flow Summary

```
Push to main branch
       ↓
GitHub Actions starts runner (Linux VM)
       ↓
Checkout code
       ↓
npx wrangler deploy
  ├── Reads wrangler.toml
  ├── Bundles src/worker.js
  ├── Uploads Worker script to Cloudflare
  ├── Uploads public/ assets to Cloudflare
  └── Creates/migrates HotspotStore Durable Object (if new migration)
       ↓
Log file saved to Google Drive
       ↓
Site is live at the custom domain
```

---

## Key Concepts for Learning

| Term | Plain-English meaning |
|---|---|
| **GitHub Actions** | An automation platform built into GitHub that runs scripts in response to events (like a push) |
| **Workflow** | A YAML file in `.github/workflows/` that defines what to run and when |
| **GitHub repository secret** | An encrypted variable stored in GitHub settings, injected into workflow runs |
| **Cloudflare API token** | A credential that allows tools like Wrangler to act on your Cloudflare account |
| **`CLOUDFLARE_ACCOUNT_ID`** | Your unique Cloudflare account identifier — needed to target the right account |
| **Cloudflare secret** | An encrypted runtime variable stored in Cloudflare, available in `env` inside the Worker |
| **`npx`** | Runs an npm package without installing it globally (`npx wrangler deploy` downloads and runs Wrangler) |

---

## Further Reading

- [Cloudflare Workers: Deploy with GitHub Actions](https://developers.cloudflare.com/workers/ci-cd/github-actions/)
- [Wrangler: Creating API tokens](https://developers.cloudflare.com/workers/wrangler/ci-cd/)
- [Managing secrets with Wrangler](https://developers.cloudflare.com/workers/configuration/secrets/)
- [GitHub Actions documentation](https://docs.github.com/en/actions)
