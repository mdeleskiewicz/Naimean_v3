import { API_TIMEOUT_MS, AQUARIUM_CLIP_CATALOG_API_URL, AQUARIUM_CLIP_SOURCE_GOOGLE_DRIVE, AQUARIUM_CLIP_SOURCE_LOCAL_FALLBACK, BIG_TV_DEBUG_WATERMARK_DEFAULT_TOP_PX, BIG_TV_DEBUG_WATERMARK_LETTERBOX_CLEARANCE_PX, BIG_TV_DEBUG_WATERMARK_MIN_TOP_MARGIN_PX, BIG_TV_DEBUG_WATERMARK_SERVER_ASSET, BIG_TV_DEBUG_WATERMARK_SHRIMP_CITY, DEFAULT_LEFT_MONITOR_STATE, NEDRY_GATE_VIDEO_URL } from '../core/constants.js';
import { state } from '../core/state.js';
import { wait, shuffleArrayInPlace } from '../core/utils.js';
import { waitForBigTvMonitorInteractive, waitForMediaPlaybackToEnd } from '../core/media.js';
import { isBigTvMonitorInteractive, triggerCommodorePowerOnSequence } from './monitors.js';
import { restoreBigTvDvdLoop } from './dvd.js';

function cancelAquariumPlaybackSequence() {
  state.aquariumSequenceToken += 1;
}

function isAquariumPlaybackSequenceActive() {
  return state.aquariumLoopOwnerToken !== 0 && state.aquariumLoopOwnerToken === state.aquariumSequenceToken;
}

function stopAquariumPlaybackSequence() {
  cancelAquariumPlaybackSequence();
  hideNedryGateOverlay();
  hideAquariumStaticOverlay();
  state.aquariumLoopOwnerToken = 0;
}

function replayAquariumPlaybackSequenceFromStatic() {
  if (!isAquariumPlaybackSequenceActive()) {
    return false;
  }
  cancelAquariumPlaybackSequence();
  hideNedryGateOverlay();
  hideAquariumStaticOverlay();
  state._cb.hideBigTvPromptOverlay?.({ clearInput: false });
  const sequenceToken = state.aquariumSequenceToken;
  state.aquariumLoopOwnerToken = sequenceToken;
  void runAquariumPlaybackSequence(sequenceToken, { startWithStatic: true });
  return true;
}

function interruptAquariumPlaybackSequence() {
  if (isAquariumPlaybackSequenceActive()) {
    stopAquariumPlaybackSequence();
  }
}

function recordAquariumClipInHistory(clipUrl) {
  if (state.aquariumHistoryPointer > 0) {
    state.aquariumClipHistory = state.aquariumClipHistory.slice(0, state.aquariumClipHistory.length - state.aquariumHistoryPointer);
    state.aquariumHistoryPointer = 0;
  }
  state.aquariumClipHistory.push(clipUrl);
  if (state.aquariumClipHistory.length > 50) {
    state.aquariumClipHistory.shift();
  }
}

function skipToAquariumClip(clipUrl, { recordInHistory = true } = {}) {
  if (!isAquariumPlaybackSequenceActive()) {
    return false;
  }
  cancelAquariumPlaybackSequence();
  hideNedryGateOverlay();
  hideAquariumStaticOverlay();
  state._cb.hideBigTvPromptOverlay?.({ clearInput: false });
  const sequenceToken = state.aquariumSequenceToken;
  state.aquariumLoopOwnerToken = sequenceToken;
  void runAquariumPlaybackSequence(sequenceToken, { startClipUrl: clipUrl, recordStartClip: recordInHistory });
  return true;
}

function skipAquariumToNextClip() {
  if (state.aquariumHistoryPointer > 0) {
    state.aquariumHistoryPointer -= 1;
    const targetUrl = state.aquariumClipHistory[state.aquariumClipHistory.length - 1 - state.aquariumHistoryPointer];
    if (targetUrl) {
      return skipToAquariumClip(targetUrl, { recordInHistory: false });
    }
    state.aquariumHistoryPointer = 0;
  }
  return skipToAquariumClip(null, { recordInHistory: true });
}

function skipAquariumToPreviousClip() {
  const targetPointer = state.aquariumHistoryPointer + 1;
  const targetUrl = state.aquariumClipHistory[state.aquariumClipHistory.length - 1 - targetPointer];
  if (!targetUrl) {
    return false;
  }
  state.aquariumHistoryPointer = targetPointer;
  return skipToAquariumClip(targetUrl, { recordInHistory: false });
}

