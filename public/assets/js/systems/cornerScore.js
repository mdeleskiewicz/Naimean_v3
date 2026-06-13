import { API_TIMEOUT_MS, CORNER_SCORE_API_URL, CORNER_SCORE_INITIALS_LENGTH, CORNER_SCORE_INITIALS_PLACEHOLDER, CORNER_SCORE_SERVER_BASELINE, DVD_MISS_INDICATOR_DURATION_MS, WRONG_AUDIO_URL } from '../core/constants.js';
import { state } from '../core/state.js';
import { isRightMonitorInteractive, wakeRightMonitorForCornerScore } from './monitors.js';

function sanitizeCornerScoreInitialsInput(value) {
  return String(value ?? '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, CORNER_SCORE_INITIALS_LENGTH);
}

function playWrongAudio() {
  const wrongAudio = new Audio(WRONG_AUDIO_URL);
  wrongAudio.play().catch((error) => {
    if (error?.name !== 'AbortError') {
      console.warn('Unable to play wrong audio.', error);
    }
  });
}

function hideCornerScoreStatus() {
  state.cornerScoreStatusScoreValue = null;
  if (!state.bigTvCornerScoreStatusEl) {
    return;
  }
  state.bigTvCornerScoreStatusEl.classList.remove('is-active');
  state.bigTvCornerScoreStatusEl.setAttribute('aria-hidden', 'true');
}

function showCornerScoreStatus(message, scoreValue = state.cornerScoreValue) {
  if (!state.bigTvCornerScoreStatusEl || !state.bigTvCornerScoreStatusLabelEl) {
    return;
  }
  state.cornerScoreStatusScoreValue = scoreValue;
  state.bigTvCornerScoreStatusLabelEl.textContent = message;
  state.bigTvCornerScoreStatusEl.classList.add('is-active');
  state.bigTvCornerScoreStatusEl.setAttribute('aria-hidden', 'false');
}

function clearDvdMissIndicatorTimeout(corner) {
  const timeoutId = state.bigTvDvdMissTimeoutIdsByCorner.get(corner);
  if (timeoutId !== undefined) {
    window.clearTimeout(timeoutId);
    state.bigTvDvdMissTimeoutIdsByCorner.delete(corner);
  }
}

function hideDvdMissIndicator(corner) {
  clearDvdMissIndicatorTimeout(corner);
  const indicatorEl = state.bigTvDvdMissIndicatorsByCorner.get(corner);
  if (!indicatorEl) {
    return;
  }
  indicatorEl.classList.remove('is-active');
  indicatorEl.setAttribute('aria-hidden', 'true');
}

function hideAllDvdMissIndicators() {
  state.bigTvDvdMissIndicatorsByCorner.forEach((indicatorEl, corner) => {
    hideDvdMissIndicator(corner);
  });
}

function showDvdMissIndicator(corner) {
  const indicatorEl = state.bigTvDvdMissIndicatorsByCorner.get(corner);
  if (!indicatorEl) {
    return;
  }
  clearDvdMissIndicatorTimeout(corner);
  indicatorEl.classList.add('is-active');
  indicatorEl.setAttribute('aria-hidden', 'false');
  const timeoutId = window.setTimeout(() => {
    indicatorEl.classList.remove('is-active');
    indicatorEl.setAttribute('aria-hidden', 'true');
    state.bigTvDvdMissTimeoutIdsByCorner.delete(corner);
  }, DVD_MISS_INDICATOR_DURATION_MS);
  state.bigTvDvdMissTimeoutIdsByCorner.set(corner, timeoutId);
}

function syncCornerScoreInitialsSubmitState() {
  if (!state.bigTvCornerScoreInitialsSubmitButtonEl || !state.bigTvCornerScoreInitialsInputEl) {
    return;
  }
  state.bigTvCornerScoreInitialsSubmitButtonEl.disabled =
    sanitizeCornerScoreInitialsInput(state.bigTvCornerScoreInitialsInputEl.value).length !== CORNER_SCORE_INITIALS_LENGTH;
}

function hideCornerScoreInitialsPrompt({ clearInput = true } = {}) {
  state.cornerScoreInitialsTargetScore = null;
  if (!state.bigTvCornerScoreInitialsPromptEl) {
    return;
  }
  state.bigTvCornerScoreInitialsPromptEl.classList.remove('is-active');
  state.bigTvCornerScoreInitialsPromptEl.setAttribute('aria-hidden', 'true');
  if (state.rightMonitorCornerScoreOverlayEl) {
    state.rightMonitorCornerScoreOverlayEl.classList.remove('has-initials-prompt');
  }
  if (state.bigTvCornerScoreInitialsInputEl) {
    if (clearInput) {
      state.bigTvCornerScoreInitialsInputEl.value = '';
    }
    syncCornerScoreInitialsSubmitState();
    state.bigTvCornerScoreInitialsInputEl.blur();
  }
}

function showCornerScoreInitialsPrompt(scoreValue) {
  if (!state.bigTvCornerScoreInitialsPromptEl || !state.bigTvCornerScoreInitialsInputEl) {
    return;
  }
  const isAlreadyActive =
    state.bigTvCornerScoreInitialsPromptEl.classList.contains('is-active') &&
    state.cornerScoreInitialsTargetScore === scoreValue;
  state.cornerScoreInitialsTargetScore = scoreValue;
  state.bigTvCornerScoreInitialsPromptEl.classList.add('is-active');
  state.bigTvCornerScoreInitialsPromptEl.setAttribute('aria-hidden', 'false');
  if (state.rightMonitorCornerScoreOverlayEl) {
    state.rightMonitorCornerScoreOverlayEl.classList.add('has-initials-prompt');
  }
  if (!isAlreadyActive) {
    state.bigTvCornerScoreInitialsInputEl.value = '';
  }
  syncCornerScoreInitialsSubmitState();
  state.bigTvCornerScoreInitialsInputEl.focus({ preventScroll: true });
}

function syncCornerScoreInitialsPromptVisibility() {
  if (!state.bigTvCornerScoreInitialsPromptEl) {
    return;
  }
  const shouldShowPrompt = state.cornerScoreValue >= state.cornerScoreHighScoreValue && !state.cornerScoreHighScoreInitials;
  if (shouldShowPrompt) {
    if (
      !state.bigTvCornerScoreInitialsPromptEl.classList.contains('is-active') ||
      state.cornerScoreInitialsTargetScore !== state.cornerScoreHighScoreValue
    ) {
      showCornerScoreInitialsPrompt(state.cornerScoreHighScoreValue);
    }
    return;
  }
  if (state.bigTvCornerScoreInitialsPromptEl.classList.contains('is-active') || state.cornerScoreInitialsTargetScore !== null) {
    hideCornerScoreInitialsPrompt({ clearInput: false });
  }
}

function renderCornerScore() {
  if (state.rightMonitorCornerScoreValueEl) {
    state.rightMonitorCornerScoreValueEl.textContent = String(state.cornerScoreValue);
  }
  if (state.whiteboardCornerScoreValueEl) {
    state.whiteboardCornerScoreValueEl.textContent = String(state.cornerScoreHighScoreValue);
  }
  if (state.whiteboardCornerScoreInitialsEl) {
    state.whiteboardCornerScoreInitialsEl.textContent = state.cornerScoreHighScoreInitials || CORNER_SCORE_INITIALS_PLACEHOLDER;
  }
  if (state.whiteboardCornerScoreInitialsGroupEl) {
    state.whiteboardCornerScoreInitialsGroupEl.hidden = false;
  }
}

function setCornerScore(nextScore) {
  if (!Number.isFinite(nextScore)) {
    return;
  }
  const normalizedScore = Math.floor(nextScore);
  if (state.cornerScoreValue !== normalizedScore) {
    hideCornerScoreStatus();
  }
  state.cornerScoreValue = normalizedScore;
  renderCornerScore();
  syncCornerScoreInitialsPromptVisibility();
}

function setCornerScoreHighScore(nextScore, initials = state.cornerScoreHighScoreInitials) {
  if (!Number.isFinite(nextScore)) {
    return;
  }
  state.cornerScoreHighScoreValue = Math.max(CORNER_SCORE_SERVER_BASELINE, Math.floor(nextScore));
  state.cornerScoreHighScoreInitials = sanitizeCornerScoreInitialsInput(initials);
  renderCornerScore();
  syncCornerScoreInitialsPromptVisibility();
}

async function loadCornerScoreFromServer() {
  try {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), API_TIMEOUT_MS);
    const response = await fetch(CORNER_SCORE_API_URL, {
      method: 'GET',
      signal: controller.signal
    });
    window.clearTimeout(timeoutId);
    if (!response.ok) {
      return;
    }
    const payload = await response.json();
    setCornerScoreHighScore(payload?.score, payload?.initials);
  } catch (_) {}
}

