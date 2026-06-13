import { BIG_TV_RIGHT_MONITOR_OVERLAY_BLUE_IMAGE_URL, BIG_TV_RIGHT_MONITOR_OVERLAY_CORNER_SCORE_IMAGE_URL, BIG_TV_RIGHT_MONITOR_OVERLAY_CORNER_SCORE_STATE, BIG_TV_RIGHT_MONITOR_OVERLAY_STATE_UNKNOWN, CORNER_SCORE_SERVER_BASELINE, DEFAULT_BIG_TV_RIGHT_MONITOR_OVERLAY_STATE, DEFAULT_LEFT_MONITOR_STATE, DVD_BOUNCE_SPEED_PX_PER_SECOND, DVD_COLOR_STEPS, DVD_CORNER_GOAL_TOLERANCE_PX, DVD_CORNER_MISS_MAX_TOLERANCE_PX, DVD_CORNER_MISS_MIN_TOLERANCE_PX, DVD_FRAME_DELTA_MAX_SECONDS, DVD_SPEED_ADJUSTMENT_STEP, DVD_SPEED_MULTIPLIER_MAX, DVD_SPEED_MULTIPLIER_MIN } from '../core/constants.js';
import { state } from '../core/state.js';
import { clamp } from '../core/utils.js';
import { activateRightMonitorCornerScoreMode, hideAllDvdMissIndicators, playRightMonitorScoringNoise, queueCornerScoreUpdate, setCornerScore, setCornerScoreHighScore, showCornerScoreInitialsPrompt, showCornerScoreStatus } from './cornerScore.js';
import { isRightMonitorInteractive, wakeRightMonitorForCornerScore } from './monitors.js';

function hasActiveBigTvContentOverlay() {
  const aquariumActive = state.aquariumStaticOverlayEl?.classList.contains('is-active');
  const nedryGateActive = state.nedryGateOverlayEl?.classList.contains('is-active');
  const promptActive = state.isBigTvPromptActive;
  const toolsActive = state.isBigTvToolsActive;
  const loginActive = state.isLoginActive;
  const calendarActive = state.isCalendarBigTvActive;
  return aquariumActive || nedryGateActive || promptActive || toolsActive || loginActive || calendarActive;
}

function getCurrentRightMonitorOverlayState() {
  const currentImageUrl =
    state.discordButtonImgEl?.getAttribute('src') ||
    state.rightMonitorOverlayImageUrl;
  if (currentImageUrl.includes(BIG_TV_RIGHT_MONITOR_OVERLAY_BLUE_IMAGE_URL)) {
    return DEFAULT_BIG_TV_RIGHT_MONITOR_OVERLAY_STATE;
  }
  if (currentImageUrl.includes(BIG_TV_RIGHT_MONITOR_OVERLAY_CORNER_SCORE_IMAGE_URL)) {
    return BIG_TV_RIGHT_MONITOR_OVERLAY_CORNER_SCORE_STATE;
  }
  return BIG_TV_RIGHT_MONITOR_OVERLAY_STATE_UNKNOWN;
}

function hasDefaultMonitorOverlays() {
  return (
    state.leftMonitorSelectedState === DEFAULT_LEFT_MONITOR_STATE &&
    getCurrentRightMonitorOverlayState() === DEFAULT_BIG_TV_RIGHT_MONITOR_OVERLAY_STATE
  );
}

function isBigTvDefaultScreensaverActive() {
  return (
    !state.isBigTvDvdLoopInterrupted &&
    !!state.bigTvDvdOverlayEl &&
    state.bigTvDvdOverlayEl.classList.contains('is-active') &&
    !hasActiveBigTvContentOverlay() &&
    hasDefaultMonitorOverlays()
  );
}

function getCurrentDvdColorStep() {
  return DVD_COLOR_STEPS[state.dvdColorStepIndex % DVD_COLOR_STEPS.length];
}

