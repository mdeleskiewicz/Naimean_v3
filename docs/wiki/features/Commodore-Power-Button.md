# Commodore Power Button

## User Experience

The user can click the small power button near the Commodore desk area to toggle the monitor system on or off.

- **Power on:** the button lights up and monitor wake sequences begin (including delayed left/right monitor activation).
- **Power off:** active monitor wake timers are cancelled and monitor shadow overlays animate off.
- The power state is persisted in session storage so page lifecycle events can restore behavior.

## Code by File

### `/home/runner/work/Naimean_v3/Naimean_v3/public/assets/js/core/constants.js`

```js
export const COMMODORE_POWER_BUTTON_OVERLAY_ID = 'overlay-commodore-power-button';
export const COMMODORE_POWER_BUTTON_CONTROL_ID = 'overlay-commodore-power-button-control';
export const COMMODORE_POWER_BUTTON_BOUNDS = Object.freeze({ x: 2143, y: 1637, w: 55, h: 39 });

HOTSPOT_READABLE_LABELS.set(COMMODORE_POWER_BUTTON_CONTROL_ID, 'Commodore Power Button');

export const OVERLAY_CONTROL_BINDINGS = [
  // ...
  { controlId: COMMODORE_POWER_BUTTON_CONTROL_ID, overlayId: COMMODORE_POWER_BUTTON_OVERLAY_ID },
  // ...
];

export const defaultHotspots = [
  // ...
  { id: COMMODORE_POWER_BUTTON_CONTROL_ID, ...COMMODORE_POWER_BUTTON_BOUNDS },
  // ...
];

export const overlayDefaults = [
  // ...
  { id: COMMODORE_POWER_BUTTON_OVERLAY_ID, ...COMMODORE_POWER_BUTTON_BOUNDS },
  // ...
];
```

### `/home/runner/work/Naimean_v3/Naimean_v3/public/assets/js/ui/overlays.js`

```js
if (overlay.id === COMMODORE_POWER_BUTTON_OVERLAY_ID) {
  el.classList.add('commodore-power-button-overlay');
  const buttonEl = document.createElement('button');
  buttonEl.type = 'button';
  buttonEl.className = 'commodore-power-button-button';
  buttonEl.setAttribute('aria-label', 'Power on Commodore monitors');
  if (state.isCommodorePoweringOn) {
    buttonEl.classList.add('on');
  }
  buttonEl.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    state._cb.triggerCommodorePowerOnSequence?.();
  });
  el.appendChild(buttonEl);
  state.commodorePowerButtonEl = buttonEl;
}
```

### `/home/runner/work/Naimean_v3/Naimean_v3/public/assets/js/systems/hotspots.js`

```js
el.addEventListener('click', (event) => {
  if (spot.id === COMMODORE_POWER_BUTTON_CONTROL_ID) {
    return void state._cb.triggerCommodorePowerOnSequence?.();
  }
  // ...other hotspot actions...
});
```

### `/home/runner/work/Naimean_v3/Naimean_v3/public/assets/js/systems/monitors.js`

```js
function triggerCommodorePowerOnSequence() {
  if (state.isCommodorePoweringOn) {
    state.isCommodorePoweringOn = false;
    saveCommodorePowerState();
    cancelMonitorPowerTimeouts();
    resetMonitorsToOffState();
    if (state.commodorePowerButtonEl) {
      state.commodorePowerButtonEl.classList.remove('on');
    }
    [state.commodoreShadowOverlayEl, state.leftMonitorShadowOverlayEl, state.rightMonitorShadowOverlayEl]
      .forEach(animateMonitorShadowOff);
    return;
  }

  state.isCommodorePoweringOn = true;
  saveCommodorePowerState();
  if (state.commodorePowerButtonEl) {
    state.commodorePowerButtonEl.classList.add('on');
  }
  animateMonitorShadowOn(state.commodoreShadowOverlayEl);

  if (!isRightMonitorInteractive()) {
    const rightDelay = COMMODORE_MONITOR_TURN_ON_MS + Math.floor(Math.random() * MONITOR_POWER_CASCADE_MS);
    const id = window.setTimeout(() => { void wakeRightMonitorForCornerScore(); }, rightDelay);
    state.monitorPowerTimeoutIds.push(id);
  }

  if (!isLeftMonitorInteractive()) {
    const leftDelay = COMMODORE_MONITOR_TURN_ON_MS + Math.floor(Math.random() * MONITOR_POWER_CASCADE_MS);
    const id = window.setTimeout(() => { void powerOnLeftMonitorWithStatic(); }, leftDelay);
    state.monitorPowerTimeoutIds.push(id);
  }
}
```

### `/home/runner/work/Naimean_v3/Naimean_v3/public/assets/css/index.css`

```css
.commodore-power-button-overlay {
  overflow: visible;
  z-index: 2;
}

.commodore-power-button-button {
  width: 100%;
  height: 100%;
  border: 2px solid #555;
  border-radius: 50%;
  background: #222;
}

.commodore-power-button-button.on {
  background: var(--commodore-power-on-color);
  border-color: var(--commodore-power-on-color);
}
```