function getRandomShrimpClipUrl() {
  if (state.aquariumShrimpClipQueue.length === 0) {
    state.aquariumShrimpClipQueue = [...aquariumShrimpClips];
    shuffleArrayInPlace(state.aquariumShrimpClipQueue);
  }
  return state.aquariumShrimpClipQueue.pop();
}

function getBigTvDebugWatermarkText() {
  return state.aquariumShrimpClipSource === AQUARIUM_CLIP_SOURCE_GOOGLE_DRIVE
    ? BIG_TV_DEBUG_WATERMARK_SHRIMP_CITY
    : BIG_TV_DEBUG_WATERMARK_SERVER_ASSET;
}

function syncBigTvDebugWatermark() {
  if (!state.bigTvDebugWatermarkEl) {
    return;
  }
  state.bigTvDebugWatermarkEl.textContent = getBigTvDebugWatermarkText();
  updateBigTvDebugWatermarkPlacement();
}

function updateBigTvDebugWatermarkPlacement() {
  if (!state.bigTvDebugWatermarkEl || !state.nedryGateOverlayEl || !state.nedryGateVideoEl) {
    return;
  }

  const overlayRect = state.nedryGateOverlayEl.getBoundingClientRect();
  const overlayWidth = overlayRect.width;
  const overlayHeight = overlayRect.height;
  const videoWidth = state.nedryGateVideoEl.videoWidth;
  const videoHeight = state.nedryGateVideoEl.videoHeight;

  if (
    overlayWidth <= 0 ||
    overlayHeight <= 0 ||
    !Number.isFinite(videoWidth) ||
    !Number.isFinite(videoHeight) ||
    videoWidth <= 0 ||
    videoHeight <= 0
  ) {
    state.bigTvDebugWatermarkEl.style.top = `${BIG_TV_DEBUG_WATERMARK_DEFAULT_TOP_PX}px`;
    return;
  }

  const fitScale = Math.min(overlayWidth / videoWidth, overlayHeight / videoHeight);
  const renderedVideoHeight = videoHeight * fitScale;
  const topLetterboxHeight = Math.max(0, (overlayHeight - renderedVideoHeight) / 2);
  const watermarkHeight = state.bigTvDebugWatermarkEl.offsetHeight || 12;
  const preferredTop = topLetterboxHeight - watermarkHeight - BIG_TV_DEBUG_WATERMARK_MIN_TOP_MARGIN_PX;
  const safeTop = topLetterboxHeight > watermarkHeight + BIG_TV_DEBUG_WATERMARK_LETTERBOX_CLEARANCE_PX
    ? Math.max(BIG_TV_DEBUG_WATERMARK_MIN_TOP_MARGIN_PX, Math.round(preferredTop))
    : BIG_TV_DEBUG_WATERMARK_DEFAULT_TOP_PX;
  state.bigTvDebugWatermarkEl.style.top = `${safeTop}px`;
}

async function loadAquariumShrimpClipCatalog() {
  try {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), API_TIMEOUT_MS);
    const response = await fetch(AQUARIUM_CLIP_CATALOG_API_URL, { method: 'GET', signal: controller.signal });
    window.clearTimeout(timeoutId);
    if (!response.ok) {
      return;
    }
    const payload = await response.json();
    const source = typeof payload?.source === 'string' ? payload.source : '';
    const clips = Array.isArray(payload?.clips)
      ? payload.clips.filter((clipUrl) => typeof clipUrl === 'string' && clipUrl.trim().length > 0)
      : [];
    state.aquariumShrimpClipSource = source === AQUARIUM_CLIP_SOURCE_GOOGLE_DRIVE
      ? AQUARIUM_CLIP_SOURCE_GOOGLE_DRIVE
      : AQUARIUM_CLIP_SOURCE_LOCAL_FALLBACK;
    syncBigTvDebugWatermark();
    if (clips.length > 0) {
      state.aquariumShrimpClips = clips;
      state.aquariumShrimpClipSet = new Set(clips);
      state.aquariumShrimpClipQueue = [];
    }
  } catch {
    // Keep local fallback clips.
  }
}

