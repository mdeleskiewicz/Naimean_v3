# Power Cards

## User Experience

`power-on` and `power-off` are orchestrator card ids for the Commodore monitor power flow.

- They do not render a left-monitor card.
- They exist so room hotspots can use the same card-trigger vocabulary as the other features.
- The real on/off animation, delayed monitor wake-up, and persisted power state are still handled by the monitor system.

## Code by File

### `/home/runner/work/Naimean_v3/Naimean_v3/public/assets/js/cards/cardOrchestrator.js`

- `activateCard('power-on')` only calls `triggerCommodorePowerOnSequence()` when the room is currently off.
- `activateCard('power-off')` only calls the same power callback when the room is currently on.
- This makes the power card ids semantic wrappers over the existing Commodore power logic.

### `/home/runner/work/Naimean_v3/Naimean_v3/public/assets/js/systems/hotspots.js`

- The Commodore power hotspot now prefers `triggerPowerOnCard()` and falls back to the raw monitor callback if needed.

### `/home/runner/work/Naimean_v3/Naimean_v3/public/assets/js/systems/monitors.js`

- `triggerCommodorePowerOnSequence()` still owns the real behavior:
  - toggling `isCommodorePoweringOn`
  - saving room power state
  - cancelling pending wake timers on shutdown
  - animating shadow overlays
  - scheduling delayed left/right monitor wake-up on startup

## Related Pages

- [Commodore Power Button](../Commodore-Power-Button.md)
- [Card Orchestrator](Card-Orchestrator.md)