function applyDvdColorStep() {
  const { color, hue } = getCurrentDvdColorStep();
  if (state.bigTvDvdOverlayEl) {
    state.bigTvDvdOverlayEl.style.setProperty('--dvd-accent-color', color);
    state.bigTvDvdOverlayEl.style.setProperty('--dvd-hue-deg', `${hue}deg`);
  }
  if (state.rightMonitorCornerScoreOverlayEl) {
    state.rightMonitorCornerScoreOverlayEl.style.setProperty('--corner-score-color', color);
  }
  if (state.bigTvCornerScoreStatusEl) {
    state.bigTvCornerScoreStatusEl.style.setProperty('--corner-score-color', color);
  }
  if (state.bigTvCornerScoreInitialsPromptEl) {
    state.bigTvCornerScoreInitialsPromptEl.style.setProperty('--corner-score-color', color);
  }
}

function getDvdCornerSide(position, maxPosition, minTolerance, maxTolerance, minSide, maxSide) {
  if (position >= minTolerance && position <= maxTolerance) {
    return minSide;
  }
  const distanceFromMax = maxPosition - position;
  if (distanceFromMax >= minTolerance && distanceFromMax <= maxTolerance) {
    return maxSide;
  }
  return null;
}

function getCornerCollisionName({
  hitHorizontalEdge,
  hitVerticalEdge,
  positionX,
  positionY,
  maxX,
  maxY,
  minTolerance,
  maxTolerance
}) {
  const verticalCornerSide = getDvdCornerSide(positionY, maxY, minTolerance, maxTolerance, 'top', 'bottom');
  if (hitHorizontalEdge && verticalCornerSide) {
    return `${verticalCornerSide}-${positionX <= 0 ? 'left' : 'right'}`;
  }
  const horizontalCornerSide = getDvdCornerSide(positionX, maxX, minTolerance, maxTolerance, 'left', 'right');
  if (hitVerticalEdge && horizontalCornerSide) {
    return `${positionY <= 0 ? 'top' : 'bottom'}-${horizontalCornerSide}`;
  }
  return null;
}

function stopBigTvDvdAnimation() {
  state.isDvdAnimationActive = false;
  state.dvdLastFrameTime = 0;
  if (state.dvdAnimationFrameId !== null) {
    window.cancelAnimationFrame(state.dvdAnimationFrameId);
    state.dvdAnimationFrameId = null;
  }
  hideAllDvdMissIndicators();
}

function getDvdLogoDimensions() {
  if (!state.bigTvDvdOverlayEl || !state.bigTvDvdLogoEl) {
    return null;
  }
  const boundsWidth = state.bigTvDvdOverlayEl.clientWidth;
  const boundsHeight = state.bigTvDvdOverlayEl.clientHeight;
  const logoWidth = state.bigTvDvdLogoEl.offsetWidth;
  const logoHeight = state.bigTvDvdLogoEl.offsetHeight;
  if (!boundsWidth || !boundsHeight || !logoWidth || !logoHeight) {
    return null;
  }
  return { boundsWidth, boundsHeight, logoWidth, logoHeight };
}

function adjustDvdSpeed(direction) {
  const delta = direction * DVD_SPEED_ADJUSTMENT_STEP;
  state.dvdSpeedMultiplier = clamp(
    state.dvdSpeedMultiplier + delta,
    DVD_SPEED_MULTIPLIER_MIN,
    DVD_SPEED_MULTIPLIER_MAX
  );
}

