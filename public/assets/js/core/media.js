import { BIG_TV_MONITOR_INTERACTIVE_WAIT_TIMEOUT_MS, MEDIA_ENDED_PAUSE_TOLERANCE_S, MONITOR_INTERACTIVE_POLL_INTERVAL_MS } from './constants.js';
import { state } from './state.js';

function waitForMediaPlaybackToEnd(mediaEl) {
  return new Promise((resolve) => {
    let hasObservedProgress = false;
    let lastPlaybackTime = mediaEl.currentTime;
    let stalledFrameCount = 0;
    let rafId = 0;
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
    const onAbort = () => {
      cleanup();
      resolve(false);
    };
    const onTimeUpdate = () => {
      hasObservedProgress = true;
      lastPlaybackTime = mediaEl.currentTime;
      stalledFrameCount = 0;
    };
    const monitorPlaybackProgress = () => {
      if (mediaEl.ended || mediaEl.paused) {
        return;
      }
      if (mediaEl.currentTime > lastPlaybackTime + 0.01) {
        hasObservedProgress = true;
        lastPlaybackTime = mediaEl.currentTime;
        stalledFrameCount = 0;
      } else if (hasObservedProgress && mediaEl.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) {
        stalledFrameCount += 1;
        if (stalledFrameCount >= 180) {
          cleanup();
          resolve(false);
          return;
        }
      }
      rafId = window.requestAnimationFrame(monitorPlaybackProgress);
    };
    const cleanup = () => {
      mediaEl.removeEventListener('ended', onEnded);
      mediaEl.removeEventListener('error', onError);
      mediaEl.removeEventListener('pause', onPause);
      mediaEl.removeEventListener('abort', onAbort);
      mediaEl.removeEventListener('emptied', onAbort);
      mediaEl.removeEventListener('stalled', onAbort);
      mediaEl.removeEventListener('timeupdate', onTimeUpdate);
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
    };
    mediaEl.addEventListener('ended', onEnded);
    mediaEl.addEventListener('error', onError);
    mediaEl.addEventListener('pause', onPause);
    mediaEl.addEventListener('abort', onAbort);
    mediaEl.addEventListener('emptied', onAbort);
    mediaEl.addEventListener('stalled', onAbort);
    mediaEl.addEventListener('timeupdate', onTimeUpdate);
    rafId = window.requestAnimationFrame(monitorPlaybackProgress);
  });
}

function waitForRightMonitorInteractive(timeoutMs = BIG_TV_MONITOR_INTERACTIVE_WAIT_TIMEOUT_MS) {
  if (state._cb.isRightMonitorInteractive?.()) {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    const deadline = Date.now() + timeoutMs;
    const checkInteractiveState = () => {
      if (state._cb.isRightMonitorInteractive?.()) {
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

export { waitForMediaPlaybackToEnd, waitForRightMonitorInteractive };