function hideAquariumStaticOverlay({ resetPlayback = true } = {}) {
  if (state.aquariumStaticOverlayEl) {
    state.aquariumStaticOverlayEl.classList.remove('is-active');
  }
  if (state.aquariumStaticVideoEl) {
    state.aquariumStaticVideoEl.pause();
    if (resetPlayback) {
      state.aquariumStaticVideoEl.currentTime = 0;
    }
  }
  state._cb.syncBigTvContentVisibility?.();
}

async function playRightMonitorStaticPass() {
  if (!state.rightMonitorStaticOverlayEl || !state.rightMonitorStaticVideoEl) {
    return false;
  }
  state.rightMonitorStaticVideoEl.pause();
  state.rightMonitorStaticVideoEl.loop = false;
  state.rightMonitorStaticVideoEl.currentTime = 0;
  state.rightMonitorStaticOverlayEl.classList.add('is-active');
  try {
    await state.rightMonitorStaticVideoEl.play();
  } catch (error) {
    if (error?.name !== 'AbortError') {
      console.warn('Unable to play right monitor static (corner score wake).', error);
    }
    state.rightMonitorStaticOverlayEl.classList.remove('is-active');
    state.rightMonitorStaticVideoEl.loop = true;
    return false;
  }
  const hasEnded = await waitForMediaPlaybackToEnd(state.rightMonitorStaticVideoEl);
  state.rightMonitorStaticOverlayEl.classList.remove('is-active');
  state.rightMonitorStaticVideoEl.loop = true;
  return hasEnded;
}

async function playAquariumStaticPass(sequenceToken) {
  if (!state.aquariumStaticOverlayEl || !state.aquariumStaticVideoEl) {
    return false;
  }
  state.aquariumStaticOverlayEl.classList.add('is-active');
  state.aquariumStaticVideoEl.currentTime = 0;
  state._cb.syncBigTvContentVisibility?.();
  try {
    await state.aquariumStaticVideoEl.play();
  } catch (error) {
    if (error?.name !== 'AbortError') {
      console.warn('Unable to play aquarium static overlay.', error);
    }
    return false;
  }
  const hasEnded = await waitForMediaPlaybackToEnd(state.aquariumStaticVideoEl);
  return hasEnded && sequenceToken === state.aquariumSequenceToken;
}

function setNedryGateVideoSource(sourceUrl) {
  if (!state.nedryGateVideoEl) {
    return;
  }
  if (state.nedryGateVideoEl.getAttribute('src') === sourceUrl) {
    return;
  }
  state.nedryGateVideoEl.setAttribute('src', sourceUrl);
  state.nedryGateVideoEl.src = sourceUrl;
  state.nedryGateVideoEl.load();
}

function hideNedryGateOverlay({ resetPlayback = true } = {}) {
  state._cb.hideBigTvPromptOverlay?.({ clearInput: false });
  if (state.nedryGateOverlayEl) {
    state.nedryGateOverlayEl.classList.remove('is-active');
  }
  if (state.nedryGateVideoEl) {
    state.nedryGateVideoEl.pause();
    if (resetPlayback) {
      state.nedryGateVideoEl.currentTime = 0;
    }
  }
  state._cb.syncBigTvContentVisibility?.();
}

async function playAquariumClipPass(sequenceToken, clipUrl) {
  if (!state.nedryGateOverlayEl || !state.nedryGateVideoEl) {
    return false;
  }
  const shrimpClipUrl = state.aquariumShrimpClipSet.has(clipUrl)
    ? clipUrl
    : getRandomShrimpClipUrl();
  setNedryGateVideoSource(shrimpClipUrl);
  state.nedryGateOverlayEl.classList.add('is-active');
  state.nedryGateVideoEl.currentTime = 0;
  state._cb.syncBigTvContentVisibility?.();
  try {
    await state.nedryGateVideoEl.play();
  } catch (error) {
    if (error?.name !== 'AbortError') {
      console.warn('Unable to play aquarium clip.', error);
    }
    hideNedryGateOverlay();
    setNedryGateVideoSource(shrimpClipUrl);
    return false;
  }
  const hasEnded = await waitForMediaPlaybackToEnd(state.nedryGateVideoEl);
  hideNedryGateOverlay();
  setNedryGateVideoSource(shrimpClipUrl);
  return hasEnded && sequenceToken === state.aquariumSequenceToken;
}

