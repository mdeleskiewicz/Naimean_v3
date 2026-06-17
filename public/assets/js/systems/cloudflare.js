import {
  CLOUDFLARE_SCREENSAVER_LOGO_URL,
  CLOUDFLARE_DASHBOARD_URL,
  DEN_CARD_MODE_STORAGE_KEY
} from '../core/constants.js';
import { state } from '../core/state.js';

const CARD_MODE_CLOUDFLARE = 'cloudflare';

// ─── Persistence ─────────────────────────────────────────────────────────────

function saveCloudflareCardState() {
  try {
    if (state.isCloudflareCardMode) {
      localStorage.setItem(DEN_CARD_MODE_STORAGE_KEY, CARD_MODE_CLOUDFLARE);
    } else {
      const current = localStorage.getItem(DEN_CARD_MODE_STORAGE_KEY);
      if (current === CARD_MODE_CLOUDFLARE) {
        localStorage.removeItem(DEN_CARD_MODE_STORAGE_KEY);
      }
    }
  } catch {
    // localStorage may be unavailable
  }
}

function loadCloudflareCardState() {
  try {
    return localStorage.getItem(DEN_CARD_MODE_STORAGE_KEY) === CARD_MODE_CLOUDFLARE;
  } catch {
    return false;
  }
}

// ─── Middle Monitor Video Loop ────────────────────────────────────────────────

/**
 * Start the CloudFlare video loop on the middle monitor.
 * Pattern: CF video → static → CF video → static → …
 */
function startCloudflareVideoLoop() {
  state.isMiddleMonitorCloudflareLoopRunning = true;
  state.cloudflareCardSequenceToken += 1;
  const token = state.cloudflareCardSequenceToken;
  void runCloudflareVideoLoopStep(token);
}

async function runCloudflareVideoLoopStep(token) {
  if (!state.isMiddleMonitorCloudflareLoopRunning) return;
  if (token !== state.cloudflareCardSequenceToken) return;

  const cfVideo = state.middleMonitorCloudflareVideoEl;
  const staticVideo = state.middleMonitorCloudflareStaticVideoEl;

  if (!cfVideo || !staticVideo) return;

  // Play CloudFlare video (once, not looping)
  cfVideo.style.display = '';
  staticVideo.style.display = 'none';
  cfVideo.currentTime = 0;
  try {
    await cfVideo.play();
  } catch {
    // Autoplay blocked or video missing — retry after a delay
    await waitMs(3000);
    if (state.isMiddleMonitorCloudflareLoopRunning && token === state.cloudflareCardSequenceToken) {
      void runCloudflareVideoLoopStep(token);
    }
    return;
  }

  // Wait for CF video to end
  await waitForVideoEnd(cfVideo, token, () => state.cloudflareCardSequenceToken);
  if (!state.isMiddleMonitorCloudflareLoopRunning || token !== state.cloudflareCardSequenceToken) return;
  cfVideo.pause();

  // Play static interlude (once)
  cfVideo.style.display = 'none';
  staticVideo.style.display = '';
  staticVideo.currentTime = 0;
  try {
    await staticVideo.play();
  } catch {
    // Skip static on error, jump back to CF video
    staticVideo.style.display = 'none';
    if (state.isMiddleMonitorCloudflareLoopRunning && token === state.cloudflareCardSequenceToken) {
      void runCloudflareVideoLoopStep(token);
    }
    return;
  }

  await waitForVideoEnd(staticVideo, token, () => state.cloudflareCardSequenceToken);
  if (!state.isMiddleMonitorCloudflareLoopRunning || token !== state.cloudflareCardSequenceToken) return;
  staticVideo.pause();

  // Loop
  void runCloudflareVideoLoopStep(token);
}

function waitForVideoEnd(videoEl, token, getToken) {
  return new Promise((resolve) => {
    const onEnded = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      resolve();
    };
    const cleanup = () => {
      videoEl.removeEventListener('ended', onEnded);
      videoEl.removeEventListener('error', onError);
    };
    videoEl.addEventListener('ended', onEnded, { once: true });
    videoEl.addEventListener('error', onError, { once: true });
    // Also resolve if sequence token changes
    const poll = () => {
      if (token !== getToken()) {
        cleanup();
        resolve();
        return;
      }
      if (videoEl.ended || videoEl.paused) {
        // already ended/paused — check next frame
      }
      window.requestAnimationFrame(poll);
    };
    window.requestAnimationFrame(poll);
  });
}

