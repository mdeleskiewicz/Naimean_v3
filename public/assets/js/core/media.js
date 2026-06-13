import { BIG_TV_MONITOR_INTERACTIVE_WAIT_TIMEOUT_MS, MEDIA_ENDED_PAUSE_TOLERANCE_S, MONITOR_INTERACTIVE_POLL_INTERVAL_MS } from './constants.js';
import { state } from './state.js';

function isMonitorPoweredOn(shadowOverlayEl) {
  return !!shadowOverlayEl && shadowOverlayEl.classList.contains('is-monitor-on');
}

function isBigTvMonitorInteractive() {
  return isMonitorPoweredOn(state.bigTvShadowOverlayEl);
}

function isRightMonitorInteractive() {
  return isMonitorPoweredOn(state.rightMonitorShadowOverlayEl);
}

function waitForMediaPlaybackToEnd(mediaEl) {
  return new Promise((resolve) => {
    const onEnded = () => {
      cleanup();
      resolve(true);
    };
    const onError = () => {
      cleanup();
      resolve(false);
    };
    const onPause = () => {
      if (mediaEl.ended) {
        return;
      }
      // On iOS, native fullscreen exit fires 'pause' before 'ended' when a clip
      // finishes. If the playhead is at (or within the tolerance of) the end of
      // the duration, don't break the sequence — let the 'ended' event resolve it.
      const dur = mediaEl.duration;
      if (Number.isFinite(dur) && dur > 0 && mediaEl.currentTime >= dur - MEDIA_ENDED_PAUSE_TOLERANCE_S) {
        return;
      }
      cleanup();
      resolve(false);
    };
    const cleanup = () => {
      mediaEl.removeEventListener('ended', onEnded);
      mediaEl.removeEventListener('error', onError);
      mediaEl.removeEventListener('pause', onPause);
    };
    mediaEl.addEventListener('ended', onEnded);
    mediaEl.addEventListener('error', onError);
    mediaEl.addEventListener('pause', onPause);
  });
}

function waitForBigTvMonitorInteractive(timeoutMs = BIG_TV_MONITOR_INTERACTIVE_WAIT_TIMEOUT_MS) {
  if (isBigTvMonitorInteractive()) {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    const deadline = Date.now() + timeoutMs;
    const checkInteractiveState = () => {
      if (isBigTvMonitorInteractive()) {
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

function waitForRightMonitorInteractive(timeoutMs = BIG_TV_MONITOR_INTERACTIVE_WAIT_TIMEOUT_MS) {
  if (isRightMonitorInteractive()) {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    const deadline = Date.now() + timeoutMs;
    const checkInteractiveState = () => {
      if (isRightMonitorInteractive()) {
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

export { waitForMediaPlaybackToEnd, waitForBigTvMonitorInteractive, waitForRightMonitorInteractive };
