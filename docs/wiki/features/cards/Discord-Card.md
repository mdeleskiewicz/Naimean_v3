# Discord Card

## User Experience

The Discord card is the unauthenticated entry point for the room's Discord flow.

- Clicking the Discord join control while signed out triggers the Discord card.
- The right monitor is kept in `join-discord` mode so the blue Discord art remains in sync with the login flow.
- The visible sign-in experience is still driven mostly by the big-TV prompt/login surfaces; the left-monitor Discord card currently acts as the reserved card surface for that state.

## Trigger Paths

### `/home/runner/work/Naimean_v3/Naimean_v3/public/assets/js/systems/login.js`

- `handleDiscordJoinButtonAction()` is the main branch:
  - authenticated users go to `triggerLoggedInCard()`
  - unauthenticated users go to `triggerDiscordCard()` and also activate the big-TV prompt mode

### `/home/runner/work/Naimean_v3/Naimean_v3/public/assets/js/cards/cardOrchestrator.js`

- `activateCard('discord')` activates the left Discord card and forces `rightMonitorDisplayMode = 'join-discord'`.

## Code by File

### `/home/runner/work/Naimean_v3/Naimean_v3/public/assets/js/ui/overlays.js`

- Creates `state.leftMonitorDiscordCardEl` as a dedicated card container in the left monitor stack.
- Leaves the detailed Discord widget/join-button rendering to the broader login and big-TV overlay systems.

### `/home/runner/work/Naimean_v3/Naimean_v3/public/assets/js/systems/leftMonitorCards.js`

- `showDiscordCard()` simply activates the dedicated card element after the static transition.
- `hideAllLeftMonitorCardOverlays()` ensures any previous card or legacy overlay is hidden before Discord becomes active.

### `/home/runner/work/Naimean_v3/Naimean_v3/public/assets/js/systems/login.js`

- Fetches auth state from `/api/discord/me`.
- Updates the join button, session chip, and login overlay based on authentication.
- Redirects unauthenticated gated actions to `/api/discord/auth` through `ensureDiscordAuthForQuadrantAction()`.

## Related Pages

- [Discord Auth + Protected Pages](../Discord-Auth-and-Protected-Pages.md)
- [Logged-In Card](Logged-In-Card.md)
