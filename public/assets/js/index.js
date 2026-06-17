import { bootstrapApp } from './appRuntime.js';

/*
if (overlay.id === DISCORD_OVERLAY_ID) {
}
if (overlay.id === AQUARIUM_OVERLAY_ID) {
  nedryGateOverlayEl = document.createElement('div');
  el.appendChild(nedryGateOverlayEl);
}
if (BIG_TV_FULLSCREEN_OVERLAY_IDS.has(overlay.id)) {
}
*/

// Failsafe: force scene visibility after timeout if initialization fails
const FAILSAFE_TIMEOUT_MS = 5000;
let sceneRevealed = false;
let failsafeTimer = null;

function forceSceneVisible() {
  if (!sceneRevealed) {
    sceneRevealed = true;
    document.body.classList.remove('scene-loading');
    document.body.classList.add('scene-ready');
    console.warn('[Naimean] Failsafe triggered: forced scene visible after timeout');
  }
}

// Mark scene as revealed when it loads normally (register listener before starting timer)
window.addEventListener('naimean-scene-ready', () => {
  if (!sceneRevealed) {
    sceneRevealed = true;
    if (failsafeTimer) {
      clearTimeout(failsafeTimer);
      failsafeTimer = null;
    }
  }
}, { once: true });

// Set up failsafe timeout after listener is registered
failsafeTimer = setTimeout(forceSceneVisible, FAILSAFE_TIMEOUT_MS);

// Initialize app with error handling
try {
  bootstrapApp();
} catch (error) {
  console.error('[Naimean] Bootstrap error:', error);
  forceSceneVisible();
}