async function runAquariumPlaybackSequence(sequenceToken, { startWithStatic = false, startClipUrl = null, recordStartClip = true } = {}) {
  if (startWithStatic) {
    const staticEnded = await playAquariumStaticPass(sequenceToken);
    if (!staticEnded || sequenceToken !== state.aquariumSequenceToken) {
      hideAquariumStaticOverlay();
      if (state.aquariumLoopOwnerToken === sequenceToken) {
        state.aquariumLoopOwnerToken = 0;
      }
      return;
    }
  }

  let firstClip = true;
  while (sequenceToken === state.aquariumSequenceToken) {
    let clipUrl;
    if (firstClip && startClipUrl !== null) {
      clipUrl = startClipUrl;
      if (recordStartClip) {
        recordAquariumClipInHistory(clipUrl);
      }
    } else {
      clipUrl = getRandomShrimpClipUrl();
      recordAquariumClipInHistory(clipUrl);
    }
    firstClip = false;

    const clipEnded = await playAquariumClipPass(sequenceToken, clipUrl);
    if (!clipEnded || sequenceToken !== state.aquariumSequenceToken) {
      break;
    }

    const staticEnded = await playAquariumStaticPass(sequenceToken);
    if (!staticEnded || sequenceToken !== state.aquariumSequenceToken) {
      hideAquariumStaticOverlay();
      break;
    }
  }

  if (state.aquariumLoopOwnerToken === sequenceToken) {
    state.aquariumLoopOwnerToken = 0;
  }
}

function isRightMonitorShrimpLogoActive() {
  return state.rightMonitorShrimpLogoOverlayEl?.classList.contains('is-active') === true;
}

async function transitionAquariumToDvdCornerScoreFromRightMonitor() {
  if (!isRightMonitorShrimpLogoActive()) {
    return false;
  }
  cancelAquariumPlaybackSequence();
  const sequenceToken = state.aquariumSequenceToken;
  hideNedryGateOverlay();
  hideAquariumStaticOverlay();
  state._cb.hideBigTvPromptOverlay?.({ clearInput: false });
  state._cb.hideBigTvToolsOverlay?.();
  const staticEnded = await playAquariumStaticPass(sequenceToken);
  hideAquariumStaticOverlay();
  if (state.aquariumLoopOwnerToken === sequenceToken) {
    state.aquariumLoopOwnerToken = 0;
  }
  while (state.isRightMonitorAquariumSequenceRunning) {
    await wait(80);
  }
  restoreBigTvDvdLoop({ enableCornerScore: true });
  return staticEnded;
}

async function playRightMonitorAquariumSequence() {
  if (!state.rightMonitorStaticOverlayEl || !state.rightMonitorStaticVideoEl || !state.rightMonitorShrimpLogoOverlayEl) {
    return;
  }
  if (state.isRightMonitorAquariumSequenceRunning) {
    return;
  }
  state.isRightMonitorAquariumSequenceRunning = true;

  try {
    // Phase 1: play static.mp4 once (non-looping)
    state.rightMonitorStaticVideoEl.loop = false;
    state.rightMonitorStaticVideoEl.currentTime = 0;
    state.rightMonitorStaticOverlayEl.classList.add('is-active');
    try {
      await state.rightMonitorStaticVideoEl.play();
    } catch (error) {
      if (error?.name !== 'AbortError') {
        console.warn('Unable to play right monitor static (aquarium).', error);
      }
      state.rightMonitorStaticOverlayEl.classList.remove('is-active');
      state.rightMonitorStaticVideoEl.loop = true;
      state._cb.syncDiscordButtonUi?.();
      return;
    }
    const firstStaticEnded = await waitForMediaPlaybackToEnd(state.rightMonitorStaticVideoEl);
    state.rightMonitorStaticOverlayEl.classList.remove('is-active');
    if (!firstStaticEnded || state.aquariumLoopOwnerToken === 0) {
      state.rightMonitorStaticVideoEl.loop = true;
      state._cb.syncDiscordButtonUi?.();
      return;
    }

    // Phase 2: show shrimp logo while aquarium sequence runs (including replay-to-next transitions)
    state.rightMonitorShrimpLogoOverlayEl.classList.add('is-active');
    while (state.aquariumLoopOwnerToken !== 0) {
      await wait(100);
    }
    state.rightMonitorShrimpLogoOverlayEl.classList.remove('is-active');

    // Phase 3: on interruption, play static.mp4 once, then restore original button state
    state.rightMonitorStaticVideoEl.currentTime = 0;
    state.rightMonitorStaticOverlayEl.classList.add('is-active');
    try {
      await state.rightMonitorStaticVideoEl.play();
    } catch (error) {
      if (error?.name !== 'AbortError') {
        console.warn('Unable to play right monitor static (aquarium end).', error);
      }
      state.rightMonitorStaticOverlayEl.classList.remove('is-active');
      state.rightMonitorStaticVideoEl.loop = true;
      state._cb.syncDiscordButtonUi?.();
      return;
    }
    await waitForMediaPlaybackToEnd(state.rightMonitorStaticVideoEl);
    state.rightMonitorStaticOverlayEl.classList.remove('is-active');
    state.rightMonitorStaticVideoEl.loop = true;
    state._cb.syncDiscordButtonUi?.();
  } finally {
    state.rightMonitorShrimpLogoOverlayEl.classList.remove('is-active');
    state.isRightMonitorAquariumSequenceRunning = false;
  }
}