function queueCornerScoreUpdate(
  candidateScore = state.cornerScoreValue,
  { force = false, initials = null } = {}
) {
  const sanitizedScore = Number.isFinite(candidateScore) ? Math.max(0, Math.floor(candidateScore)) : state.cornerScoreValue;
  const sanitizedInitials = initials === null ? null : sanitizeCornerScoreInitialsInput(initials);
  const shouldAttemptInitialsUpdate =
    sanitizedInitials !== null &&
    sanitizedInitials.length === CORNER_SCORE_INITIALS_LENGTH &&
    sanitizedScore >= state.cornerScoreHighScoreValue;
  if (!force && !shouldAttemptInitialsUpdate && sanitizedScore <= state.cornerScoreHighScoreValue) {
    return state.cornerScorePersistQueue;
  }
  state.cornerScorePersistQueue = state.cornerScorePersistQueue
    .then(async () => {
      if (!force && !shouldAttemptInitialsUpdate && sanitizedScore <= state.cornerScoreHighScoreValue) {
        return;
      }
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), API_TIMEOUT_MS);
      const response = await fetch(CORNER_SCORE_API_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        keepalive: true,
        body: JSON.stringify({
          score: sanitizedScore,
          ...(sanitizedInitials !== null ? { initials: sanitizedInitials } : {})
        }),
        signal: controller.signal
      });
      window.clearTimeout(timeoutId);
      if (!response.ok) {
        return;
      }
      const payload = await response.json();
      setCornerScoreHighScore(payload?.score, payload?.initials);
    })
    .catch(() => {});
  return state.cornerScorePersistQueue;
}

