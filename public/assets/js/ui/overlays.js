import {
  AQUARIUM_DEPTH_OVERLAY_LEFT_IMAGE_URL,
  AQUARIUM_DEPTH_OVERLAY_RIGHT_IMAGE_URL,
  AQUARIUM_OVERLAY_ID,
  AQUARIUM_STATIC_VIDEO_URL,
  BIG_TV_FULLSCREEN_OVERLAY_IDS,
  BIG_TV_INTERACTIVE_UI_SELECTORS,
  BIG_TV_PROMPT_PREFIX,
  BIG_TV_PROMPT_SECRET_TEXT,
  BIG_TV_RIGHT_MONITOR_OVERLAY_BLUE_IMAGE_URL,
  BIG_TV_SCREENSAVER_LOGO_URL,
  BIG_TV_TOOLS_LOGO_URL,
  CALENDAR_MONTH_IMAGE_BASE_URL,
  CALENDAR_MONTH_IMAGE_END,
  CALENDAR_MONTH_IMAGE_START,
  CALENDAR_MONTH_NAME_FORMATTER,
  COMMODORE_POWER_BUTTON_OVERLAY_ID,
  COMMODORE_DESK_IMAGE_URL,
  DEFAULT_LEFT_MONITOR_STATE,
  DISCORD_BUTTON_IMAGE_URL,
  DISCORD_OVERLAY_ID,
  DISCORD_WIDGET_URL,
  DVD_ACCELEROMETER_DEFAULT_POSITION,
  DVD_ACCELEROMETER_MULTIPLIER_MIN,
  DVD_ACCELEROMETER_MULTIPLIER_MAX,
  GITHUB_SCREENSAVER_LOGO_URL,
  GITHUB_SHELF_OBJECT_IMAGE_URL,
  GITHUB_SHELF_OBJECT_DVD_IMAGE_URL,
  GITHUB_SHELF_OBJECT_OVERLAY_ID,
  GITHUB_V3_ISSUES_URL,
  GITHUB_V3_AGENTS_URL,
  GITHUB_V3_WIKI_URL,
  GITHUB_V3_ACTIONS_URL,
  LEFT_MONITOR_SIDE_FRAME_IMAGE_URL,
  LEFT_MONITOR_IMAGE_URLS,
  MONITOR_GROUP_LEFT_ID,
  MONITOR_GROUP_RIGHT_ID,
  MONITOR_GROUP_MIDDLE_ID,
  LEFT_MONITOR_SEGMENTS,
  LEFT_MONITOR_STATES,
  LOGIN_LOGO_URL,
  RIGHT_MONITOR_SIDE_FRAME_IMAGE_URL,
  STARSHRIMP_LOGO_IMAGE_URL,
  WHITEBOARD_CORNER_SCORE_OVERLAY_ID,
  FLIP_CLOCK_OVERLAY_ID,
  overlayDefaults
} from '../core/constants.js';
import { state } from '../core/state.js';
import { clamp } from '../core/utils.js';
import { applyDvdColorStep } from '../systems/dvd.js';
import { renderCornerScore, renderPersonalBestStats, sanitizeCornerScoreInitialsInput, submitCornerScoreInitials, syncCornerScoreInitialsPromptVisibility, syncCornerScoreInitialsSubmitState } from '../systems/cornerScore.js';
import { applyRadioTuningPosition, createFlipCard, ensureRadioTuningLoopPlayback, getNextRadioTuningAudioUrl, getRadioTuningAudioElement, resetRadioTuningPlayback, startFlipClock, stopRadioTuningLoopPlayback, syncDvdAccelerometerFromTuningPosition } from '../systems/flipClock.js';
import { isLeftMonitorInteractive, isRightMonitorInteractive } from '../systems/monitors.js';
import { getOverlayRect, syncControlledOverlaysFromHotspots } from '../systems/hotspots.js';

const isIOSDevice =
  /iPad|iPhone|iPod/.test(window.navigator.userAgent) ||
  (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);

function hasActiveBigTvContentOverlay() {
  return Boolean(
    state.aquariumStaticOverlayEl?.classList.contains('is-active') ||
    state.nedryGateOverlayEl?.classList.contains('is-active') ||
    state.isBigTvPromptActive ||
    state.isBigTvToolsActive ||
    state.isLoginActive ||
    state.isCalendarBigTvActive
  );
}

function syncBigTvContentVisibility() {
  const shouldShowBigTvOverlay = hasActiveBigTvContentOverlay();
  if (shouldShowBigTvOverlay) {
    state._cb.interruptBigTvDvdLoop?.();
  }
  const discordOverlayEl = state.overlayElementsById.get(DISCORD_OVERLAY_ID);
  const fullscreenElement = document.fullscreenElement;
  if (discordOverlayEl) {
    const shouldHideDiscordOverlay = shouldShowBigTvOverlay && fullscreenElement !== discordOverlayEl;
    discordOverlayEl.style.visibility = shouldHideDiscordOverlay ? 'hidden' : 'visible';
  }
  if (state.aquariumOverlayEl) {
    state.aquariumOverlayEl.classList.toggle('is-active', shouldShowBigTvOverlay);
  }
  if (shouldShowBigTvOverlay && fullscreenElement === discordOverlayEl && state.aquariumOverlayEl) {
    void enterBigTvFullscreen(state.aquariumOverlayEl);
  } else if (!shouldShowBigTvOverlay && fullscreenElement === state.aquariumOverlayEl && discordOverlayEl) {
    void enterBigTvFullscreen(discordOverlayEl);
  }
  state._cb.syncDvdScreensaverState?.();
}

function isBigTvFullscreenTarget(element) {
  return !!element && BIG_TV_FULLSCREEN_OVERLAY_IDS.has(element.id);
}

function getActiveBigTvFullscreenTarget() {
  if (state.aquariumOverlayEl?.classList.contains('is-active')) {
    return state.aquariumOverlayEl;
  }
  return state.overlayElementsById.get(DISCORD_OVERLAY_ID) || state.aquariumOverlayEl || null;
}

function syncBigTvFullscreenUi() {
  const fullscreenElement = document.fullscreenElement;
  [state.overlayElementsById.get(DISCORD_OVERLAY_ID), state.aquariumOverlayEl].forEach((overlayEl) => {
    if (!overlayEl) return;
    const isFullscreen = fullscreenElement === overlayEl;
    overlayEl.classList.toggle('is-fullscreen', isFullscreen);
    const exitButton = overlayEl.querySelector('.big-tv-fullscreen-exit-button');
    if (exitButton) {
      exitButton.hidden = !isFullscreen;
      exitButton.setAttribute('aria-hidden', isFullscreen ? 'false' : 'true');
    }
  });
  state._cb.updateBigTvDebugWatermarkPlacement?.();
}

function getBigTvVideoFullscreenTarget(targetOverlayEl) {
  if (!targetOverlayEl) return null;
  const activeVideo = targetOverlayEl.querySelector('.nedry-gate-video, .discord-static-video');
  return activeVideo instanceof HTMLVideoElement ? activeVideo : null;
}

function enterBigTvVideoFullscreenFallback(targetOverlayEl) {
  const targetVideo = getBigTvVideoFullscreenTarget(targetOverlayEl);
  if (!targetVideo || typeof targetVideo.webkitEnterFullscreen !== 'function') return false;
  try {
    targetVideo.webkitEnterFullscreen();
    return true;
  } catch (error) {
    console.warn('Unable to enter iOS video fullscreen mode.', error);
    return false;
  }
}

async function enterBigTvFullscreen(targetOverlayEl = getActiveBigTvFullscreenTarget()) {
  if (!targetOverlayEl || document.fullscreenElement === targetOverlayEl) return;
  if (isIOSDevice && enterBigTvVideoFullscreenFallback(targetOverlayEl)) return;
  if (typeof targetOverlayEl.requestFullscreen !== 'function') {
    if (!enterBigTvVideoFullscreenFallback(targetOverlayEl)) {
      console.warn('Unable to enter big TV fullscreen mode: API unavailable.');
    }
    return;
  }
  try {
    await targetOverlayEl.requestFullscreen();
  } catch (error) {
    console.warn('Unable to enter big TV fullscreen mode.', error);
  }
}

async function exitBigTvFullscreen(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  if (!document.fullscreenElement || typeof document.exitFullscreen !== 'function') return;
  try {
    await document.exitFullscreen();
  } catch (error) {
    console.warn('Unable to exit big TV fullscreen mode.', error);
  }
}

function createBigTvFullscreenExitButton() {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'big-tv-fullscreen-exit-button';
  button.hidden = true;
  button.setAttribute('aria-label', 'Exit fullscreen');
  button.setAttribute('aria-hidden', 'true');
  button.textContent = '×';
  button.addEventListener('pointerdown', (event) => event.stopPropagation());
  button.addEventListener('click', exitBigTvFullscreen);
  return button;
}

function syncLeftMonitorSelectionUi() {
  state.leftMonitorSegmentButtonsByState.forEach((button, segmentState) => {
    button.classList.toggle('is-selected', segmentState === state.leftMonitorSelectedState);
    button.setAttribute('aria-pressed', segmentState === state.leftMonitorSelectedState ? 'true' : 'false');
  });
}