async function playAquariumHotspotSequence() {
  if (!isBigTvMonitorInteractive()) {
    if (!state.isCommodorePoweringOn) {
      triggerCommodorePowerOnSequence();
    }
    const isBigTvReady = await waitForBigTvMonitorInteractive();
    if (!isBigTvReady) {
      return;
    }
  }

  if (replayAquariumPlaybackSequenceFromStatic()) {
    return;
  }

  state.aquariumSequenceToken += 1;
  const sequenceToken = state.aquariumSequenceToken;
  state.aquariumLoopOwnerToken = sequenceToken;
  state._cb.hideBigTvToolsOverlay?.();
  hideNedryGateOverlay();
  hideAquariumStaticOverlay();
  state._cb.hideBigTvPromptOverlay?.({ clearInput: false });
  state._cb.setLeftMonitorState?.(DEFAULT_LEFT_MONITOR_STATE);
  state._cb.syncBigTvContentVisibility?.();
  if (!state.isRightMonitorAquariumSequenceRunning) {
    void playRightMonitorAquariumSequence();
  }
  await runAquariumPlaybackSequence(sequenceToken);
}

state._cb.stopAquariumPlaybackSequence = stopAquariumPlaybackSequence;
state._cb.playAquariumHotspotSequence = playAquariumHotspotSequence;
state._cb.hideAquariumStaticOverlay = hideAquariumStaticOverlay;
state._cb.hideNedryGateOverlay = hideNedryGateOverlay;
state._cb.transitionAquariumToDvdCornerScoreFromRightMonitor = transitionAquariumToDvdCornerScoreFromRightMonitor;
state._cb.skipAquariumToNextClip = skipAquariumToNextClip;
state._cb.skipAquariumToPreviousClip = skipAquariumToPreviousClip;
state._cb.isAquariumPlaybackSequenceActive = isAquariumPlaybackSequenceActive;
state._cb.replayAquariumPlaybackSequenceFromStatic = replayAquariumPlaybackSequenceFromStatic;
state._cb.isRightMonitorShrimpLogoActive = isRightMonitorShrimpLogoActive;
state._cb.setNedryGateVideoSource = setNedryGateVideoSource;
state._cb.syncBigTvDebugWatermark = syncBigTvDebugWatermark;
state._cb.updateBigTvDebugWatermarkPlacement = updateBigTvDebugWatermarkPlacement;

export { cancelAquariumPlaybackSequence, isAquariumPlaybackSequenceActive, stopAquariumPlaybackSequence, replayAquariumPlaybackSequenceFromStatic, interruptAquariumPlaybackSequence, recordAquariumClipInHistory, skipToAquariumClip, skipAquariumToNextClip, skipAquariumToPreviousClip, getRandomShrimpClipUrl, getBigTvDebugWatermarkText, syncBigTvDebugWatermark, updateBigTvDebugWatermarkPlacement, loadAquariumShrimpClipCatalog, hideAquariumStaticOverlay, playRightMonitorStaticPass, playAquariumStaticPass, setNedryGateVideoSource, hideNedryGateOverlay, playAquariumClipPass, runAquariumPlaybackSequence, isRightMonitorShrimpLogoActive, transitionAquariumToDvdCornerScoreFromRightMonitor, playRightMonitorAquariumSequence, playAquariumHotspotSequence };