function submitCornerScoreInitials() {
  if (!state.bigTvCornerScoreInitialsInputEl || state.cornerScoreInitialsTargetScore === null) {
    return;
  }
  const submittedInitials = sanitizeCornerScoreInitialsInput(state.bigTvCornerScoreInitialsInputEl.value);
  if (submittedInitials.length !== CORNER_SCORE_INITIALS_LENGTH) {
    syncCornerScoreInitialsSubmitState();
    return;
  }
  const targetScore = state.cornerScoreInitialsTargetScore;
  const highestKnownScore = Math.max(targetScore, state.cornerScoreValue, state.cornerScoreHighScoreValue);
  // Optimistically apply the submitted initials and hide the prompt immediately
  // so the UI responds instantly regardless of API success or failure.
  setCornerScoreHighScore(highestKnownScore, submittedInitials);
  hideCornerScoreInitialsPrompt();
  // Persist to server in the background; a successful response will reconcile
  // any server-authoritative score/initials via setCornerScoreHighScore.
  void queueCornerScoreUpdate(highestKnownScore, {
    force: true,
    initials: submittedInitials
  });
}

function playRightMonitorScoringNoise() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    const scoringNoiseAudio = state._cb.getZeldaSecretAudioElement?.() ?? new Audio();
    state._cb.stopZeldaSecretAudioPlayback?.();
    const playPromise = scoringNoiseAudio.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch((error) => {
        if (error?.name !== 'AbortError') {
          console.warn('Unable to play right monitor scoring noise.', error);
        }
      });
    }
    return;
  }

  if (!state.cornerScoreCoinAudioContext) {
    state.cornerScoreCoinAudioContext = new AudioContextClass();
  }

  const audioContext = state.cornerScoreCoinAudioContext;
  if (audioContext.state === 'suspended') {
    void audioContext.resume().catch(() => {});
  }
  const startTime = audioContext.currentTime + 0.005;
  const stopTime = startTime + 0.17;
  const masterGain = audioContext.createGain();
  masterGain.gain.setValueAtTime(0.0001, startTime);
  masterGain.gain.exponentialRampToValueAtTime(0.24, startTime + 0.01);
  masterGain.gain.exponentialRampToValueAtTime(0.0001, stopTime);
  masterGain.connect(audioContext.destination);

  const strikeOscillator = audioContext.createOscillator();
  strikeOscillator.type = 'square';
  strikeOscillator.frequency.setValueAtTime(987.77, startTime);
  strikeOscillator.frequency.exponentialRampToValueAtTime(1318.51, startTime + 0.05);
  strikeOscillator.connect(masterGain);
  strikeOscillator.start(startTime);
  strikeOscillator.stop(stopTime);

  const sparkleOscillator = audioContext.createOscillator();
  const sparkleGain = audioContext.createGain();
  sparkleOscillator.type = 'triangle';
  sparkleOscillator.frequency.setValueAtTime(1975.53, startTime + 0.03);
  sparkleOscillator.frequency.exponentialRampToValueAtTime(2637.02, stopTime);
  sparkleGain.gain.setValueAtTime(0.0001, startTime + 0.03);
  sparkleGain.gain.exponentialRampToValueAtTime(0.08, startTime + 0.05);
  sparkleGain.gain.exponentialRampToValueAtTime(0.0001, stopTime);
  sparkleOscillator.connect(sparkleGain);
  sparkleGain.connect(masterGain);
  sparkleOscillator.start(startTime + 0.03);
  sparkleOscillator.stop(stopTime);
}

function activateRightMonitorCornerScoreMode() {
  state.isDvdCornerCountEnabled = true;
  state._cb.syncDvdScreensaverState?.();
}

export { sanitizeCornerScoreInitialsInput, playWrongAudio, hideCornerScoreStatus, showCornerScoreStatus, clearDvdMissIndicatorTimeout, hideDvdMissIndicator, hideAllDvdMissIndicators, showDvdMissIndicator, syncCornerScoreInitialsSubmitState, hideCornerScoreInitialsPrompt, showCornerScoreInitialsPrompt, syncCornerScoreInitialsPromptVisibility, renderCornerScore, setCornerScore, setCornerScoreHighScore, loadCornerScoreFromServer, queueCornerScoreUpdate, submitCornerScoreInitials, playRightMonitorScoringNoise, activateRightMonitorCornerScoreMode };
