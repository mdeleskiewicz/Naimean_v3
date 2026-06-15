import { BIG_TV_MONITOR_INTERACTIVE_WAIT_TIMEOUT_MS, COMMODORE_MONITOR_TURN_ON_MS, COMMODORE_NAV_SOURCE_DEN, COMMODORE_NAV_SOURCE_STORAGE_KEY, COMMODORE_POWER_STATE_STORAGE_KEY, COMMODORE_URL, DEFAULT_LEFT_MONITOR_STATE, MONITOR_INTERACTIVE_POLL_INTERVAL_MS, MONITOR_POWER_CASCADE_MS } from '../core/constants.js';
import { state } from '../core/state.js';
import { waitForMediaPlaybackToEnd, waitForRightMonitorInteractive } from '../core/media.js';
import { playRightMonitorStaticPass } from './aquarium.js';

function loadCommodorePowerState() {
  try {
    return sessionStorage.getItem(COMMODORE_POWER_STATE_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function saveCommodorePowerState() {
  try {
    sessionStorage.setItem(COMMODORE_POWER_STATE_STORAGE_KEY, String(state.isCommodorePoweringOn));
  } catch (error) {
    console.warn('Unable to persist Commodore power state.', error);
  }
}

function syncStoredCommodorePowerState() {
  state.isCommodorePoweringOn = loadCommodorePowerState();
  reconcileCommodorePowerStateOnLoad();
  state.commodorePowerButtonEl?.classList.toggle('on', state.isCommodorePoweringOn);
  syncMiddleMonitorCornerScoreVisibility();
}

function handlePageShow() {
  syncStoredCommodorePowerState();
  state._cb.syncDvdScreensaverState?.();
}

function cancelMonitorPowerTimeouts() {
  state.monitorPowerTimeoutIds.forEach((id) => window.clearTimeout(id));
  state.monitorPowerTimeoutIds = [];
}

function isMonitorPoweredOn(shadowOverlayEl) {
  return !!shadowOverlayEl && shadowOverlayEl.classList.contains('is-monitor-on');
}

function isLeftMonitorInteractive() {
  return isMonitorPoweredOn(state.leftMonitorShadowOverlayEl);
}

function isCommodoreMonitorInteractive() {
  return isMonitorPoweredOn(state.commodoreShadowOverlayEl);
}

function isRightMonitorInteractive() {
  return isMonitorPoweredOn(state.rightMonitorShadowOverlayEl);
}

function syncMiddleMonitorCornerScoreVisibility() {
  if (!state.middleMonitorCornerScoreOverlayEl) {
    return;
  }
  const isVisible = isCommodoreMonitorInteractive();
  state.middleMonitorCornerScoreOverlayEl.classList.toggle('is-active', isVisible);
  state.middleMonitorCornerScoreOverlayEl.setAttribute('aria-hidden', isVisible ? 'false' : 'true');
}

function waitForCommodoreMonitorInteractive(timeoutMs = BIG_TV_MONITOR_INTERACTIVE_WAIT_TIMEOUT_MS) {
  if (isCommodoreMonitorInteractive()) {
    return Promise.resolve(true);
  }
  return new Promise((resolve) => {
    const deadline = Date.now() + timeoutMs;
    const checkInteractiveState = () => {
      if (isCommodoreMonitorInteractive()) {
        resolve(true);
        return;
      }
      if (Date.now() >= deadline) {
        resolve(false);
        return;
      }
      window.setTimeout(checkInteractiveState, MONITOR_INTERACTIVE_POLL_INTERVAL_MS);
    };
    checkInteractiveState();
  });
}

async function playMiddleMonitorStaticPass() {
  if (!state.middleMonitorStaticOverlayEl || !state.middleMonitorStaticVideoEl) {
    return false;
  }
  state.middleMonitorStaticVideoEl.pause();
  state.middleMonitorStaticVideoEl.loop = false;
  state.middleMonitorStaticVideoEl.currentTime = 0;
  state.middleMonitorStaticOverlayEl.classList.add('is-active');
  try {
    await state.middleMonitorStaticVideoEl.play();
  } catch (error) {
    if (error?.name !== 'AbortError') {
      console.warn('Unable to play middle monitor static (CornerScore server stats).', error);
    }
    state.middleMonitorStaticOverlayEl.classList.remove('is-active');
    state.middleMonitorStaticVideoEl.loop = true;
    return false;
  }
  const hasEnded = await waitForMediaPlaybackToEnd(state.middleMonitorStaticVideoEl);
  state.middleMonitorStaticOverlayEl.classList.remove('is-active');
  state.middleMonitorStaticVideoEl.loop = true;
  return hasEnded;
}

async function triggerMiddleMonitorCornerScoreStatsTransition() {
  if (!isCommodoreMonitorInteractive() || state.isMiddleMonitorCornerScoreStaticSequenceRunning) {
    syncMiddleMonitorCornerScoreVisibility();
    return false;
  }
  state.isMiddleMonitorCornerScoreStaticSequenceRunning = true;
  try {
    await playMiddleMonitorStaticPass();
    syncMiddleMonitorCornerScoreVisibility();
    return true;
  } finally {
    state.isMiddleMonitorCornerScoreStaticSequenceRunning = false;
  }
}

async function wakeMiddleMonitorForCornerScoreStats() {
  const isReady = await waitForCommodoreMonitorInteractive();
  if (!isReady) {
    console.warn('Middle monitor did not become interactive for CornerScore server stats.');
    return;
  }
  if (!state.isCommodorePoweringOn) {
    syncMiddleMonitorCornerScoreVisibility();
    return;
  }
  await triggerMiddleMonitorCornerScoreStatsTransition();
}

function hasActiveMonitorPowerState() {
  return [state.commodoreShadowOverlayEl, state.leftMonitorShadowOverlayEl, state.rightMonitorShadowOverlayEl]
    .some((el) =>
      !!el &&
      (
        el.classList.contains('is-monitor-on') ||
        el.classList.contains('tv-turning-on') ||
        el.classList.contains('tv-turning-off')
      )
    );
}

function reconcileCommodorePowerStateOnLoad() {
  if (hasActiveMonitorPowerState()) {
    return;
  }
  if (!state.isCommodorePoweringOn) {
    return;
  }
  state.isCommodorePoweringOn = false;
  saveCommodorePowerState();
  cancelMonitorPowerTimeouts();
  resetMonitorsToOffState();
}

function resetMonitorsToOffState() {
  state._cb.stopAquariumPlaybackSequence?.();
  state._cb.hideBigTvToolsOverlay?.();
  state._cb.hideLoginOverlay?.();
  state._cb.hideCalendarBigTvOverlay?.();
  state._cb.hideBigTvPromptOverlay?.();
  state._cb.hideNedryGateOverlay?.();
  state._cb.hideAquariumStaticOverlay?.();
  state._cb.stopZeldaSecretAudioPlayback?.();
  state._cb.stopBigTvDvdAnimation?.();
  state._cb.stopMonitorFlickerLoops?.();
  if (state.middleMonitorStaticOverlayEl) {
    state.middleMonitorStaticOverlayEl.classList.remove('is-active');
  }
  if (state.middleMonitorStaticVideoEl) {
    state.middleMonitorStaticVideoEl.pause();
    state.middleMonitorStaticVideoEl.currentTime = 0;
  }
  syncMiddleMonitorCornerScoreVisibility();
  if (state.rightMonitorShrimpLogoOverlayEl) {
    state.rightMonitorShrimpLogoOverlayEl.classList.remove('is-active');
  }
  state._cb.syncDiscordButtonUi?.();
  state._cb.setLeftMonitorState?.(DEFAULT_LEFT_MONITOR_STATE);
  if (state._cb.isBigTvFullscreenTarget?.(document.fullscreenElement)) {
    void state._cb.exitBigTvFullscreen?.();
  }
}

function animateMonitorShadowOn(el) {
  if (!el) return;
  if (el.classList.contains('is-monitor-on') && !el.classList.contains('tv-turning-off')) return;
  el.classList.remove('is-monitor-on', 'tv-turning-off', 'tv-turning-on');
  void el.offsetHeight;
  el.classList.add('tv-turning-on');
  el.addEventListener('animationend', () => {
    el.classList.remove('tv-turning-on');
    el.classList.add('is-monitor-on');
    if (
      state.leftMonitorSelectedState === 'tools' &&
      isLeftMonitorInteractive()
    ) {
      void state._cb.activateBigTvToolsMode?.();
    } else if (
      state.leftMonitorSelectedState === 'login' &&
      isLeftMonitorInteractive()
    ) {
      void state._cb.activateLoginMode?.();
    } else if (
      state.leftMonitorSelectedState === 'calendar' &&
      isLeftMonitorInteractive()
    ) {
      void state._cb.activateCalendarMode?.();
    }
    syncMiddleMonitorCornerScoreVisibility();
    state._cb.syncDvdScreensaverState?.();
  }, { once: true });
}

function animateMonitorShadowOff(el) {
  if (!el) return;
  el.classList.remove('tv-turning-on');
  el.classList.add('is-monitor-on');
  void el.offsetHeight;
  el.classList.remove('is-monitor-on');
  el.classList.add('tv-turning-off');
  el.addEventListener('animationend', () => {
    el.classList.remove('tv-turning-off');
    syncMiddleMonitorCornerScoreVisibility();
    state._cb.syncDvdScreensaverState?.();
  }, { once: true });
}

function navigateToCommodoreFromDen() {
  try {
    sessionStorage.setItem(COMMODORE_NAV_SOURCE_STORAGE_KEY, COMMODORE_NAV_SOURCE_DEN);
  } catch (error) {
    console.warn('Unable to persist Commodore navigation source.', error);
  }
  window.location.assign(COMMODORE_URL);
}

function waitForLeftMonitorInteractive(timeoutMs = BIG_TV_MONITOR_INTERACTIVE_WAIT_TIMEOUT_MS) {
  if (isLeftMonitorInteractive()) {
    return Promise.resolve(true);
  }
  return new Promise((resolve) => {
    const deadline = Date.now() + timeoutMs;
    const checkInteractiveState = () => {
      if (isLeftMonitorInteractive()) {
        resolve(true);
        return;
      }
      if (Date.now() >= deadline) {
        resolve(false);
        return;
      }
      window.setTimeout(checkInteractiveState, MONITOR_INTERACTIVE_POLL_INTERVAL_MS);
    };
    checkInteractiveState();
  });
}

async function powerOnLeftMonitorWithStatic() {
  if (isLeftMonitorInteractive()) return;
  animateMonitorShadowOn(state.leftMonitorShadowOverlayEl);
  const isReady = await waitForLeftMonitorInteractive();
  if (!isReady) {
    console.warn('Left monitor did not become interactive during power-on sequence.');
    return;
  }
  if (!state.isCommodorePoweringOn) return;
  await state._cb.activateLeftMonitorQuadrant?.('none');
}

function triggerCommodorePowerOnSequence() {
  if (state.isCommodorePoweringOn) {
    state.isCommodorePoweringOn = false;
    saveCommodorePowerState();
    cancelMonitorPowerTimeouts();
    resetMonitorsToOffState();
    if (state.commodorePowerButtonEl) {
      state.commodorePowerButtonEl.classList.remove('on');
    }
    [state.commodoreShadowOverlayEl, state.leftMonitorShadowOverlayEl, state.rightMonitorShadowOverlayEl].forEach(animateMonitorShadowOff);
    return;
  }
  state.isCommodorePoweringOn = true;
  saveCommodorePowerState();
  if (state.commodorePowerButtonEl) {
    state.commodorePowerButtonEl.classList.add('on');
  }
  animateMonitorShadowOn(state.commodoreShadowOverlayEl);
  void wakeMiddleMonitorForCornerScoreStats();

  // When corner score has been played, ensure the right monitor shows the scoreboard.
  if (state.isDvdCornerCountEnabled) {
    state.rightMonitorDisplayMode = 'corner-score';
  }

  // Right monitor: skip if already on, otherwise animate on and play static.
  if (!isRightMonitorInteractive()) {
    const rightDelay = COMMODORE_MONITOR_TURN_ON_MS + Math.floor(Math.random() * MONITOR_POWER_CASCADE_MS);
    const id = window.setTimeout(() => { void wakeRightMonitorForCornerScore(); }, rightDelay);
    state.monitorPowerTimeoutIds.push(id);
  }

  // Left monitor: skip if already on, otherwise animate on with static and show quadrant overlay.
  if (!isLeftMonitorInteractive()) {
    const leftDelay = COMMODORE_MONITOR_TURN_ON_MS + Math.floor(Math.random() * MONITOR_POWER_CASCADE_MS);
    const id = window.setTimeout(() => { void powerOnLeftMonitorWithStatic(); }, leftDelay);
    state.monitorPowerTimeoutIds.push(id);
  }
}

function hideAllMonitorShadows() {
  [state.commodoreShadowOverlayEl, state.leftMonitorShadowOverlayEl, state.rightMonitorShadowOverlayEl].forEach((el) => {
    if (!el) {
      return;
    }
    el.classList.remove('tv-turning-on', 'tv-turning-off');
    el.classList.add('is-monitor-on');
  });
  syncMiddleMonitorCornerScoreVisibility();
}

async function wakeRightMonitorForCornerScore() {
  if (isRightMonitorInteractive() || state.isRightMonitorCornerScoreWakeSequenceRunning) {
    return;
  }
  state.isRightMonitorCornerScoreWakeSequenceRunning = true;
  try {
    animateMonitorShadowOn(state.rightMonitorShadowOverlayEl);
    const isReady = await waitForRightMonitorInteractive();
    if (!isReady) {
      console.warn('Right monitor did not become interactive for corner score wake.');
      animateMonitorShadowOff(state.rightMonitorShadowOverlayEl);
      return;
    }
    await playRightMonitorStaticPass();
    state._cb.syncDvdScreensaverState?.();
  } finally {
    state.isRightMonitorCornerScoreWakeSequenceRunning = false;
  }
}

state._cb.triggerCommodorePowerOnSequence = triggerCommodorePowerOnSequence;
state._cb.isRightMonitorInteractive = isRightMonitorInteractive;
state._cb.triggerMiddleMonitorCornerScoreStatsTransition = triggerMiddleMonitorCornerScoreStatsTransition;
state._cb.syncMiddleMonitorCornerScoreVisibility = syncMiddleMonitorCornerScoreVisibility;

export { loadCommodorePowerState, saveCommodorePowerState, syncStoredCommodorePowerState, handlePageShow, cancelMonitorPowerTimeouts, isMonitorPoweredOn, isLeftMonitorInteractive, isCommodoreMonitorInteractive, isRightMonitorInteractive, hasActiveMonitorPowerState, reconcileCommodorePowerStateOnLoad, resetMonitorsToOffState, animateMonitorShadowOn, animateMonitorShadowOff, navigateToCommodoreFromDen, triggerCommodorePowerOnSequence, hideAllMonitorShadows, wakeRightMonitorForCornerScore, waitForLeftMonitorInteractive, waitForCommodoreMonitorInteractive, playMiddleMonitorStaticPass, triggerMiddleMonitorCornerScoreStatsTransition, powerOnLeftMonitorWithStatic };
