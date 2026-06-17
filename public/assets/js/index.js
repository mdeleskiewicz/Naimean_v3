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

function forceSceneVisible() {
  if (!sceneRevealed) {
    sceneRevealed = true;
    document.body.classList.remove('scene-loading');
    document.body.classList.add('scene-ready');
    console.warn('[Naimean] Failsafe triggered: forced scene visible after timeout');
  }
}

// Set up failsafe timeout
const failsafeTimer = setTimeout(forceSceneVisible, FAILSAFE_TIMEOUT_MS);

// Mark scene as revealed when it loads normally
window.addEventListener('naimean-scene-ready', () => {
  if (!sceneRevealed) {
    sceneRevealed = true;
    clearTimeout(failsafeTimer);
  }
}, { once: true });

// Initialize app with error handling
try {
  bootstrapApp();
} catch (error) {
  console.error('[Naimean] Bootstrap error:', error);
  clearTimeout(failsafeTimer);
  forceSceneVisible();
}