function tickBigTvDvdAnimation(timestamp) {
  if (!state.isDvdAnimationActive || !state.bigTvDvdLogoEl) {
    stopBigTvDvdAnimation();
    return;
  }

  const dimensions = getDvdLogoDimensions();
  if (!dimensions) {
    state.dvdAnimationFrameId = window.requestAnimationFrame(tickBigTvDvdAnimation);
    return;
  }

  const { boundsWidth, boundsHeight, logoWidth, logoHeight } = dimensions;
  const maxX = Math.max(0, boundsWidth - logoWidth);
  const maxY = Math.max(0, boundsHeight - logoHeight);

  if (!state.hasDvdPosition) {
    state.dvdPositionX = Math.random() * maxX;
    state.dvdPositionY = Math.random() * maxY;
    state.dvdVelocityX = Math.random() < 0.5 ? 1 : -1;
    state.dvdVelocityY = Math.random() < 0.5 ? 1 : -1;
    state.hasDvdPosition = true;
  } else {
    state.dvdPositionX = clamp(state.dvdPositionX, 0, maxX);
    state.dvdPositionY = clamp(state.dvdPositionY, 0, maxY);
  }

  if (!state.dvdLastFrameTime) {
    state.dvdLastFrameTime = timestamp;
    state.bigTvDvdLogoEl.style.transform = `translate3d(${state.dvdPositionX}px, ${state.dvdPositionY}px, 0)`;
    state.dvdAnimationFrameId = window.requestAnimationFrame(tickBigTvDvdAnimation);
    return;
  }

  const deltaSeconds = Math.min(
    DVD_FRAME_DELTA_MAX_SECONDS,
    Math.max(0, (timestamp - state.dvdLastFrameTime) / 1000)
  );
  state.dvdLastFrameTime = timestamp;
  const effectiveDvdSpeed = DVD_BOUNCE_SPEED_PX_PER_SECOND * state.dvdSpeedMultiplier;
  if (Math.abs(effectiveDvdSpeed) <= Number.EPSILON) {
    state.bigTvDvdLogoEl.style.transform = `translate3d(${state.dvdPositionX}px, ${state.dvdPositionY}px, 0)`;
    state.dvdAnimationFrameId = window.requestAnimationFrame(tickBigTvDvdAnimation);
    return;
  }
  state.dvdPositionX += state.dvdVelocityX * effectiveDvdSpeed * deltaSeconds;
  state.dvdPositionY += state.dvdVelocityY * effectiveDvdSpeed * deltaSeconds;

  let hitHorizontalEdge = false;
  let hitVerticalEdge = false;
  if (state.dvdPositionX <= 0) {
    state.dvdPositionX = 0;
    state.dvdVelocityX = 1;
    hitHorizontalEdge = true;
  } else if (state.dvdPositionX >= maxX) {
    state.dvdPositionX = maxX;
    state.dvdVelocityX = -1;
    hitHorizontalEdge = true;
  }

  if (state.dvdPositionY <= 0) {
    state.dvdPositionY = 0;
    state.dvdVelocityY = 1;
    hitVerticalEdge = true;
  } else if (state.dvdPositionY >= maxY) {
    state.dvdPositionY = maxY;
    state.dvdVelocityY = -1;
    hitVerticalEdge = true;
  }

  if (hitHorizontalEdge || hitVerticalEdge) {
    state.dvdColorStepIndex = (state.dvdColorStepIndex + 1) % DVD_COLOR_STEPS.length;
    applyDvdColorStep();
  }

  const goalCorner = getCornerCollisionName({
    hitHorizontalEdge,
    hitVerticalEdge,
    positionX: state.dvdPositionX,
    positionY: state.dvdPositionY,
    maxX,
    maxY,
    minTolerance: 0,
    maxTolerance: DVD_CORNER_GOAL_TOLERANCE_PX
  });
  if (goalCorner) {
    const previousHighScore = state.cornerScoreHighScoreValue;
    const cornerScoreDelta = state.dvdSpeedMultiplier < 0 ? -1 : 1;
    const nextCornerScore = state.cornerScoreValue + cornerScoreDelta;
    setCornerScore(nextCornerScore);
    playRightMonitorScoringNoise();
    state.isDvdCornerCountEnabled = true;
    if (cornerScoreDelta > 0) {
      if (nextCornerScore === previousHighScore) {
        showCornerScoreStatus('Tied for high-score!', nextCornerScore);
        void queueCornerScoreUpdate(nextCornerScore, { force: true });
      } else if (nextCornerScore > previousHighScore) {
        setCornerScoreHighScore(nextCornerScore, '');
        showCornerScoreStatus('New high-score!', nextCornerScore);
        showCornerScoreInitialsPrompt(nextCornerScore);
      }
    }
    syncDvdScreensaverState();
    if (!isRightMonitorInteractive() && !state.isRightMonitorCornerScoreWakeSequenceRunning) {
      void wakeRightMonitorForCornerScore();
    }
  } else {
    const missCorner = getCornerCollisionName({
      hitHorizontalEdge,
      hitVerticalEdge,
      positionX: state.dvdPositionX,
      positionY: state.dvdPositionY,
      maxX,
      maxY,
      minTolerance: DVD_CORNER_MISS_MIN_TOLERANCE_PX,
      maxTolerance: DVD_CORNER_MISS_MAX_TOLERANCE_PX
    });
    if (missCorner) {
      showDvdMissIndicator(missCorner);
    }
  }

  state.bigTvDvdLogoEl.style.transform = `translate3d(${state.dvdPositionX}px, ${state.dvdPositionY}px, 0)`;
  state.dvdAnimationFrameId = window.requestAnimationFrame(tickBigTvDvdAnimation);
}

