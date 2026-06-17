# Card System

The last 20 recent sessions clustered around the card-driven room behaviors in `/den`: shrimp/aquarium playback, CornerScore, GitHub mode, Discord/login flow, and Commodore monitor power. This section turns that work into feature-level wiki pages for each implemented card flow.

## Implemented card ids

- `cornerscore`
- `discord`
- `github`
- `logged-in`
- `shrimp`
- `power-on`
- `power-off`

The left-monitor cards are declared in `/home/runner/work/Naimean_v3/Naimean_v3/public/assets/js/core/constants.js`, their active DOM references live in `/home/runner/work/Naimean_v3/Naimean_v3/public/assets/js/core/state.js`, and the shared activation path is centralized in `/home/runner/work/Naimean_v3/Naimean_v3/public/assets/js/cards/cardOrchestrator.js`.

## Pages

1. [Card Orchestrator](Card-Orchestrator.md)
2. [CornerScore Card](CornerScore-Card.md)
3. [Discord Card](Discord-Card.md)
4. [GitHub Card](GitHub-Card.md)
5. [Logged-In Card](Logged-In-Card.md)
6. [Shrimp Card](Shrimp-Card.md)
7. [Power Cards](Power-Cards.md)

## Shared file map

### `/home/runner/work/Naimean_v3/Naimean_v3/public/assets/js/appRuntime.js`

- Loads `./cards/cardOrchestrator.js` during the den bootstrap so card callbacks are available to hotspots and feature systems.

### `/home/runner/work/Naimean_v3/Naimean_v3/public/assets/js/cards/cardOrchestrator.js`

- Defines the canonical card ids used by runtime triggers.
- Routes each card id to the left monitor, right monitor, auth flow, or Commodore power callback.
- Registers `state._cb.trigger*Card` helpers used by the rest of the app.

### `/home/runner/work/Naimean_v3/Naimean_v3/public/assets/js/systems/leftMonitorCards.js`

- Plays the left-monitor static transition between cards.
- Hides legacy monitor overlays before showing a card.
- Owns the CornerScore metric hydration for the only data-rich left-monitor card.

### `/home/runner/work/Naimean_v3/Naimean_v3/public/assets/js/ui/overlays.js`

- Creates the left-monitor card DOM.
- Creates the mirrored GitHub quadrant UI for the big TV.
- Keeps the card surfaces aligned with the monitor frame geometry.

### `/home/runner/work/Naimean_v3/Naimean_v3/public/assets/css/index.css`

- Styles the card overlays, quadrant layouts, and monitor-fit behavior.

### `/home/runner/work/Naimean_v3/Naimean_v3/public/assets/js/systems/hotspots.js`

- Connects real room hotspots to the card triggers.
- Couples card activation to aquarium playback, GitHub mode, whiteboard scoring, and the Commodore power button.