function waitMs(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function stopCloudflareVideoLoop() {
  state.isMiddleMonitorCloudflareLoopRunning = false;
  state.cloudflareCardSequenceToken += 1;
  const cfVideo = state.middleMonitorCloudflareVideoEl;
  const staticVideo = state.middleMonitorCloudflareStaticVideoEl;
  if (cfVideo) {
    cfVideo.pause();
    cfVideo.style.display = 'none';
  }
  if (staticVideo) {
    staticVideo.pause();
    staticVideo.style.display = 'none';
  }
}

// ─── Overlay Sync ─────────────────────────────────────────────────────────────

/**
 * Sync the right monitor overlays for CloudFlare card mode.
 * When GitHub mode is active (CF icon should be visible on right monitor) and
 * CF card mode is NOT active: show CF icon, hide cornerscore gamepiece.
 * When CF card mode IS active: show cornerscore gamepiece, hide CF icon.
 * When GitHub mode is NOT active: hide both.
 */
function syncCloudflareRightMonitorOverlays() {
  const showCfIcon = state.isGithubScreensaverMode && !state.isCloudflareCardMode;
  const showCornerpiece = state.isCloudflareCardMode;

  if (state.rightMonitorCloudflareIconOverlayEl) {
    state.rightMonitorCloudflareIconOverlayEl.classList.toggle('is-active', showCfIcon);
    state.rightMonitorCloudflareIconOverlayEl.setAttribute('aria-hidden', showCfIcon ? 'false' : 'true');
  }
  if (state.rightMonitorCornerpieceOverlayEl) {
    state.rightMonitorCornerpieceOverlayEl.classList.toggle('is-active', showCornerpiece);
    state.rightMonitorCornerpieceOverlayEl.setAttribute('aria-hidden', showCornerpiece ? 'false' : 'true');
  }
}

/**
 * Sync middle monitor CloudFlare overlay visibility.
 */
function syncCloudflareMiddleMonitorOverlay() {
  if (state.middleMonitorCloudflareOverlayEl) {
    state.middleMonitorCloudflareOverlayEl.classList.toggle('is-active', state.isCloudflareCardMode);
    state.middleMonitorCloudflareOverlayEl.setAttribute('aria-hidden', state.isCloudflareCardMode ? 'false' : 'true');
  }
}

// ─── Activate / Deactivate ───────────────────────────────────────────────────

function activateCloudflareCardMode() {
  if (state.isCloudflareCardMode) return;
  state.isCloudflareCardMode = true;

  // Big TV: ensure CornerScore is playing with CF icon as gamepiece
  if (state.bigTvDvdLogoEl) {
    state.bigTvDvdLogoEl.src = CLOUDFLARE_SCREENSAVER_LOGO_URL;
    state.bigTvDvdLogoEl.classList.add('is-github-mode-logo');
  }
  state._cb.restoreBigTvDvdLoop?.({ enableCornerScore: true });

  // Left monitor: trigger CF card
  state._cb.triggerCloudflareCard?.();

  // Right monitor: show cornerscore gamepiece, hide CF icon
  syncCloudflareRightMonitorOverlays();

  // Middle monitor: show CF video loop
  syncCloudflareMiddleMonitorOverlay();
  startCloudflareVideoLoop();

  // Persist
  saveCloudflareCardState();
}

function deactivateCloudflareCardMode() {
  if (!state.isCloudflareCardMode) return;
  state.isCloudflareCardMode = false;

  // Big TV: restore DVD logo to GitHub icon (still in GitHub mode) or default
  if (state.isGithubScreensaverMode) {
    state._cb.restoreGithubDvdLogo?.();
  } else {
    state._cb.restoreDefaultDvdLogo?.();
  }

  // Left monitor: reset card
  state._cb.resetLeftMonitorCard?.();

  // Right monitor: sync overlays
  syncCloudflareRightMonitorOverlays();

  // Middle monitor: stop video loop
  stopCloudflareVideoLoop();
  syncCloudflareMiddleMonitorOverlay();

  // Persist
  saveCloudflareCardState();
}

function openCloudflareDashboard() {
  window.open(CLOUDFLARE_DASHBOARD_URL, '_blank', 'noopener,noreferrer');
}

function isCloudflareCardModeActive() {
  return state.isCloudflareCardMode;
}

// Register callbacks
state._cb.activateCloudflareCardMode = activateCloudflareCardMode;
state._cb.deactivateCloudflareCardMode = deactivateCloudflareCardMode;
state._cb.syncCloudflareRightMonitorOverlays = syncCloudflareRightMonitorOverlays;
state._cb.openCloudflareDashboard = openCloudflareDashboard;
state._cb.isCloudflareCardModeActive = isCloudflareCardModeActive;
state._cb.loadCloudflareCardState = loadCloudflareCardState;
state._cb.startCloudflareVideoLoop = startCloudflareVideoLoop;
state._cb.stopCloudflareVideoLoop = stopCloudflareVideoLoop;
state._cb.restoreCloudflareCardState = function restoreCloudflareCardState() {
  if (!loadCloudflareCardState()) return;
  // CF card mode requires GitHub mode to be active. Use the silent version to
  // restore GitHub mode state without playing transition animations.
  state._cb.silentActivateGithubScreensaverMode?.();
  activateCloudflareCardMode();
};

export {
  activateCloudflareCardMode,
  deactivateCloudflareCardMode,
  syncCloudflareRightMonitorOverlays,
  openCloudflareDashboard,
  isCloudflareCardModeActive,
  loadCloudflareCardState,
  startCloudflareVideoLoop,
  stopCloudflareVideoLoop
};