function startBigTvDvdAnimation() {
  if (state.isDvdAnimationActive || !state.bigTvDvdLogoEl) {
    return;
  }
  state.isDvdAnimationActive = true;
  state.dvdLastFrameTime = 0;
  state.dvdAnimationFrameId = window.requestAnimationFrame(tickBigTvDvdAnimation);
}

function syncDvdScreensaverState() {
  const isScreensaverActive = isBigTvDefaultScreensaverActive();
  const isCornerScoreActive = isScreensaverActive && state.isDvdCornerCountEnabled && isRightMonitorInteractive();
  if (state.rightMonitorCornerScoreOverlayEl) {
    state.rightMonitorCornerScoreOverlayEl.classList.toggle('is-active', isCornerScoreActive);
    state.rightMonitorCornerScoreOverlayEl.setAttribute('aria-hidden', isCornerScoreActive ? 'false' : 'true');
  }
  if (state.rightMonitorScreenWindowEl) {
    state.rightMonitorScreenWindowEl.classList.toggle('is-corner-score-active', isCornerScoreActive);
  }
  if (state.bigTvDvdOverlayEl) {
    state.bigTvDvdOverlayEl.setAttribute('aria-label', 'CornerScore screensaver');
  }
  if (isScreensaverActive) {
    startBigTvDvdAnimation();
    return;
  }
  stopBigTvDvdAnimation();
}

function interruptBigTvDvdLoop() {
  if (state.isBigTvDvdLoopInterrupted) {
    return;
  }
  state.isBigTvDvdLoopInterrupted = true;
  stopBigTvDvdAnimation();
  if (state.bigTvDvdOverlayEl) {
    state.bigTvDvdOverlayEl.classList.remove('is-active');
    state.bigTvDvdOverlayEl.setAttribute('aria-hidden', 'true');
  }
  syncDvdScreensaverState();
}

function restoreBigTvDvdLoop({ enableCornerScore = false } = {}) {
  state.isBigTvDvdLoopInterrupted = false;
  if (enableCornerScore) {
    state.isDvdCornerCountEnabled = true;
  }
  if (state.bigTvDvdOverlayEl) {
    state.bigTvDvdOverlayEl.classList.add('is-active');
    state.bigTvDvdOverlayEl.setAttribute('aria-hidden', 'false');
  }
  syncDvdScreensaverState();
}

state._cb.syncDvdScreensaverState = syncDvdScreensaverState;
state._cb.interruptBigTvDvdLoop = interruptBigTvDvdLoop;
state._cb.restoreBigTvDvdLoop = restoreBigTvDvdLoop;
state._cb.startBigTvDvdAnimation = startBigTvDvdAnimation;
state._cb.stopBigTvDvdAnimation = stopBigTvDvdAnimation;
state._cb.adjustDvdSpeed = adjustDvdSpeed;
state._cb.activateRightMonitorCornerScoreMode = activateRightMonitorCornerScoreMode;

export { getDvdCornerSide, getCornerCollisionName, getCurrentDvdColorStep, applyDvdColorStep, stopBigTvDvdAnimation, getDvdLogoDimensions, adjustDvdSpeed, tickBigTvDvdAnimation, startBigTvDvdAnimation, syncDvdScreensaverState, interruptBigTvDvdLoop, restoreBigTvDvdLoop, activateRightMonitorCornerScoreMode, hasActiveBigTvContentOverlay, hasDefaultMonitorOverlays, getCurrentRightMonitorOverlayState, isBigTvDefaultScreensaverActive };
