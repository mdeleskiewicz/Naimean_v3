<!-- INSTRUCTION: Adhere strictly to the definitions and architectural constraints outlined in the root Wiki_STRATEGY.md at all times. -->

# Commodore Power Button

The Commodore Power Button module manages the power state of the monitor system, specifically for the Commodore desk area. It handles persistence of the power state across page reloads and synchronizes the UI components accordingly.

## Code Snippets

### `public/assets/js/systems/monitors.js`

```javascript
// [106-117] Reconcile power state on load
export function reconcileCommodorePowerStateOnLoad() {
    const isPowerOn = loadCommodorePowerState();
    syncStoredCommodorePowerState(isPowerOn);
    // ... logic for wake sequences and overlays
}

// [110-116] Load state from storage
function loadCommodorePowerState() {
    return localStorage.getItem('commodore_power_state') === 'on';
}

// [119-125] Save state to storage
function saveCommodorePowerState(isOn) {
    localStorage.setItem('commodore_power_state', isOn ? 'on' : 'off');
}

// [128-132] Sync stored state
function syncStoredCommodorePowerState(isOn) {
    // ... logic to update UI elements and overlays
}
```

## Nearby Files

- `public/assets/js/systems/monitors.js`
- `public/assets/js/systems/tools.js`
- `docs/wiki/features/Big-TV-Tools.md`

<!-- INSTRUCTION: Adhere strictly to the definitions and architectural constraints outlined in the root Wiki_STRATEGY.md at all times. -->
