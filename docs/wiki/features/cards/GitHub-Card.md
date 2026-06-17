# GitHub Card

## User Experience

The GitHub card is a room shortcut into repository resources.

- Clicking the GitHub shelf object triggers the GitHub card on the left monitor.
- The left monitor shows four direct-launch quadrants: `Issues`, `Agent`, `Wiki`, and `Actions`.
- The same hotspot also toggles the big-TV GitHub screensaver mode, which swaps the moving logo and shows matching quadrants on the big TV.
- Clicking the shelf object again while GitHub mode is active restores the normal DVD loop.

## Trigger Paths

### `/home/runner/work/Naimean_v3/Naimean_v3/public/assets/js/systems/hotspots.js`

- The GitHub shelf control always triggers `state._cb.triggerGithubCard?.()`.
- The same click then toggles GitHub screensaver mode on the big TV:
  - active -> `deactivateGithubScreensaverMode()` + restore DVD
  - inactive -> `activateGithubScreensaverMode()`

### `/home/runner/work/Naimean_v3/Naimean_v3/public/assets/js/cards/cardOrchestrator.js`

- `activateCard('github')` activates the left GitHub card without requiring auth.

## Code by File

### `/home/runner/work/Naimean_v3/Naimean_v3/public/assets/js/core/constants.js`

- Defines the four destination URLs:
  - `GITHUB_V3_ISSUES_URL`
  - `GITHUB_V3_AGENTS_URL`
  - `GITHUB_V3_WIKI_URL`
  - `GITHUB_V3_ACTIONS_URL`

### `/home/runner/work/Naimean_v3/Naimean_v3/public/assets/js/ui/overlays.js`

- Builds the left-monitor GitHub card as a four-button grid.
- Builds a mirrored `big-tv-github-quadrant-overlay` for GitHub screensaver mode.
- `activateGithubScreensaverMode()` runs the static transition, swaps the big-TV moving logo to the GitHub asset, resets quadrant active states, and syncs the shelf object image.
- `deactivateGithubScreensaverMode()` restores normal DVD/logo behavior.

### `/home/runner/work/Naimean_v3/Naimean_v3/public/assets/js/systems/leftMonitorCards.js`

- `showGithubCard()` activates the left card after the standard static pass.

### `/home/runner/work/Naimean_v3/Naimean_v3/public/assets/css/index.css`

- Styles both the left-monitor GitHub quadrants and the big-TV GitHub overlay, including the current GitHub-mode logo sizing used by recent sessions.

## Related Pages

- [Card Orchestrator](Card-Orchestrator.md)
- [Product Features](../README.md)
