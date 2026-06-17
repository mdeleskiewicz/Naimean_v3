# Logged-In Card

## User Experience

The logged-in card is the authenticated version of the Discord entry flow.

- Clicking the Discord control while already authenticated opens the logged-in card instead of the sign-in flow.
- The card exposes four quadrants:
  - `Tools`
  - `Inventory`
  - `Cal.Dot`
  - `Notes`
- The user must pass the Discord auth check before the card can be shown.
- The right monitor is returned to `join-discord` mode so the room keeps the Discord visual state even after login succeeds.

## Trigger Paths

### `/home/runner/work/Naimean_v3/Naimean_v3/public/assets/js/systems/login.js`

- `handleDiscordJoinButtonAction()` sends authenticated users to `triggerLoggedInCard()`.
- `ensureDiscordAuthForQuadrantAction()` is the reusable gate used by the logged-in card and other protected interactions.

### `/home/runner/work/Naimean_v3/Naimean_v3/public/assets/js/cards/cardOrchestrator.js`

- `activateCard('logged-in')` re-checks authentication before activating the card.
- Failed auth exits early and redirects the user into the Discord OAuth route.

## Code by File

### `/home/runner/work/Naimean_v3/Naimean_v3/public/assets/js/ui/overlays.js`

- Builds the card as a four-button grid.
- Current quadrant actions are:
  - `Tools` -> `setLeftMonitorState('tools')`
  - `Inventory` -> placeholder `console.log('Inventory clicked')`
  - `Cal.Dot` -> `setLeftMonitorState('calendar')`
  - `Notes` -> opens `/notes.html` in a new tab

### `/home/runner/work/Naimean_v3/Naimean_v3/public/assets/js/systems/leftMonitorCards.js`

- `triggerLoggedInCard()` awaits `ensureDiscordAuthForQuadrantAction()` before calling `activateLeftMonitorCard(LEFT_MONITOR_CARD_LOGGED_IN)`.
- `showLoggedInCard()` activates the card surface once the transition finishes.

### `/home/runner/work/Naimean_v3/Naimean_v3/src/worker.js`

- Protects `/notes`, `/notes.html`, `/mame-gui`, `/mame-gui.html`, `/calendar`, and `/calendar.html` behind Discord session auth.
- That protection matches the card's role as an authenticated navigation surface rather than a public shortcut.

## Related Pages

- [Discord Auth + Protected Pages](../Discord-Auth-and-Protected-Pages.md)
- [Discord Card](Discord-Card.md)
