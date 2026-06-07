# Interactions: Secrets, Tokens, and System Handoffs

## Overview
This document outlines the security protocols and interaction points between GitHub, Cloudflare, and the AI systems managing Naimean V3.

## Secrets Management
### GitHub Secrets
- **CLOUDFLARE_API_TOKEN:** Used by GitHub Actions to authenticate with Cloudflare for automated deployments.
- **CLOUDFLARE_ACCOUNT_ID:** Required for targeting the correct account during the build process.

### Cloudflare Secrets
- **System Secrets:** Sensitive environment variables (e.g., external API keys) are stored as encrypted secrets within the Cloudflare Worker environment and are not exposed in the source code.

## System Handoffs
### Deployment Flow
1. Code is pushed to the `main` branch on GitHub.
2. GitHub Actions triggers the deployment workflow.
3. The build artifact is handed off to the Cloudflare Workers API using the stored tokens.
4. The `naimeav3` worker is updated at the edge.

### AI Integration Handoffs
- Handoffs between the user agent and the backend logic are managed via structured JSON payloads.
- Security tokens for internal AI service access are injected at runtime via environment bindings.

## Token Rotation & Audit
- Tokens should be rotated every 90 days or upon developer offboarding.
- Audit logs in both GitHub and Cloudflare should be monitored for unauthorized access.
