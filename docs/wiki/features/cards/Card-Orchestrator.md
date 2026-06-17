# Card Orchestrator

## User Experience

The card orchestrator is the shared control layer for card-based interactions in `/den`.

- Left-monitor card changes always go through one callback path.
- Card triggers can also switch right-monitor content, enforce Discord auth, or proxy Commodore power.
- Hotspots and other systems do not need to know the full monitor choreography; they call a card trigger and the orchestrator handles the rest.

## Code by File

### `/home/runner/work/Naimean_v3/Naimean_v3/public/assets/js/appRuntime.js`

- Imports `./cards/cardOrchestrator.js` during runtime bootstrap so the shared card callbacks are registered before room interactions start.

### `/home/runner/work/Naimean_v3/Naimean_v3/public/assets/js/cards/cardOrchestrator.js`

- Declares the runtime card ids: `shrimp`, `cornerscore`, `github`, `discord`, `power-on`, `power-off`, and `logged-in`.
- `activateCard(cardId)` is the main switchboard:
  - `cornerscore` activates the left CornerScore card and the right-monitor CornerScore overlay.
  - `discord` activates the left Discord card and resets the right monitor to `join-discord` mode.
  - `github` activates the left GitHub card.
  - `shrimp` activates the left Shrimp card.
  - `logged-in` requires `ensureDiscordAuthForQuadrantAction()` before showing the logged-in card and restoring `join-discord` mode.
  - `power-on` and `power-off` proxy to `triggerCommodorePowerOnSequence()` based on `state.isCommodorePoweringOn`.
- Registers `state._cb.activateCard` plus all `state._cb.trigger*Card` helpers used elsewhere in the app.

### `/home/runner/work/Naimean_v3/Naimean_v3/public/assets/js/systems/hotspots.js`

- Uses the orchestrator-facing callbacks instead of wiring room hotspots directly to left-monitor-only behavior.
- Notable examples:
  - Commodore power hotspot -> `triggerPowerOnCard`
  - Whiteboard score hotspot -> `triggerCornerScoreCard`
  - Neon sign -> `triggerShrimpCard`
  - GitHub shelf object -> `triggerGithubCard`

### `/home/runner/work/Naimean_v3/Naimean_v3/public/assets/js/core/state.js`

- Stores the shared card/monitor state the orchestrator reads and mutates, including `leftMonitorActiveCard`, `rightMonitorDisplayMode`, and `isCommodorePoweringOn`.

## Scope Notes

The orchestrator currently centralizes trigger routing, but the detailed rendering still lives in feature-specific systems such as `leftMonitorCards.js`, `login.js`, `aquarium.js`, `dvd.js`, and `ui/overlays.js`.