function setLeftMonitorState(nextState) {
  if (!LEFT_MONITOR_STATES.has(nextState)) return;
  if (nextState !== 'login') {
    state.shouldAutoStartDiscordLoginOnNextLoginActivation = false;
  }
  state.leftMonitorSelectedState = nextState;
  if (state.leftMonitorContentImageEl) {
    state.leftMonitorContentImageEl.src = LEFT_MONITOR_IMAGE_URLS[nextState] || LEFT_MONITOR_IMAGE_URLS[DEFAULT_LEFT_MONITOR_STATE];
    state.leftMonitorContentImageEl.classList.toggle('is-calendar-state', nextState === 'calendar');
  }
  syncLeftMonitorSelectionUi();
  if (nextState === 'tools' && isLeftMonitorInteractive()) {
    hideCalendarBigTvOverlay();
    state._cb.hideLoginOverlay?.();
    void state._cb.activateBigTvToolsMode?.();
  } else if (nextState === 'login' && isLeftMonitorInteractive()) {
    hideCalendarBigTvOverlay();
    state._cb.hideBigTvToolsOverlay?.();
    void state._cb.activateLoginMode?.();
  } else if (nextState === 'calendar' && isLeftMonitorInteractive()) {
    state._cb.hideBigTvToolsOverlay?.();
    state._cb.hideLoginOverlay?.();
    void activateCalendarMode();
  } else {
    hideCalendarBigTvOverlay();
    state._cb.hideBigTvToolsOverlay?.();
    state._cb.hideLoginOverlay?.();
  }
  state._cb.syncDvdScreensaverState?.();
}

function setRightMonitorOverlayImageUrl(nextImageUrl) {
  state.rightMonitorOverlayImageUrl = nextImageUrl || BIG_TV_RIGHT_MONITOR_OVERLAY_BLUE_IMAGE_URL;
  if (state.discordButtonImgEl) {
    state.discordButtonImgEl.src = state.rightMonitorOverlayImageUrl;
  }
}

function compareCalendarMonths(aYear, aMonth, bYear, bMonth) {
  return aYear !== bYear ? aYear - bYear : aMonth - bMonth;
}

function resolveCalendarImageMonth(date = new Date()) {
  let year = date.getFullYear();
  let month = date.getMonth();
  if (compareCalendarMonths(year, month, CALENDAR_MONTH_IMAGE_START.year, CALENDAR_MONTH_IMAGE_START.month) < 0) {
    year = CALENDAR_MONTH_IMAGE_START.year;
    month = CALENDAR_MONTH_IMAGE_START.month;
  } else if (compareCalendarMonths(year, month, CALENDAR_MONTH_IMAGE_END.year, CALENDAR_MONTH_IMAGE_END.month) > 0) {
    year = CALENDAR_MONTH_IMAGE_END.year;
    month = CALENDAR_MONTH_IMAGE_END.month;
  }
  return { year, month };
}

function getCalendarMonthImageUrl(date = new Date()) {
  const { year, month } = resolveCalendarImageMonth(date);
  const monthLabel = CALENDAR_MONTH_NAME_FORMATTER.format(new Date(year, month, 1));
  return `${CALENDAR_MONTH_IMAGE_BASE_URL}/${encodeURIComponent(`${monthLabel} ${year}.png`)}`;
}

function showCalendarBigTvOverlay() {
  if (!state.calendarBigTvOverlayEl) return;
  state.isCalendarBigTvActive = true;
  if (state.calendarMonthImageEl) state.calendarMonthImageEl.src = getCalendarMonthImageUrl(new Date());
  state.calendarBigTvOverlayEl.classList.add('is-active');
  state.calendarBigTvOverlayEl.setAttribute('aria-hidden', 'false');
  syncBigTvContentVisibility();
}

function hideCalendarBigTvOverlay() {
  state.isCalendarBigTvActive = false;
  if (state.calendarBigTvOverlayEl) {
    state.calendarBigTvOverlayEl.classList.remove('is-active');
    state.calendarBigTvOverlayEl.setAttribute('aria-hidden', 'true');
  }
  syncBigTvContentVisibility();
}

async function activateCalendarMode() {
  state.calendarBigTvSequenceToken += 1;
  const sequenceToken = state.calendarBigTvSequenceToken;
  state._cb.stopAquariumPlaybackSequence?.();
  state._cb.hideBigTvPromptOverlay?.();
  state._cb.hideNedryGateOverlay?.();
  state._cb.hideBigTvToolsOverlay?.();
  state._cb.hideLoginOverlay?.({ cancelSequence: false });
  hideCalendarBigTvOverlay();
  if (state.calendarMonthImageEl) {
    state.calendarMonthImageEl.src = getCalendarMonthImageUrl(new Date());
  }
  await state._cb.playBigTvStaticPass?.(sequenceToken, () => state.calendarBigTvSequenceToken);
  if (sequenceToken !== state.calendarBigTvSequenceToken) {
    state._cb.hideAquariumStaticOverlay?.();
    return;
  }
  state._cb.hideAquariumStaticOverlay?.();
  showCalendarBigTvOverlay();
}

async function playLeftMonitorStaticPass(sequenceToken) {
  if (!state.leftMonitorStaticOverlayEl || !state.leftMonitorStaticVideoEl) return false;
  state.leftMonitorStaticVideoEl.pause();
  state.leftMonitorStaticVideoEl.loop = false;
  state.leftMonitorStaticVideoEl.currentTime = 0;
  if (sequenceToken !== state.leftMonitorTransitionToken) {
    state.leftMonitorStaticVideoEl.loop = true;
    return false;
  }
  state.leftMonitorStaticOverlayEl.classList.add('is-active');
  try {
    await state.leftMonitorStaticVideoEl.play();
  } catch (error) {
    if (error?.name !== 'AbortError') console.warn('Unable to play left monitor static.', error);
    state.leftMonitorStaticOverlayEl.classList.remove('is-active');
    state.leftMonitorStaticVideoEl.loop = true;
    return false;
  }
  const hasEnded = await new Promise((resolve) => {
    const onDone = () => { cleanup(); resolve(true); };
    const onError = () => { cleanup(); resolve(false); };
    const cleanup = () => {
      state.leftMonitorStaticVideoEl.removeEventListener('ended', onDone);
      state.leftMonitorStaticVideoEl.removeEventListener('error', onError);
    };
    state.leftMonitorStaticVideoEl.addEventListener('ended', onDone, { once: true });
    state.leftMonitorStaticVideoEl.addEventListener('error', onError, { once: true });
  });
  state.leftMonitorStaticOverlayEl.classList.remove('is-active');
  state.leftMonitorStaticVideoEl.loop = true;
  return hasEnded && sequenceToken === state.leftMonitorTransitionToken;
}

async function activateLeftMonitorQuadrant(nextState) {
  state.leftMonitorTransitionToken += 1;
  const sequenceToken = state.leftMonitorTransitionToken;
  setLeftMonitorState(nextState);
  await playLeftMonitorStaticPass(sequenceToken);
}

function syncGithubQuadrantOverlayVisibility() {
  const isGithubMode = state.isGithubScreensaverMode;
  if (state.leftMonitorSelectorEl) {
    state.leftMonitorSelectorEl.classList.toggle('is-hidden', isGithubMode);
    state.leftMonitorSelectorEl.setAttribute('aria-hidden', isGithubMode ? 'true' : 'false');
  }
  if (state.bigTvGithubQuadrantEl) {
    state.bigTvGithubQuadrantEl.classList.toggle('is-active', isGithubMode);
    state.bigTvGithubQuadrantEl.setAttribute('aria-hidden', isGithubMode ? 'false' : 'true');
  }
}

function deactivateGithubScreensaverMode() {
  if (!state.isGithubScreensaverMode) return;
  state.isGithubScreensaverMode = false;
  state.githubScreensaverSequenceToken += 1;
  if (state.bigTvDvdLogoEl) {
    state.bigTvDvdLogoEl.src = BIG_TV_SCREENSAVER_LOGO_URL;
    state.bigTvDvdLogoEl.classList.remove('is-github-mode-logo');
  }
  syncGithubShelfObjectImage();
  syncGithubQuadrantOverlayVisibility();
}

async function activateGithubScreensaverMode() {
  state.githubScreensaverSequenceToken += 1;
  const sequenceToken = state.githubScreensaverSequenceToken;
  state._cb.stopAquariumPlaybackSequence?.();
  state._cb.hideBigTvPromptOverlay?.();
  state._cb.hideNedryGateOverlay?.();
  state._cb.hideBigTvToolsOverlay?.({ cancelSequence: false });
  state._cb.hideLoginOverlay?.({ cancelSequence: false });
  hideCalendarBigTvOverlay();
  // Wake monitors instantly if power was not already on so static is visible
  if (state.leftMonitorShadowOverlayEl && !isLeftMonitorInteractive()) {
    state.leftMonitorShadowOverlayEl.classList.remove('tv-turning-on', 'tv-turning-off');
    state.leftMonitorShadowOverlayEl.classList.add('is-monitor-on');
  }
  if (state.rightMonitorShadowOverlayEl && !isRightMonitorInteractive()) {
    state.rightMonitorShadowOverlayEl.classList.remove('tv-turning-on', 'tv-turning-off');
    state.rightMonitorShadowOverlayEl.classList.add('is-monitor-on');
  }
  // Play left monitor and right monitor static concurrently
  state.leftMonitorTransitionToken += 1;
  void playLeftMonitorStaticPass(state.leftMonitorTransitionToken);
  void state._cb.playRightMonitorStaticPass?.();
  // Play big TV static
  const staticEnded = await state._cb.playBigTvStaticPass?.(sequenceToken, () => state.githubScreensaverSequenceToken);
  if (sequenceToken !== state.githubScreensaverSequenceToken) {
    state._cb.hideAquariumStaticOverlay?.();
    return;
  }
  state._cb.hideAquariumStaticOverlay?.();
  // Switch to GitHub logo and show quadrant overlay
  state.isGithubScreensaverMode = true;
  if (state.bigTvDvdLogoEl) {
    state.bigTvDvdLogoEl.src = GITHUB_SCREENSAVER_LOGO_URL;
    state.bigTvDvdLogoEl.classList.add('is-github-mode-logo');
  }
  syncGithubShelfObjectImage();
  if (state.bigTvGithubQuadrantEl) {
    // Reset any previously-activated quadrant states each time mode is entered
    state.bigTvGithubQuadrantEl.querySelectorAll('.github-quadrant-btn').forEach((btn) => btn.classList.remove('is-active'));
  }
  syncGithubQuadrantOverlayVisibility();
  state._cb.restoreBigTvDvdLoop?.();
}

