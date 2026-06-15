import {
  AQUARIUM_OVERLAY_ID,
  AQUARIUM_STATIC_VIDEO_URL,
  BIG_TV_SHADOW_LAYER_ID,
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
  COMMODORE_SHADOW_OVERLAY_ID,
  DEFAULT_LEFT_MONITOR_STATE,
  DISCORD_BUTTON_IMAGE_URL,
  DISCORD_OVERLAY_ID,
  DISCORD_WIDGET_URL,
  LEFT_MONITOR_SIDE_FRAME_IMAGE_URL,
  LEFT_MONITOR_IMAGE_URLS,
  LEFT_MONITOR_SHADOW_LAYER_ID,
  LEFT_MONITOR_SIDE_FRAME_OVERLAY_ID,
  LEFT_MONITOR_SEGMENTS,
  LEFT_MONITOR_STATES,
  LOGIN_LOGO_URL,
  RIGHT_MONITOR_SHADOW_LAYER_ID,
  RIGHT_MONITOR_SIDE_FRAME_IMAGE_URL,
  RIGHT_MONITOR_SIDE_FRAME_OVERLAY_ID,
  STARSHRIMP_LOGO_IMAGE_URL,
  WHITEBOARD_CORNER_SCORE_OVERLAY_ID,
  FLIP_CLOCK_OVERLAY_ID,
  overlayDefaults
} from '../core/constants.js';
import { state } from '../core/state.js';
import { applyDvdColorStep } from '../systems/dvd.js';
import { renderCornerScore, sanitizeCornerScoreInitialsInput, submitCornerScoreInitials, syncCornerScoreInitialsPromptVisibility, syncCornerScoreInitialsSubmitState } from '../systems/cornerScore.js';
import { createFlipCard, startFlipClock } from '../systems/flipClock.js';
import { isBigTvMonitorInteractive, isLeftMonitorInteractive, isRightMonitorInteractive } from '../systems/monitors.js';
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
  if (nextState === 'tools' && isLeftMonitorInteractive() && isBigTvMonitorInteractive()) {
    hideCalendarBigTvOverlay();
    state._cb.hideLoginOverlay?.();
    void state._cb.activateBigTvToolsMode?.();
  } else if (nextState === 'login' && isLeftMonitorInteractive() && isBigTvMonitorInteractive()) {
    hideCalendarBigTvOverlay();
    state._cb.hideBigTvToolsOverlay?.();
    void state._cb.activateLoginMode?.();
  } else if (nextState === 'calendar' && isLeftMonitorInteractive() && isBigTvMonitorInteractive()) {
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
  state.aquariumOverlayEl = null;
  state.commodorePowerButtonEl = null;
  state.commodoreShadowOverlayEl = null;
  state.bigTvShadowOverlayEl = null;
  state.leftMonitorShadowOverlayEl = null;
  state.rightMonitorShadowOverlayEl = null;
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
      el.appendChild(state.bigTvDvdOverlayEl);
      applyDvdColorStep();
      if (DISCORD_WIDGET_URL) {
        const widgetFrame = document.createElement('iframe');
        widgetFrame.className = 'discord-widget-frame';
        widgetFrame.src = DISCORD_WIDGET_URL;
        widgetFrame.title = 'Discord server widget';
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

    if (overlay.id === COMMODORE_SHADOW_OVERLAY_ID) {
      el.classList.add('commodore-shadow-overlay');
      state.commodoreShadowOverlayEl = el;
    }

    if (overlay.id === BIG_TV_SHADOW_LAYER_ID) {
      el.classList.add('monitor-shadow-overlay');
      state.bigTvShadowOverlayEl = el;
    }

    if (overlay.id === LEFT_MONITOR_SHADOW_LAYER_ID) {
      el.classList.add('monitor-shadow-overlay');
      state.leftMonitorShadowOverlayEl = el;
    }

    if (overlay.id === RIGHT_MONITOR_SHADOW_LAYER_ID) {
      el.classList.add('monitor-shadow-overlay');
      state.rightMonitorShadowOverlayEl = el;
    }

    if (overlay.id === COMMODORE_POWER_BUTTON_OVERLAY_ID) {
      el.classList.add('commodore-power-button-overlay');
      state.commodorePowerButtonEl = document.createElement('button');
      state.commodorePowerButtonEl.type = 'button';
      state.commodorePowerButtonEl.className = 'commodore-power-button-button';
      state.commodorePowerButtonEl.setAttribute('aria-label', 'Power on Commodore monitors');
      state.commodorePowerButtonEl.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        state._cb.triggerCommodorePowerOnSequence?.();
      });
      el.appendChild(state.commodorePowerButtonEl);
    }

    if (overlay.id === 'overlay-left-monitor') {
      const windowEl = document.createElement('div');
      windowEl.className = 'monitor-screen-window left-monitor-screen-window';
      state.leftMonitorContentImageEl = document.createElement('img');
      windowEl.appendChild(state.leftMonitorContentImageEl);
      const selector = document.createElement('div');
      selector.className = 'left-monitor-selector';
      LEFT_MONITOR_SEGMENTS.forEach(({ state: segmentState, quadrant }) => {
        const segment = document.createElement('button');
        segment.type = 'button';
        segment.className = 'left-monitor-segment';
        segment.dataset.quadrant = quadrant;
        segment.addEventListener('click', () => {
          if (!isLeftMonitorInteractive()) return;
          const nextState = segmentState === state.leftMonitorSelectedState ? DEFAULT_LEFT_MONITOR_STATE : segmentState;
          state.shouldAutoStartDiscordLoginOnNextLoginActivation = nextState === 'login' && !state.discordAuthState?.authenticated;
          void activateLeftMonitorQuadrant(nextState);
        });
        state.leftMonitorSegmentButtonsByState.set(segmentState, segment);
        selector.appendChild(segment);
      });
      windowEl.appendChild(selector);
      state.leftMonitorStaticOverlayEl = document.createElement('div');
      state.leftMonitorStaticOverlayEl.className = 'overlay-static-layer';
      state.leftMonitorStaticVideoEl = document.createElement('video');
      state.leftMonitorStaticVideoEl.src = AQUARIUM_STATIC_VIDEO_URL;
      state.leftMonitorStaticVideoEl.muted = true;
      state.leftMonitorStaticVideoEl.loop = true;
      state.leftMonitorStaticOverlayEl.appendChild(state.leftMonitorStaticVideoEl);
      windowEl.append(state.leftMonitorStaticOverlayEl);
      el.appendChild(windowEl);
      setLeftMonitorState(state.leftMonitorSelectedState);
    }

    if (overlay.id === LEFT_MONITOR_SIDE_FRAME_OVERLAY_ID) {
      el.classList.add('monitor-side-frame-overlay');
      const imageEl = document.createElement('img');
      imageEl.className = 'monitor-side-frame-image';
      imageEl.src = LEFT_MONITOR_SIDE_FRAME_IMAGE_URL;
      imageEl.alt = '';
      el.appendChild(imageEl);
    }

    if (overlay.id === 'overlay-commodore-screen') {
      const imageEl = document.createElement('img');
      imageEl.className = 'commodore-desk-image';
      imageEl.src = COMMODORE_DESK_IMAGE_URL;
      imageEl.alt = '';
      el.appendChild(imageEl);
    }

    if (overlay.id === 'overlay-right-monitor') {
      const windowEl = document.createElement('div');
      windowEl.className = 'monitor-screen-window right-monitor-screen-window';
      state.rightMonitorScreenWindowEl = windowEl;
      state.discordJoinButtonEl = document.createElement('button');
      state.discordJoinButtonEl.className = 'join-discord-button';
      state.discordJoinButtonEl.type = 'button';
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
      state.rightMonitorStaticVideoEl.src = AQUARIUM_STATIC_VIDEO_URL;
      state.rightMonitorStaticVideoEl.muted = true;
      state.rightMonitorStaticVideoEl.loop = true;
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

    if (overlay.id === RIGHT_MONITOR_SIDE_FRAME_OVERLAY_ID) {
      el.classList.add('monitor-side-frame-overlay');
      const imageEl = document.createElement('img');
      imageEl.className = 'monitor-side-frame-image';
      imageEl.src = RIGHT_MONITOR_SIDE_FRAME_IMAGE_URL;
      imageEl.alt = '';
      el.appendChild(imageEl);
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
      const digits = document.createElement('div');
      digits.className = 'fc-digits';
      const h1 = createFlipCard(false); h1.dataset.key = 'h1';
      const h2 = createFlipCard(false); h2.dataset.key = 'h2';
      const m1 = createFlipCard(false); m1.dataset.key = 'm1';
      const m2 = createFlipCard(false); m2.dataset.key = 'm2';
      const dateBadge = document.createElement('div');
      dateBadge.className = 'rc-date-badge';
      dateBadge.dataset.key = 'date-badge';
      digits.append(h1, h2, m1, m2, dateBadge);
      el.appendChild(digits);
      requestAnimationFrame(() => startFlipClock(el));
    }

    if (BIG_TV_FULLSCREEN_OVERLAY_IDS.has(overlay.id)) {
      el.addEventListener('click', (event) => {
        if (!isBigTvMonitorInteractive()) return;
        const clickedInteractive = event.target instanceof Element && event.target.closest(BIG_TV_INTERACTIVE_UI_SELECTORS);
        if (clickedInteractive) return;
        void enterBigTvFullscreen(el);
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
  activateLeftMonitorQuadrant,
  playLeftMonitorStaticPass,
  createOverlays,
  initOverlays,
  positionOverlay,
  applyOverlayTransforms
};
