# Configuration: GitHub

## Repository Overview
- **Name:** Naimean_v3
- **Description:** 3.0 - He Boiled for our sins!
- **Branch Strategy:** Primary development occurs on the `main` branch.

## CI/CD and Integration
- **GitHub Actions:** Configured to deploy the Worker to Cloudflare upon pushes to `main`.
- **Intersection:** The repository serves as the source of truth for the `naimeav3` worker logic and static assets in `/public`.

## Project Management
- **Labels:** Standard GitHub labels for issue tracking.
- **Milestones:** Used for tracking "Big Ticket Items" in the planning roadmap.

## Contribution Guidelines
- Ensure all changes are reflected in the corresponding documentation buckets.
- Update `wrangler.jsonc` for any infrastructure-level changes.
- Maintain the thematic 'Lore' integrity in commit messages and documentation.