function syncGithubShelfObjectImage() {
  if (!state.githubShelfImageEl) {
    return;
  }
  state.githubShelfImageEl.src = state.isGithubScreensaverMode
    ? GITHUB_SHELF_OBJECT_DVD_IMAGE_URL
    : GITHUB_SHELF_OBJECT_IMAGE_URL;
}

function positionOverlay(overlayId) {
  const overlayEl = state.overlayElementsById.get(overlayId);
  const rect = getOverlayRect(overlayId);
  if (!overlayEl || !rect) return;
  overlayEl.style.left = `${rect.x}px`;
  overlayEl.style.top = `${rect.y}px`;
  overlayEl.style.width = `${rect.w}px`;
  overlayEl.style.height = `${rect.h}px`;
}

function applyOverlayTransforms() {
  syncControlledOverlaysFromHotspots();
}

function createOverlays() {
  state.overlayElementsById.clear();
  state.leftMonitorSegmentButtonsByState.clear();
  state.loginStepElsByKey.clear();
  state.bigTvDvdMissTimeoutIdsByCorner.forEach((timeoutId) => window.clearTimeout(timeoutId));
  state.bigTvDvdMissTimeoutIdsByCorner.clear();
  state.bigTvDvdMissIndicatorsByCorner.clear();
  if (state.bigTvHighScoreStatsTimeoutId !== null) {
    window.clearTimeout(state.bigTvHighScoreStatsTimeoutId);
    state.bigTvHighScoreStatsTimeoutId = null;
  }
  state.isBigTvHighScoreStatsVisible = false;
  state.githubShelfImageEl = null;
  state.discordWidgetFrameEl = null;
  state.leftMonitorSelectorEl = null;
  state.aquariumOverlayEl = null;
  state.commodorePowerButtonEl = null;
  state.commodoreShadowOverlayEl = null;
  state.leftMonitorShadowOverlayEl = null;
  state.rightMonitorShadowOverlayEl = null;
  state.middleMonitorCornerScoreOverlayEl = null;
  state.middleMonitorCornerScoreServerStatsEl = null;
  state.middleMonitorStaticOverlayEl = null;
  state.middleMonitorStaticVideoEl = null;
  overlayDefaults.forEach((overlay) => {
    const rect = getOverlayRect(overlay.id);
    if (!rect) return;
    const el = document.createElement('div');
    el.id = overlay.id;
    el.className = 'screen-overlay';
    el.style.left = `${rect.x}px`;
    el.style.top = `${rect.y}px`;
    el.style.width = `${rect.w}px`;
    el.style.height = `${rect.h}px`;

    if (overlay.id === DISCORD_OVERLAY_ID) {
      el.classList.add('discord-widget-overlay', 'big-tv-fullscreen-target');
      state.bigTvDvdOverlayEl = document.createElement('div');
      state.bigTvDvdOverlayEl.className = 'discord-static-overlay big-tv-dvd-overlay is-active';
      state.bigTvDvdLogoEl = document.createElement('img');
      state.bigTvDvdLogoEl.className = 'big-tv-dvd-logo';
      state.bigTvDvdLogoEl.src = BIG_TV_SCREENSAVER_LOGO_URL;
      state.bigTvDvdOverlayEl.appendChild(state.bigTvDvdLogoEl);
      state.bigTvCornerScoreStatusEl = document.createElement('div');
      state.bigTvCornerScoreStatusEl.className = 'big-tv-corner-score-status';
      state.bigTvCornerScoreStatusLabelEl = document.createElement('p');
      state.bigTvCornerScoreStatusLabelEl.className = 'big-tv-corner-score-status-label';
      state.bigTvCornerScoreStatusEl.appendChild(state.bigTvCornerScoreStatusLabelEl);
      state.bigTvDvdOverlayEl.appendChild(state.bigTvCornerScoreStatusEl);
      ['top-left', 'top-right', 'bottom-left', 'bottom-right'].forEach((corner) => {
        const missIndicatorEl = document.createElement('p');
        missIndicatorEl.className = `big-tv-dvd-miss-indicator big-tv-dvd-miss-indicator-${corner}`;
        missIndicatorEl.textContent = 'Near Miss';
        missIndicatorEl.setAttribute('aria-hidden', 'true');
        state.bigTvDvdMissIndicatorsByCorner.set(corner, missIndicatorEl);
        state.bigTvDvdOverlayEl.appendChild(missIndicatorEl);
      });
      // GitHub quadrant overlay — shown when GitHub screensaver mode is active
      state.bigTvGithubQuadrantEl = document.createElement('div');
      state.bigTvGithubQuadrantEl.className = 'big-tv-github-quadrant-overlay';
      state.bigTvGithubQuadrantEl.setAttribute('aria-hidden', 'true');
      const githubQuadrants = [
        { label: 'Issues',  url: GITHUB_V3_ISSUES_URL,  pos: 'top-left' },
        { label: 'Agents',  url: GITHUB_V3_AGENTS_URL,  pos: 'top-right' },
        { label: 'Wiki',    url: GITHUB_V3_WIKI_URL,    pos: 'bottom-left' },
        { label: 'Actions', url: GITHUB_V3_ACTIONS_URL, pos: 'bottom-right' }
      ];
      githubQuadrants.forEach(({ label, url, pos }) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `github-quadrant-btn github-quadrant-btn-${pos}`;
        btn.setAttribute('aria-label', `GitHub ${label}`);
        btn.textContent = label;
        btn.addEventListener('pointerdown', (e) => e.stopPropagation());
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const isAuthenticated = await state._cb.ensureDiscordAuthForQuadrantAction?.();
          if (!isAuthenticated) {
            return;
          }
          btn.classList.add('is-active');
          window.open(url, '_blank', 'noopener,noreferrer');
        });
        state.bigTvGithubQuadrantEl.appendChild(btn);
      });
      state.bigTvDvdOverlayEl.appendChild(state.bigTvGithubQuadrantEl);
      // Big TV CornerScore metrics panel — toggled by clicking the whiteboard high-score overlay
      state.bigTvHighScoreStatsEl = document.createElement('div');
      state.bigTvHighScoreStatsEl.className = 'big-tv-high-score-stats';
      state.bigTvHighScoreStatsEl.setAttribute('aria-hidden', 'true');
      const highScoreStatsTitleEl = document.createElement('p');
      highScoreStatsTitleEl.className = 'big-tv-high-score-stats-title';
      highScoreStatsTitleEl.textContent = 'CornerScore Metrics';
      const highScoreStatsGridEl = document.createElement('div');
      highScoreStatsGridEl.className = 'big-tv-high-score-stats-grid';
      const metricQuadrants = [
        {
          cls: 'big-tv-corner-score-quadrant-top-left',
          title: 'Score',
          fields: [
            { label: 'Local', cls: 'big-tv-cs-local-score' },
            { label: 'High', cls: 'big-tv-high-score-stats-value', stateKey: 'bigTvHighScoreStatsValueEl' }
          ]
        },
        {
          cls: 'big-tv-corner-score-quadrant-top-right',
          title: 'Initials + Time',
          fields: [
            { label: 'Initials', cls: 'big-tv-high-score-stats-initials', stateKey: 'bigTvHighScoreStatsInitialsEl' },
            { label: 'Run Time', cls: 'big-tv-cs-run-elapsed', stateKey: 'rightMonitorCornerScoreElapsedEl' }
          ]
        },
        {
          cls: 'big-tv-corner-score-quadrant-bottom-left',
          title: 'Run Stats',
          fields: [
            { label: 'Bounces', cls: 'big-tv-cs-run-bounces', stateKey: 'rightMonitorCornerScoreBouncesEl' },
            { label: 'Near Misses', cls: 'big-tv-cs-run-near-misses', stateKey: 'rightMonitorCornerScoreNearMissesEl' }
          ]
        },
        {
          cls: 'big-tv-corner-score-quadrant-bottom-right',
          title: 'Server Totals',
          fields: [
            { label: 'Scores', cls: 'big-tv-cs-total-scores' },
            { label: 'Bounces', cls: 'big-tv-cs-total-bounces' },
            { label: 'Near Misses', cls: 'big-tv-cs-total-near-misses' },
            { label: 'Time', cls: 'big-tv-cs-total-time' },
            { label: 'Runs', cls: 'big-tv-cs-total-runs' }
          ]
        }
      ];
      metricQuadrants.forEach(({ cls, title, fields }) => {
        const quadrantEl = document.createElement('section');
        quadrantEl.className = `big-tv-corner-score-quadrant ${cls}`;
        const titleEl = document.createElement('p');
        titleEl.className = 'big-tv-corner-score-quadrant-title';
        titleEl.textContent = title;
        quadrantEl.appendChild(titleEl);
        const listEl = document.createElement('div');
        listEl.className = 'big-tv-corner-score-quadrant-list';
        fields.forEach(({ label, cls: valueClassName, stateKey }) => {
          const labelEl = document.createElement('span');
          labelEl.className = 'big-tv-corner-score-metric-label';
          labelEl.textContent = label;
          const valueEl = document.createElement('span');
          valueEl.className = `big-tv-corner-score-metric-value ${valueClassName}`;
          valueEl.textContent = '—';
          if (stateKey) {
            state[stateKey] = valueEl;
          }
          listEl.append(labelEl, valueEl);
        });
        quadrantEl.appendChild(listEl);
        highScoreStatsGridEl.appendChild(quadrantEl);
      });
      state.bigTvHighScoreStatsEl.append(highScoreStatsTitleEl, highScoreStatsGridEl);
      state.bigTvDvdOverlayEl.appendChild(state.bigTvHighScoreStatsEl);
      el.appendChild(state.bigTvDvdOverlayEl);
      applyDvdColorStep();
      if (DISCORD_WIDGET_URL) {
        const widgetFrame = document.createElement('iframe');
        widgetFrame.className = 'discord-widget-frame';
        widgetFrame.src = DISCORD_WIDGET_URL;
        widgetFrame.title = 'Discord server widget';
        state.discordWidgetFrameEl = widgetFrame;
        el.appendChild(widgetFrame);
      }
      el.appendChild(createBigTvFullscreenExitButton());
    }

    if (overlay.id === AQUARIUM_OVERLAY_ID) {
      state.aquariumOverlayEl = el;
      el.classList.add('aquarium-video-overlay', 'big-tv-fullscreen-target');
      el.appendChild(createBigTvFullscreenExitButton());

      state.aquariumStaticOverlayEl = document.createElement('div');
      state.aquariumStaticOverlayEl.className = 'discord-static-overlay';
      state.aquariumStaticVideoEl = document.createElement('video');
      state.aquariumStaticVideoEl.className = 'discord-static-video';
      state.aquariumStaticVideoEl.src = AQUARIUM_STATIC_VIDEO_URL;
      state.aquariumStaticVideoEl.muted = true;
      state.aquariumStaticVideoEl.defaultMuted = true;
      state.aquariumStaticVideoEl.playsInline = true;
      state.aquariumStaticOverlayEl.appendChild(state.aquariumStaticVideoEl);
      el.appendChild(state.aquariumStaticOverlayEl);

      state.nedryGateOverlayEl = document.createElement('div');
      state.nedryGateOverlayEl.className = 'nedry-gate-overlay';
      state.nedryGateVideoEl = document.createElement('video');
      state.nedryGateVideoEl.className = 'nedry-gate-video';
      state.nedryGateVideoEl.preload = 'none';
      state.nedryGateVideoEl.playsInline = true;
      state.nedryGateVideoEl.addEventListener('loadedmetadata', () => state._cb.updateBigTvDebugWatermarkPlacement?.());
      state.nedryGateOverlayEl.appendChild(state.nedryGateVideoEl);
      state.bigTvDebugWatermarkEl = document.createElement('div');
      state.bigTvDebugWatermarkEl.className = 'big-tv-debug-watermark';
      state.nedryGateOverlayEl.appendChild(state.bigTvDebugWatermarkEl);
      el.appendChild(state.nedryGateOverlayEl);

      const aquariumDepthOverlayLeftEl = document.createElement('img');
      aquariumDepthOverlayLeftEl.className = 'aquarium-depth-overlay aquarium-depth-overlay-left';
      aquariumDepthOverlayLeftEl.src = AQUARIUM_DEPTH_OVERLAY_LEFT_IMAGE_URL;
      aquariumDepthOverlayLeftEl.alt = '';
      aquariumDepthOverlayLeftEl.decoding = 'async';
      aquariumDepthOverlayLeftEl.loading = 'eager';
      aquariumDepthOverlayLeftEl.setAttribute('aria-hidden', 'true');
      el.appendChild(aquariumDepthOverlayLeftEl);
      const aquariumDepthOverlayRightEl = document.createElement('img');
      aquariumDepthOverlayRightEl.className = 'aquarium-depth-overlay aquarium-depth-overlay-right';
      aquariumDepthOverlayRightEl.src = AQUARIUM_DEPTH_OVERLAY_RIGHT_IMAGE_URL;
      aquariumDepthOverlayRightEl.alt = '';
      aquariumDepthOverlayRightEl.decoding = 'async';
      aquariumDepthOverlayRightEl.loading = 'eager';
      aquariumDepthOverlayRightEl.setAttribute('aria-hidden', 'true');
      el.appendChild(aquariumDepthOverlayRightEl);

      state.bigTvPromptOverlayEl = document.createElement('div');
      state.bigTvPromptOverlayEl.className = 'big-tv-prompt-overlay';
      const promptContent = document.createElement('div');
      promptContent.className = 'big-tv-prompt-content';
      state.bigTvPromptSecretBoxEl = document.createElement('button');
      state.bigTvPromptSecretBoxEl.type = 'button';
      state.bigTvPromptSecretBoxEl.className = 'big-tv-prompt-secret-box';
      state.bigTvPromptSecretEl = document.createElement('p');
      state.bigTvPromptSecretEl.className = 'big-tv-prompt-secret';
      state.bigTvPromptSecretEl.textContent = BIG_TV_PROMPT_SECRET_TEXT;
      state.bigTvPromptSecretBoxEl.appendChild(state.bigTvPromptSecretEl);
      const promptLine = document.createElement('div');
      promptLine.className = 'big-tv-prompt-line';
      const promptPrefix = document.createElement('span');
      promptPrefix.textContent = BIG_TV_PROMPT_PREFIX;
      state.bigTvPromptInputEl = document.createElement('span');
      state.bigTvPromptInputEl.className = 'big-tv-prompt-input';
      promptLine.append(promptPrefix, state.bigTvPromptInputEl);
      state.bigTvPromptSubmitButtonEl = document.createElement('button');
      state.bigTvPromptSubmitButtonEl.type = 'button';
      state.bigTvPromptSubmitButtonEl.className = 'big-tv-prompt-submit';
      state.bigTvPromptSubmitButtonEl.textContent = 'Submit';
      state.bigTvPromptSubmitButtonEl.addEventListener('click', (event) => {
        event.preventDefault();
        state._cb.handleBigTvPromptTyping?.({ key: 'Enter', preventDefault() {}, metaKey: false, ctrlKey: false, altKey: false });
      });
      promptContent.append(state.bigTvPromptSecretBoxEl, promptLine, state.bigTvPromptSubmitButtonEl);
      state.bigTvPromptHiddenInputEl = document.createElement('input');
      state.bigTvPromptHiddenInputEl.type = 'text';
      state.bigTvPromptHiddenInputEl.className = 'big-tv-prompt-hidden-input';
      state.bigTvPromptHiddenInputEl.addEventListener('input', () => {
        state.bigTvPromptInputValue = state.bigTvPromptHiddenInputEl.value;
        state._cb.updateBigTvPromptInput?.();
      });
      state.bigTvPromptHiddenInputEl.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          state._cb.submitBigTvPrompt?.();
        }
      });
      state.bigTvPromptOverlayEl.append(state.bigTvPromptHiddenInputEl, promptContent);
      el.appendChild(state.bigTvPromptOverlayEl);

      state.bigTvToolsOverlayEl = document.createElement('div');
      state.bigTvToolsOverlayEl.className = 'big-tv-tools-overlay';
      const toolsHeader = document.createElement('div');
      toolsHeader.className = 'big-tv-tools-header';
      state.bigTvToolsHeaderActionButtonEl = document.createElement('button');
      state.bigTvToolsHeaderActionButtonEl.type = 'button';
      state.bigTvToolsHeaderActionButtonEl.className = 'big-tv-tools-header-action';
      state.bigTvToolsHeaderActionButtonEl.textContent = '+';
      state.bigTvToolsHeaderActionButtonEl.addEventListener('click', () => {
        if (state.bigTvToolsViewMode === 'editor') state._cb.showBigTvToolsOverlay?.();
      });
      const toolsLogo = document.createElement('img');
      toolsLogo.className = 'big-tv-tools-logo';
      toolsLogo.src = BIG_TV_TOOLS_LOGO_URL;
      toolsHeader.append(state.bigTvToolsHeaderActionButtonEl, toolsLogo);
      state.bigTvToolsHintEl = document.createElement('p');
      state.bigTvToolsHintEl.className = 'big-tv-tools-hint';
      state.bigTvToolsHintEl.textContent = 'Press + to add a tool.';
      toolsHeader.append(state.bigTvToolsHintEl);
      state.bigTvToolsListEl = document.createElement('div');
      state.bigTvToolsListEl.className = 'big-tv-tools-list';
      state.bigTvToolsFooterEl = document.createElement('div');
      state.bigTvToolsFooterEl.className = 'big-tv-tools-footer is-hidden';
      state.bigTvToolsOverlayEl.append(toolsHeader, state.bigTvToolsListEl, state.bigTvToolsFooterEl);
      el.appendChild(state.bigTvToolsOverlayEl);

      state.loginOverlayEl = document.createElement('div');
      state.loginOverlayEl.className = 'login-overlay';
      const loginLogo = document.createElement('img');
      loginLogo.className = 'login-logo';
      loginLogo.src = LOGIN_LOGO_URL;
      state.loginStatusBadgeEl = document.createElement('div');
      state.loginTitleEl = document.createElement('h2');
      state.loginMessageEl = document.createElement('p');
      state.loginPrimaryActionButtonEl = document.createElement('button');
      state.loginPrimaryActionButtonEl.type = 'button';
      state.loginPrimaryActionButtonEl.className = 'login-submit';
      state.loginPrimaryActionButtonEl.addEventListener('click', () => void state._cb.handleLoginPrimaryAction?.());
      state.loginAuthCardEl = document.createElement('div');
      state.loginAuthCardEl.className = 'login-auth-card is-hidden';
      state.loginAuthAvatarEl = document.createElement('img');
      state.loginAuthUsernameValueEl = document.createElement('div');
      state.loginAuthUserIdValueEl = document.createElement('div');
      state.loginAuthMembershipValueEl = document.createElement('div');
      state.loginAuthAccessValueEl = document.createElement('div');
      state.loginAuthCardEl.append(state.loginAuthAvatarEl, state.loginAuthUsernameValueEl, state.loginAuthUserIdValueEl, state.loginAuthMembershipValueEl, state.loginAuthAccessValueEl);
      const loginBody = document.createElement('div');
      loginBody.className = 'login-body';
      loginBody.append(state.loginStatusBadgeEl, state.loginTitleEl, state.loginMessageEl, state.loginPrimaryActionButtonEl, state.loginAuthCardEl);
      state.loginOverlayEl.append(loginLogo, loginBody);
      el.appendChild(state.loginOverlayEl);
      state._cb.syncLoginOverlayUi?.();

      state.calendarBigTvOverlayEl = document.createElement('div');
      state.calendarBigTvOverlayEl.className = 'calendar-big-tv-overlay';
      state.calendarMonthImageEl = document.createElement('img');
      state.calendarMonthImageEl.className = 'calendar-big-tv-image';
      state.calendarBigTvOverlayEl.appendChild(state.calendarMonthImageEl);
      el.appendChild(state.calendarBigTvOverlayEl);
    }

    if (overlay.id === MONITOR_GROUP_LEFT_ID) {
      el.classList.add('monitor-group', 'monitor-group-left');

      // Layer 3 (topmost): L_Frame.png bezel — drawn above shadow and content
      const frameLayer = document.createElement('div');
      frameLayer.className = 'monitor-frame-layer';
      const frameImg = document.createElement('img');
      frameImg.className = 'monitor-frame-image';
      frameImg.src = LEFT_MONITOR_SIDE_FRAME_IMAGE_URL;
      frameImg.alt = '';
      frameLayer.appendChild(frameImg);
      el.appendChild(frameLayer);

      // Layer 2: power-on/off black overlay
      const shadowLayer = document.createElement('div');
      shadowLayer.className = 'monitor-shadow-layer';
      state.leftMonitorShadowOverlayEl = shadowLayer;
      el.appendChild(shadowLayer);

      // Layer 1: interactive screen content
      const windowEl = document.createElement('div');
      windowEl.className = 'monitor-overlay-layer monitor-screen-window left-monitor-screen-window';
      state.leftMonitorContentImageEl = document.createElement('img');
      state.leftMonitorContentImageEl.className = 'left-monitor-content-image';
      windowEl.appendChild(state.leftMonitorContentImageEl);
      const selector = document.createElement('div');
      selector.className = 'left-monitor-selector';
      selector.setAttribute('aria-hidden', 'false');
      state.leftMonitorSelectorEl = selector;
      LEFT_MONITOR_SEGMENTS.forEach(({ state: segmentState, label, quadrant }) => {
        const segment = document.createElement('button');
        segment.type = 'button';
        segment.className = 'left-monitor-segment';
        segment.dataset.quadrant = quadrant;
        segment.textContent = label;
        segment.setAttribute('aria-label', label);
        segment.addEventListener('click', async () => {
          if (!isLeftMonitorInteractive()) return;
          const isAuthenticated = await state._cb.ensureDiscordAuthForQuadrantAction?.();
          if (!isAuthenticated) {
            return;
          }
          const nextState = segmentState === state.leftMonitorSelectedState ? DEFAULT_LEFT_MONITOR_STATE : segmentState;
          state.shouldAutoStartDiscordLoginOnNextLoginActivation = nextState === 'login' && !state.discordAuthState?.authenticated;
          void activateLeftMonitorQuadrant(nextState);
        });
        state.leftMonitorSegmentButtonsByState.set(segmentState, segment);
        selector.appendChild(segment);
      });
      windowEl.appendChild(selector);
      // GitHub quadrant overlay (left monitor): shown when GitHub screensaver mode is active.
      state.bigTvGithubQuadrantEl = document.createElement('div');
      state.bigTvGithubQuadrantEl.className = 'big-tv-github-quadrant-overlay left-monitor-github-quadrant-overlay';
      state.bigTvGithubQuadrantEl.setAttribute('aria-hidden', 'true');
      const githubQuadrants = [
        { label: 'Issues',  url: GITHUB_V3_ISSUES_URL,  pos: 'top-left' },
        { label: 'Agents',  url: GITHUB_V3_AGENTS_URL,  pos: 'top-right' },
        { label: 'Wiki',    url: GITHUB_V3_WIKI_URL,    pos: 'bottom-left' },
        { label: 'Actions', url: GITHUB_V3_ACTIONS_URL, pos: 'bottom-right' }
      ];
      githubQuadrants.forEach(({ label, url, pos }) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `github-quadrant-btn github-quadrant-btn-${pos}`;
        btn.setAttribute('aria-label', `GitHub ${label}`);
        btn.textContent = label;
        btn.addEventListener('pointerdown', (e) => e.stopPropagation());
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const isAuthenticated = await state._cb.ensureDiscordAuthForQuadrantAction?.();
          if (!isAuthenticated) {
            return;
          }
          btn.classList.add('is-active');
          window.open(url, '_blank', 'noopener,noreferrer');
        });
        state.bigTvGithubQuadrantEl.appendChild(btn);
      });
      windowEl.appendChild(state.bigTvGithubQuadrantEl);
      syncGithubQuadrantOverlayVisibility();
      // Personal Best cornerscore overlay (shown on left monitor when cornerscore is active)
      state.leftMonitorCornerScoreOverlayEl = document.createElement('div');
      state.leftMonitorCornerScoreOverlayEl.className = 'left-monitor-corner-score-overlay';
      state.leftMonitorCornerScoreOverlayEl.setAttribute('aria-hidden', 'true');
      const pbTitleEl = document.createElement('p');
      pbTitleEl.className = 'left-monitor-cs-pb-title';
      pbTitleEl.textContent = 'Personal Best';
      state.leftMonitorCornerScoreOverlayEl.appendChild(pbTitleEl);
      const pbFields = [
        { label: 'Score', cls: 'left-monitor-cs-pb-score' },
        { label: 'Time', cls: 'left-monitor-cs-pb-time' },
        { label: 'Bounces', cls: 'left-monitor-cs-pb-bounces' },
        { label: 'Near Misses', cls: 'left-monitor-cs-pb-near-misses' },
        { label: 'Medal', cls: 'left-monitor-cs-pb-medal' }
      ];
      pbFields.forEach(({ label, cls }) => {
        const rowEl = document.createElement('div');
        rowEl.className = 'left-monitor-cs-pb-row';
        const labelEl = document.createElement('span');
        labelEl.className = 'left-monitor-cs-pb-label';
        labelEl.textContent = label;
        const valueEl = document.createElement('span');
        valueEl.className = `left-monitor-cs-pb-value ${cls}`;
        valueEl.textContent = '—';
        rowEl.append(labelEl, valueEl);
        state.leftMonitorCornerScoreOverlayEl.appendChild(rowEl);
      });
      windowEl.appendChild(state.leftMonitorCornerScoreOverlayEl);
      renderPersonalBestStats();

      // === LEFT MONITOR CARD SYSTEM ===
      // Card 1: CornerScore (4 quadrants)
      state.leftMonitorCornerScoreCardEl = document.createElement('div');
      state.leftMonitorCornerScoreCardEl.className = 'left-monitor-card left-monitor-cornerscore-card';
      state.leftMonitorCornerScoreCardEl.setAttribute('aria-hidden', 'true');
      
      const csCardGrid = document.createElement('div');
      csCardGrid.className = 'left-monitor-card-grid';
      
      // Quadrant UL: Current Run
      const csCurrentRunQuad = document.createElement('div');
      csCurrentRunQuad.className = 'left-monitor-card-quadrant cs-card-quad-ul';
      csCurrentRunQuad.innerHTML = `
        <div class="cs-card-quadrant-title">Current Run</div>
        <div class="cs-card-quadrant-content">
          <div class="cs-card-metric">
            <span class="cs-card-label">Score</span>
            <span class="cs-card-value cs-card-current-run-score">0</span>
          </div>
          <div class="cs-card-metric">
            <span class="cs-card-label">Time</span>
            <span class="cs-card-value cs-card-current-run-time">0:00</span>
          </div>
        </div>
      `;
      
      // Quadrant UR: Best Personal Run
      const csPBQuad = document.createElement('div');
      csPBQuad.className = 'left-monitor-card-quadrant cs-card-quad-ur';
      csPBQuad.innerHTML = `
        <div class="cs-card-quadrant-title">Personal Best</div>
        <div class="cs-card-quadrant-content">
          <div class="cs-card-metric">
            <span class="cs-card-label">Score</span>
            <span class="cs-card-value cs-card-pb-score">—</span>
          </div>
          <div class="cs-card-metric">
            <span class="cs-card-label">Time</span>
            <span class="cs-card-value cs-card-pb-time">—</span>
          </div>
        </div>
      `;
      
      // Quadrant LL: High-Score Run
      const csHighScoreQuad = document.createElement('div');
      csHighScoreQuad.className = 'left-monitor-card-quadrant cs-card-quad-ll';
      csHighScoreQuad.innerHTML = `
        <div class="cs-card-quadrant-title">High Score</div>
        <div class="cs-card-quadrant-content">
          <div class="cs-card-metric">
            <span class="cs-card-label">Score</span>
            <span class="cs-card-value cs-card-high-score">—</span>
          </div>
          <div class="cs-card-metric">
            <span class="cs-card-label">Initials</span>
            <span class="cs-card-value cs-card-high-score-initials">—</span>
          </div>
        </div>
      `;
      
      // Quadrant LR: Server Stats
      const csServerStatsQuad = document.createElement('div');
      csServerStatsQuad.className = 'left-monitor-card-quadrant cs-card-quad-lr';
      csServerStatsQuad.innerHTML = `
        <div class="cs-card-quadrant-title">Server Stats</div>
        <div class="cs-card-quadrant-content">
          <div class="cs-card-metric">
            <span class="cs-card-label">Scores</span>
            <span class="cs-card-value cs-card-server-scores">—</span>
          </div>
          <div class="cs-card-metric">
            <span class="cs-card-label">Bounces</span>
            <span class="cs-card-value cs-card-server-bounces">—</span>
          </div>
        </div>
      `;
      
      csCardGrid.append(csCurrentRunQuad, csPBQuad, csHighScoreQuad, csServerStatsQuad);
      state.leftMonitorCornerScoreCardEl.appendChild(csCardGrid);
      windowEl.appendChild(state.leftMonitorCornerScoreCardEl);

      // Card 2: Discord
      state.leftMonitorDiscordCardEl = document.createElement('div');
      state.leftMonitorDiscordCardEl.className = 'left-monitor-card left-monitor-discord-card';
      state.leftMonitorDiscordCardEl.setAttribute('aria-hidden', 'true');
      // Discord widget and join button will be handled separately
      windowEl.appendChild(state.leftMonitorDiscordCardEl);

      // Card 3: GitHub
      state.leftMonitorGithubCardEl = document.createElement('div');
      state.leftMonitorGithubCardEl.className = 'left-monitor-card left-monitor-github-card';
      state.leftMonitorGithubCardEl.setAttribute('aria-hidden', 'true');
      
      const githubCardGrid = document.createElement('div');
      githubCardGrid.className = 'left-monitor-card-grid github-card-grid';
      
      const githubQuadrants = [
        { label: 'Issues', url: GITHUB_V3_ISSUES_URL, cls: 'github-card-quad-ul' },
        { label: 'Agent', url: GITHUB_V3_AGENTS_URL, cls: 'github-card-quad-ur' },
        { label: 'Wiki', url: GITHUB_V3_WIKI_URL, cls: 'github-card-quad-ll' },
        { label: 'Actions', url: GITHUB_V3_ACTIONS_URL, cls: 'github-card-quad-lr' }
      ];
      
      githubQuadrants.forEach(({ label, url, cls }) => {
        const quadBtn = document.createElement('button');
        quadBtn.type = 'button';
        quadBtn.className = `left-monitor-card-quadrant github-card-btn ${cls}`;
        quadBtn.textContent = label;
        quadBtn.setAttribute('aria-label', `GitHub ${label}`);
        quadBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const isAuthenticated = await state._cb.ensureDiscordAuthForQuadrantAction?.();
          if (isAuthenticated) {
            window.open(url, '_blank', 'noopener,noreferrer');
          }
        });
        githubCardGrid.appendChild(quadBtn);
      });
      
      state.leftMonitorGithubCardEl.appendChild(githubCardGrid);
      windowEl.appendChild(state.leftMonitorGithubCardEl);

      // Card 4: Logged In
      state.leftMonitorLoggedInCardEl = document.createElement('div');
      state.leftMonitorLoggedInCardEl.className = 'left-monitor-card left-monitor-logged-in-card';
      state.leftMonitorLoggedInCardEl.setAttribute('aria-hidden', 'true');
      
      const loggedInCardGrid = document.createElement('div');
      loggedInCardGrid.className = 'left-monitor-card-grid logged-in-card-grid';
      
      const loggedInQuadrants = [
        { label: 'Tools', action: () => state._cb.setLeftMonitorState?.('tools'), cls: 'logged-in-card-quad-ul' },
        { label: 'Inventory', action: () => console.log('Inventory clicked'), cls: 'logged-in-card-quad-ur' },
        { label: 'Cal.Dot', action: () => state._cb.setLeftMonitorState?.('calendar'), cls: 'logged-in-card-quad-ll' },
        { label: 'Notes', action: () => window.open('/notes.html', '_blank'), cls: 'logged-in-card-quad-lr' }
      ];
      
      loggedInQuadrants.forEach(({ label, action, cls }) => {
        const quadBtn = document.createElement('button');
        quadBtn.type = 'button';
        quadBtn.className = `left-monitor-card-quadrant logged-in-card-btn ${cls}`;
        quadBtn.textContent = label;
        quadBtn.setAttribute('aria-label', label);
        quadBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          action();
        });
        loggedInCardGrid.appendChild(quadBtn);
      });
      
      state.leftMonitorLoggedInCardEl.appendChild(loggedInCardGrid);
      windowEl.appendChild(state.leftMonitorLoggedInCardEl);

      state.leftMonitorStaticOverlayEl = document.createElement('div');
      state.leftMonitorStaticOverlayEl.className = 'overlay-static-layer';
      state.leftMonitorStaticVideoEl = document.createElement('video');
      state.leftMonitorStaticVideoEl.className = 'overlay-static-video';
      state.leftMonitorStaticVideoEl.src = AQUARIUM_STATIC_VIDEO_URL;
      state.leftMonitorStaticVideoEl.muted = true;
      state.leftMonitorStaticVideoEl.defaultMuted = true;
      state.leftMonitorStaticVideoEl.loop = true;
      state.leftMonitorStaticVideoEl.playsInline = true;
      state.leftMonitorStaticVideoEl.setAttribute('webkit-playsinline', '');
      state.leftMonitorStaticOverlayEl.appendChild(state.leftMonitorStaticVideoEl);
      windowEl.append(state.leftMonitorStaticOverlayEl);
      el.appendChild(windowEl);
      setLeftMonitorState(state.leftMonitorSelectedState);
    }

    if (overlay.id === 'overlay-commodore-screen') {
      el.classList.add('commodore-desk-overlay');
      const imageEl = document.createElement('img');
      imageEl.className = 'commodore-desk-image';
      imageEl.src = COMMODORE_DESK_IMAGE_URL;
      imageEl.alt = '';
      el.appendChild(imageEl);
    }

    if (overlay.id === MONITOR_GROUP_MIDDLE_ID) {
      el.classList.add('monitor-group', 'monitor-group-middle');

      // Layer 1: power-on/off black overlay (Commodore desk image provides bezel/screen art)
      const shadowLayer = document.createElement('div');
      shadowLayer.className = 'monitor-shadow-layer';
      state.commodoreShadowOverlayEl = shadowLayer;
      el.appendChild(shadowLayer);
    }

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
    if (overlay.id === MONITOR_GROUP_RIGHT_ID) {
      el.classList.add('monitor-group', 'monitor-group-right');

      // Layer 3 (topmost): R_Frame.png bezel
      const frameLayer = document.createElement('div');
      frameLayer.className = 'monitor-frame-layer';
      const frameImg = document.createElement('img');
      frameImg.className = 'monitor-frame-image';
      frameImg.src = RIGHT_MONITOR_SIDE_FRAME_IMAGE_URL;
      frameImg.alt = '';
      frameLayer.appendChild(frameImg);
      el.appendChild(frameLayer);

      // Layer 2: power-on/off black overlay
      const shadowLayer = document.createElement('div');
      shadowLayer.className = 'monitor-shadow-layer';
      state.rightMonitorShadowOverlayEl = shadowLayer;
      el.appendChild(shadowLayer);

      // Layer 1: interactive screen content
      const windowEl = document.createElement('div');
      windowEl.className = 'monitor-overlay-layer monitor-screen-window right-monitor-screen-window';
      state.rightMonitorScreenWindowEl = windowEl;
      state.discordJoinButtonEl = document.createElement('button');
      state.discordJoinButtonEl.className = 'join-discord-button';
      state.discordJoinButtonEl.type = 'button';
      state.discordJoinButtonEl.addEventListener('pointerdown', (event) => event.stopPropagation());
      state.discordJoinButtonEl.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        state._cb.handleDiscordJoinButtonAction?.();
      });
      state.discordButtonImgEl = document.createElement('img');
      state.discordButtonImgEl.className = 'join-discord-button-image';
      state.discordButtonImgEl.src = DISCORD_BUTTON_IMAGE_URL;
      state.discordJoinButtonEl.appendChild(state.discordButtonImgEl);
      windowEl.appendChild(state.discordJoinButtonEl);
      state.rightMonitorCornerScoreOverlayEl = document.createElement('div');
      state.rightMonitorCornerScoreOverlayEl.className = 'right-monitor-corner-score-overlay';
      const rightMonitorCornerScoreLabelEl = document.createElement('p');
      rightMonitorCornerScoreLabelEl.className = 'right-monitor-corner-score-label';
      rightMonitorCornerScoreLabelEl.textContent = 'Corner Score';
      state.rightMonitorCornerScoreValueEl = document.createElement('p');
      state.rightMonitorCornerScoreValueEl.className = 'right-monitor-corner-score-value';
      state.bigTvCornerScoreInitialsPromptEl = document.createElement('form');
      state.bigTvCornerScoreInitialsPromptEl.className = 'big-tv-corner-score-initials-prompt';
      state.bigTvCornerScoreInitialsPromptEl.setAttribute('aria-hidden', 'true');
      const initialsLabelEl = document.createElement('label');
      initialsLabelEl.className = 'big-tv-corner-score-initials-label';
      initialsLabelEl.textContent = 'Initials';
      state.bigTvCornerScoreInitialsInputEl = document.createElement('input');
      state.bigTvCornerScoreInitialsInputEl.className = 'big-tv-corner-score-initials-input';
      state.bigTvCornerScoreInitialsInputEl.type = 'text';
      state.bigTvCornerScoreInitialsInputEl.autocomplete = 'off';
      state.bigTvCornerScoreInitialsInputEl.autocapitalize = 'characters';
      state.bigTvCornerScoreInitialsInputEl.maxLength = 3;
      state.bigTvCornerScoreInitialsInputEl.setAttribute('aria-label', 'Corner score initials');
      state.bigTvCornerScoreInitialsInputEl.addEventListener('input', () => {
        state.bigTvCornerScoreInitialsInputEl.value = sanitizeCornerScoreInitialsInput(state.bigTvCornerScoreInitialsInputEl.value);
        syncCornerScoreInitialsSubmitState();
      });
      state.bigTvCornerScoreInitialsSubmitButtonEl = document.createElement('button');
      state.bigTvCornerScoreInitialsSubmitButtonEl.type = 'submit';
      state.bigTvCornerScoreInitialsSubmitButtonEl.className = 'big-tv-corner-score-initials-submit';
      state.bigTvCornerScoreInitialsSubmitButtonEl.textContent = 'Save';
      initialsLabelEl.appendChild(state.bigTvCornerScoreInitialsInputEl);
      state.bigTvCornerScoreInitialsPromptEl.append(initialsLabelEl, state.bigTvCornerScoreInitialsSubmitButtonEl);
      state.bigTvCornerScoreInitialsPromptEl.addEventListener('submit', (event) => {
        event.preventDefault();
        submitCornerScoreInitials();
      });
      state.rightMonitorCornerScoreOverlayEl.append(rightMonitorCornerScoreLabelEl, state.rightMonitorCornerScoreValueEl);
      state.rightMonitorCornerScoreOverlayEl.appendChild(state.bigTvCornerScoreInitialsPromptEl);
      renderCornerScore();
      syncCornerScoreInitialsPromptVisibility();
      syncCornerScoreInitialsSubmitState();
      windowEl.appendChild(state.rightMonitorCornerScoreOverlayEl);
      state.rightMonitorStaticOverlayEl = document.createElement('div');
      state.rightMonitorStaticOverlayEl.className = 'overlay-static-layer';
      state.rightMonitorStaticVideoEl = document.createElement('video');
      state.rightMonitorStaticVideoEl.className = 'overlay-static-video';
      state.rightMonitorStaticVideoEl.src = AQUARIUM_STATIC_VIDEO_URL;
      state.rightMonitorStaticVideoEl.muted = true;
      state.rightMonitorStaticVideoEl.loop = true;
      state.rightMonitorStaticVideoEl.playsInline = true;
      state.rightMonitorStaticVideoEl.setAttribute('webkit-playsinline', '');
      state.rightMonitorStaticOverlayEl.appendChild(state.rightMonitorStaticVideoEl);
      windowEl.appendChild(state.rightMonitorStaticOverlayEl);
      state.rightMonitorShrimpLogoOverlayEl = document.createElement('div');
      state.rightMonitorShrimpLogoOverlayEl.className = 'right-monitor-shrimp-logo-overlay';
      const shrimpLogoImg = document.createElement('img');
      shrimpLogoImg.className = 'right-monitor-shrimp-logo-image';
      shrimpLogoImg.src = STARSHRIMP_LOGO_IMAGE_URL;
      state.rightMonitorShrimpLogoOverlayEl.appendChild(shrimpLogoImg);
      windowEl.appendChild(state.rightMonitorShrimpLogoOverlayEl);
      el.appendChild(windowEl);
      applyDvdColorStep();
    }

    if (overlay.id === WHITEBOARD_CORNER_SCORE_OVERLAY_ID) {
      el.classList.add('whiteboard-corner-score-overlay');
      const whiteboardStackEl = document.createElement('div');
      whiteboardStackEl.className = 'whiteboard-corner-score-stack';
      const whiteboardLineTopEl = document.createElement('p');
      whiteboardLineTopEl.className = 'whiteboard-corner-score-line';
      whiteboardLineTopEl.textContent = 'High';
      const whiteboardLineBottomEl = document.createElement('p');
      whiteboardLineBottomEl.className = 'whiteboard-corner-score-line';
      whiteboardLineBottomEl.textContent = 'Score';
      state.whiteboardCornerScoreValueEl = document.createElement('p');
      state.whiteboardCornerScoreValueEl.className = 'whiteboard-corner-score-value';
      state.whiteboardCornerScoreInitialsGroupEl = document.createElement('div');
      state.whiteboardCornerScoreInitialsGroupEl.className = 'whiteboard-corner-score-initials-group';
      const whiteboardCornerScoreInitialsTitleEl = document.createElement('p');
      whiteboardCornerScoreInitialsTitleEl.className = 'whiteboard-corner-score-initials-title';
      whiteboardCornerScoreInitialsTitleEl.textContent = 'Initials';
      state.whiteboardCornerScoreInitialsEl = document.createElement('p');
      state.whiteboardCornerScoreInitialsEl.className = 'whiteboard-corner-score-initials';
      state.whiteboardCornerScoreInitialsGroupEl.append(whiteboardCornerScoreInitialsTitleEl, state.whiteboardCornerScoreInitialsEl);
      whiteboardStackEl.append(
        whiteboardLineTopEl,
        whiteboardLineBottomEl,
        state.whiteboardCornerScoreValueEl,
        state.whiteboardCornerScoreInitialsGroupEl
      );
      el.appendChild(whiteboardStackEl);
      renderCornerScore();
    }

    if (overlay.id === FLIP_CLOCK_OVERLAY_ID) {
      el.classList.add('flip-clock-overlay');
      el.addEventListener('pointerdown', (event) => event.stopPropagation());
      el.addEventListener('click', (event) => event.stopPropagation());

      function makeClockZone(className, ariaLabel, onClick) {
        const zone = document.createElement('button');
        zone.type = 'button';
        zone.className = `rc-zone ${className}`;
        zone.setAttribute('aria-label', ariaLabel);
        zone.addEventListener('pointerdown', (e) => e.stopPropagation());
        zone.addEventListener('click', (e) => { e.stopPropagation(); onClick(); });
        return zone;
      }

      const top = document.createElement('div');
      top.className = 'rc-top';
      const sleepKnob = document.createElement('div');
      sleepKnob.className = 'rc-knob';
      sleepKnob.setAttribute('aria-hidden', 'true');
      const speaker = document.createElement('div');
      speaker.className = 'rc-speaker';
      speaker.setAttribute('aria-hidden', 'true');
      const tunerKnob = document.createElement('div');
      tunerKnob.className = 'rc-knob';
      tunerKnob.setAttribute('aria-hidden', 'true');
      top.append(sleepKnob, speaker, tunerKnob);

      const face = document.createElement('div');
      face.className = 'rc-face';

      const clockZone = makeClockZone('rc-clock-zone', 'Open Clock App', () => state._cb.openClockApp?.());
      const clockDigits = document.createElement('div');
      clockDigits.className = 'fc-digits';
      const h1 = createFlipCard(false); h1.dataset.key = 'h1';
      const h2 = createFlipCard(false); h2.dataset.key = 'h2';
      const timeGap = document.createElement('span');
      timeGap.className = 'rc-time-gap';
      timeGap.setAttribute('aria-hidden', 'true');
      const m1 = createFlipCard(false); m1.dataset.key = 'm1';
      const m2 = createFlipCard(false); m2.dataset.key = 'm2';
      clockDigits.append(h1, h2, timeGap, m1, m2);
      clockZone.append(clockDigits);

      const radioZone = document.createElement('div');
      radioZone.className = 'rc-radio-zone';

      const model = document.createElement('div');
      model.className = 'rc-model';
      model.textContent = 'FM/AM';

      const dateBadge = document.createElement('div');
      dateBadge.className = 'rc-date-badge';
      dateBadge.dataset.key = 'date-badge';
      dateBadge.textContent = 'JAN 01';

      const scaleBlock = document.createElement('div');
      scaleBlock.className = 'rc-scale-block';

      const selectorLine = document.createElement('div');
      selectorLine.className = 'rc-selector-line';
      selectorLine.setAttribute('aria-hidden', 'true');

      let tuningPosition = applyRadioTuningPosition(scaleBlock, DVD_ACCELEROMETER_DEFAULT_POSITION);
      let tuningAudio = state.flipClockRadioTuningAudioEl || getRadioTuningAudioElement(getNextRadioTuningAudioUrl());
      state.flipClockRadioTuningAudioEl = tuningAudio;
      resetRadioTuningPlayback(tuningAudio);

      const TUNING_DRAG_THRESHOLD_PX = 1;
      const KEYBOARD_TUNING_STEP = 0.02;
      const KEYBOARD_AUDIO_STOP_DELAY_MS = 120;
      const TUNING_POSITION_CHANGE_THRESHOLD = 0.001;
      let activeTunePointerId = null;
      let lastPointerClientX = 0;
      let stopTuneAudioTimeoutId = null;

      const selectorDot = document.createElement('div');
      selectorDot.className = 'rc-selector-dot';
      selectorDot.setAttribute('role', 'slider');
      selectorDot.setAttribute('tabindex', '0');
      selectorDot.setAttribute('aria-label', 'Adjust DVD screensaver acceleration');
      selectorDot.setAttribute('aria-valuemin', String(Math.round(DVD_ACCELEROMETER_MULTIPLIER_MIN * 100)));
      selectorDot.setAttribute('aria-valuemax', String(Math.round(DVD_ACCELEROMETER_MULTIPLIER_MAX * 100)));
      syncDvdAccelerometerFromTuningPosition(tuningPosition, selectorDot);

      function updateTuningFromClientX(clientX) {
        const rect = scaleBlock.getBoundingClientRect();
        if (!rect.width) return false;
        const nextPosition = clamp((clientX - rect.left) / rect.width, 0, 1);
        if (Math.abs(nextPosition - tuningPosition) < TUNING_POSITION_CHANGE_THRESHOLD) return false;
        tuningPosition = applyRadioTuningPosition(scaleBlock, nextPosition);
        syncDvdAccelerometerFromTuningPosition(tuningPosition, selectorDot);
        resetRadioTuningPlayback(tuningAudio);
        ensureRadioTuningLoopPlayback(tuningAudio);
        return true;
      }

      function endTuneDrag(pointerId) {
        if (activeTunePointerId !== pointerId) return;
        activeTunePointerId = null;
        stopRadioTuningLoopPlayback(tuningAudio);
        if (scaleBlock.hasPointerCapture(pointerId)) {
          scaleBlock.releasePointerCapture(pointerId);
        }
      }

      function selectNextTuningAudio() {
        const nextAudio = getRadioTuningAudioElement(getNextRadioTuningAudioUrl());
        if (tuningAudio && tuningAudio !== nextAudio) {
          stopRadioTuningLoopPlayback(tuningAudio);
        }
        tuningAudio = nextAudio;
        state.flipClockRadioTuningAudioEl = tuningAudio;
        resetRadioTuningPlayback(tuningAudio);
      }

      function beginTuneDrag(event) {
        if (typeof event.button === 'number' && event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        activeTunePointerId = event.pointerId;
        lastPointerClientX = event.clientX;
        scaleBlock.setPointerCapture(event.pointerId);
        selectNextTuningAudio();
        const didUpdate = updateTuningFromClientX(event.clientX);
        if (!didUpdate) {
          resetRadioTuningPlayback(tuningAudio);
          ensureRadioTuningLoopPlayback(tuningAudio);
        }
      }

      scaleBlock.addEventListener('pointerdown', beginTuneDrag);
      selectorDot.addEventListener('pointerdown', beginTuneDrag);

      scaleBlock.addEventListener('pointermove', (event) => {
        if (event.pointerId !== activeTunePointerId) return;
        event.preventDefault();
        event.stopPropagation();
        const didMove = updateTuningFromClientX(event.clientX);
        if (!didMove && Math.abs(event.clientX - lastPointerClientX) > TUNING_DRAG_THRESHOLD_PX) {
          ensureRadioTuningLoopPlayback(tuningAudio);
        }
        lastPointerClientX = event.clientX;
      });

      scaleBlock.addEventListener('pointerup', (event) => {
        event.preventDefault();
        event.stopPropagation();
        endTuneDrag(event.pointerId);
      });
      scaleBlock.addEventListener('pointercancel', (event) => {
        event.preventDefault();
        event.stopPropagation();
        endTuneDrag(event.pointerId);
      });
      scaleBlock.addEventListener('lostpointercapture', () => {
        activeTunePointerId = null;
        stopRadioTuningLoopPlayback(tuningAudio);
      });
      selectorDot.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
      });
      selectorDot.addEventListener('keydown', (event) => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault();
        event.stopPropagation();
        const step = event.key === 'ArrowRight' ? KEYBOARD_TUNING_STEP : -KEYBOARD_TUNING_STEP;
        tuningPosition = applyRadioTuningPosition(scaleBlock, tuningPosition + step);
        syncDvdAccelerometerFromTuningPosition(tuningPosition, selectorDot);
        resetRadioTuningPlayback(tuningAudio);
        ensureRadioTuningLoopPlayback(tuningAudio);
        if (stopTuneAudioTimeoutId !== null) {
          window.clearTimeout(stopTuneAudioTimeoutId);
        }
        stopTuneAudioTimeoutId = window.setTimeout(() => {
          stopTuneAudioTimeoutId = null;
          stopRadioTuningLoopPlayback(tuningAudio);
        }, KEYBOARD_AUDIO_STOP_DELAY_MS);
      });

      const fmRow = document.createElement('div');
      fmRow.className = 'rc-scale-row';
      fmRow.innerHTML = `
        <span class="rc-band">FM</span>
        <span class="rc-frequencies">
          <span>88</span><span>92</span><span>96</span><span>100</span><span>104</span><span>108</span>
        </span>
        <span class="rc-unit">MHz</span>
      `;

      const amRow = document.createElement('div');
      amRow.className = 'rc-scale-row';
      amRow.innerHTML = `
        <span class="rc-band">AM</span>
        <span class="rc-frequencies">
          <span>53</span><span>60</span><span>70</span><span>90</span><span>120</span><span>160</span>
        </span>
        <span class="rc-unit">kHz</span>
      `;

      const selectorLabel = document.createElement('div');
      selectorLabel.className = 'rc-selector-label';
      selectorLabel.textContent = 'Tuning';

      const brand = document.createElement('div');
      brand.className = 'rc-brand';
      brand.textContent = 'Panasonic';

      scaleBlock.append(selectorLine, selectorDot, fmRow, amRow);
      radioZone.append(model, dateBadge, scaleBlock, selectorLabel, brand);

      face.append(clockZone, radioZone);
      el.append(top, face);

      requestAnimationFrame(() => startFlipClock(el));
    }

    if (overlay.id === GITHUB_SHELF_OBJECT_OVERLAY_ID) {
      el.classList.add('github-shelf-object-overlay');
      const imgEl = document.createElement('img');
      imgEl.className = 'github-shelf-image';
      state.githubShelfImageEl = imgEl;
      syncGithubShelfObjectImage();
      imgEl.alt = '';
      imgEl.setAttribute('aria-hidden', 'true');
      el.appendChild(imgEl);
    }

    if (BIG_TV_FULLSCREEN_OVERLAY_IDS.has(overlay.id)) {
      el.addEventListener('click', (event) => {
        const clickedInteractive = event.target instanceof Element && event.target.closest(BIG_TV_INTERACTIVE_UI_SELECTORS);
        if (clickedInteractive) return;
      });
    }

    state.overlayElementsById.set(overlay.id, el);
    document.getElementById('screen-overlay-layer')?.appendChild(el);
  });
  state._cb.syncDiscordButtonUi?.();
  state._cb.syncBigTvDebugWatermark?.();
}

