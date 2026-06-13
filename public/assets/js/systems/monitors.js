import { COMMODORE_MONITOR_TURN_ON_MS, COMMODORE_NAV_SOURCE_DEN, COMMODORE_NAV_SOURCE_STORAGE_KEY, COMMODORE_POWER_STATE_STORAGE_KEY, COMMODORE_URL, DEFAULT_LEFT_MONITOR_STATE, MONITOR_POWER_CASCADE_MS } from '../core/constants.js';
import { state } from '../core/state.js';
import { waitForRightMonitorInteractive } from '../core/media.js';
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

function isBigTvMonitorInteractive() {
  return isMonitorPoweredOn(state.bigTvShadowOverlayEl);
}

function isLeftMonitorInteractive() {
  return isMonitorPoweredOn(state.leftMonitorShadowOverlayEl);
}

function isRightMonitorInteractive() {
  return isMonitorPoweredOn(state.rightMonitorShadowOverlayEl);
}

function hasActiveMonitorPowerState() {
  return [state.commodoreShadowOverlayEl, state.bigTvShadowOverlayEl, state.leftMonitorShadowOverlayEl, state.rightMonitorShadowOverlayEl]
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
      isLeftMonitorInteractive() &&
      isBigTvMonitorInteractive()
    ) {
      void state._cb.activateBigTvToolsMode?.();
    } else if (
      state.leftMonitorSelectedState === 'login' &&
      isLeftMonitorInteractive() &&
      isBigTvMonitorInteractive()
    ) {
      void state._cb.activateLoginMode?.();
    } else if (
      state.leftMonitorSelectedState === 'calendar' &&
      isLeftMonitorInteractive() &&
      isBigTvMonitorInteractive()
    ) {
      void state._cb.activateCalendarMode?.();
    }
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
  [state.leftMonitorShadowOverlayEl, state.rightMonitorShadowOverlayEl].forEach((el) => {
    if (!el) return;
    const delay = COMMODORE_MONITOR_TURN_ON_MS + Math.floor(Math.random() * MONITOR_POWER_CASCADE_MS);
    const id = window.setTimeout(() => animateMonitorShadowOn(el), delay);
    state.monitorPowerTimeoutIds.push(id);
  });
}

function hideAllMonitorShadows() {
  [state.commodoreShadowOverlayEl, state.bigTvShadowOverlayEl, state.leftMonitorShadowOverlayEl, state.rightMonitorShadowOverlayEl].forEach((el) => {
    if (!el) {
      return;
    }
    el.classList.remove('tv-turning-on', 'tv-turning-off');
    el.classList.add('is-monitor-on');
  });
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
state._cb.isBigTvMonitorInteractive = isBigTvMonitorInteractive;
state._cb.isRightMonitorInteractive = isRightMonitorInteractive;

export { loadCommodorePowerState, saveCommodorePowerState, syncStoredCommodorePowerState, handlePageShow, cancelMonitorPowerTimeouts, isMonitorPoweredOn, isBigTvMonitorInteractive, isLeftMonitorInteractive, isRightMonitorInteractive, hasActiveMonitorPowerState, reconcileCommodorePowerStateOnLoad, resetMonitorsToOffState, animateMonitorShadowOn, animateMonitorShadowOff, navigateToCommodoreFromDen, triggerCommodorePowerOnSequence, hideAllMonitorShadows, wakeRightMonitorForCornerScore };
