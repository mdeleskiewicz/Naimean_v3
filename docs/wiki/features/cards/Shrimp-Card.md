# Shrimp Card

## User Experience

The Shrimp card is paired with the aquarium feature set.

- Clicking the aquarium hotspot starts the aquarium playback sequence and activates the Shrimp card.
- Clicking the neon sign repopulates the aquarium creatures and also triggers the Shrimp card.
- When the right monitor is showing the shrimp-logo state, clicking that monitor opens the aquarium GUI and transitions the monitor back toward DVD/CornerScore behavior.
- The left-monitor Shrimp card is currently a dedicated surface with no embedded logo content; recent sessions removed the accidental inline shrimp-logo image.

## Trigger Paths

### `/home/runner/work/Naimean_v3/Naimean_v3/public/assets/js/systems/aquarium.js`

- `playAquariumHotspotSequence()` hides conflicting overlays, activates `LEFT_MONITOR_CARD_SHRIMP`, and starts the right-monitor aquarium sequence.

### `/home/runner/work/Naimean_v3/Naimean_v3/public/assets/js/systems/hotspots.js`

- Aquarium hotspot -> `playAquariumHotspotSequence()`.
- Neon sign -> `repopulateAquariumShrimp()` then `triggerShrimpCard()`.
- Right monitor control while the shrimp logo is active -> `window.naimeanAquariumWildlife?.openGui?.()` then `transitionAquariumToDvdCornerScoreFromRightMonitor()`.

### `/home/runner/work/Naimean_v3/Naimean_v3/public/assets/js/cards/cardOrchestrator.js`

- `activateCard('shrimp')` activates the left Shrimp card surface.

## Code by File

### `/home/runner/work/Naimean_v3/Naimean_v3/public/assets/js/ui/overlays.js`

- Creates `state.leftMonitorShrimpCardEl` as the dedicated Shrimp card container.
- Also owns the monitor static layers that make the aquarium/card handoff feel like a real display transition.

### `/home/runner/work/Naimean_v3/Naimean_v3/public/assets/js/systems/leftMonitorCards.js`

- `showShrimpCard()` is intentionally minimal; it only activates the card container after the left-monitor static transition.

### `/home/runner/work/Naimean_v3/Naimean_v3/public/assets/js/systems/aquarium.js`

- Owns the shrimp clip catalog, queueing, playback history, right-monitor sequence, and GUI/debug watermark integrations that surround the card.

### `/home/runner/work/Naimean_v3/Naimean_v3/test/aquarium.test.js`

- Verifies the neon-sign trigger path, aquarium sequence startup, and other playback behaviors tied to the Shrimp card.

## Related Pages

- [Card Orchestrator](Card-Orchestrator.md)
- [Hotspot Debug + Persistence](../Hotspot-Debug-and-Persistence.md)