function initOverlays() {
  createOverlays();
}

state._cb.syncBigTvContentVisibility = syncBigTvContentVisibility;
state._cb.setLeftMonitorState = setLeftMonitorState;
state._cb.enterBigTvFullscreen = enterBigTvFullscreen;
state._cb.exitBigTvFullscreen = exitBigTvFullscreen;
state._cb.syncBigTvFullscreenUi = syncBigTvFullscreenUi;
state._cb.setRightMonitorOverlayImageUrl = setRightMonitorOverlayImageUrl;
state._cb.isBigTvFullscreenTarget = isBigTvFullscreenTarget;
state._cb.hideCalendarBigTvOverlay = hideCalendarBigTvOverlay;
state._cb.activateCalendarMode = activateCalendarMode;
state._cb.activateGithubScreensaverMode = activateGithubScreensaverMode;
state._cb.deactivateGithubScreensaverMode = deactivateGithubScreensaverMode;
state._cb.activateLeftMonitorQuadrant = activateLeftMonitorQuadrant;

export {
  syncBigTvContentVisibility,
  isBigTvFullscreenTarget,
  getActiveBigTvFullscreenTarget,
  syncBigTvFullscreenUi,
  enterBigTvFullscreen,
  exitBigTvFullscreen,
  createBigTvFullscreenExitButton,
  syncLeftMonitorSelectionUi,
  setLeftMonitorState,
  setRightMonitorOverlayImageUrl,
  showCalendarBigTvOverlay,
  hideCalendarBigTvOverlay,
  compareCalendarMonths,
  resolveCalendarImageMonth,
  getCalendarMonthImageUrl,
  activateCalendarMode,
  activateGithubScreensaverMode,
  deactivateGithubScreensaverMode,
  activateLeftMonitorQuadrant,
  playLeftMonitorStaticPass,
  createOverlays,
  initOverlays,
  positionOverlay,
  applyOverlayTransforms
};
