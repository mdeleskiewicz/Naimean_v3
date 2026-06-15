import { API_TIMEOUT_MS, CORNER_SCORE_API_URL, CORNER_SCORE_INITIALS_LENGTH, CORNER_SCORE_INITIALS_PLACEHOLDER, CORNER_SCORE_MEDAL_THRESHOLDS, CORNER_SCORE_MIN_RUN_TIME_MS, CORNER_SCORE_SERVER_BASELINE, DVD_MISS_INDICATOR_DURATION_MS, WRONG_AUDIO_URL } from '../core/constants.js';
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
  recordNearMiss();
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
  const shouldShowPrompt =
    state.cornerScoreValue > state.cornerScoreHighScoreValue ||
    (state.cornerScoreInitialsTargetScore !== null && state.cornerScoreInitialsTargetScore >= state.cornerScoreHighScoreValue);
  if (shouldShowPrompt) {
    if (
      !state.bigTvCornerScoreInitialsPromptEl.classList.contains('is-active') ||
      state.cornerScoreInitialsTargetScore !== state.cornerScoreValue
    ) {
      showCornerScoreInitialsPrompt(state.cornerScoreValue);
    }
    return;
  }
  if (state.bigTvCornerScoreInitialsPromptEl.classList.contains('is-active') || state.cornerScoreInitialsTargetScore !== null) {
    hideCornerScoreInitialsPrompt({ clearInput: false });
  }
}

function getMedalForScore(score) {
  if (score >= CORNER_SCORE_MEDAL_THRESHOLDS.gold) return 'gold';
  if (score >= CORNER_SCORE_MEDAL_THRESHOLDS.silver) return 'silver';
  if (score >= CORNER_SCORE_MEDAL_THRESHOLDS.bronze) return 'bronze';
  return null;
}

function formatElapsedMs(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

function renderRunStats() {
  const elapsed = state.cornerScoreRunElapsedMs;
  const bounces = state.cornerScoreRunBounces;
  const nearMisses = state.cornerScoreRunNearMisses;
  if (state.rightMonitorCornerScoreElapsedEl) {
    state.rightMonitorCornerScoreElapsedEl.textContent = formatElapsedMs(elapsed);
  }
  if (state.rightMonitorCornerScoreBouncesEl) {
    state.rightMonitorCornerScoreBouncesEl.textContent = String(bounces);
  }
  if (state.rightMonitorCornerScoreNearMissesEl) {
    state.rightMonitorCornerScoreNearMissesEl.textContent = String(nearMisses);
  }
}

function renderPersonalBestStats() {
  if (!state.leftMonitorCornerScoreOverlayEl) return;
  const pb = state.cornerScorePersonalBest;
  const pbScoreEl = state.leftMonitorCornerScoreOverlayEl.querySelector('.left-monitor-cs-pb-score');
  const pbTimeEl = state.leftMonitorCornerScoreOverlayEl.querySelector('.left-monitor-cs-pb-time');
  const pbBouncesEl = state.leftMonitorCornerScoreOverlayEl.querySelector('.left-monitor-cs-pb-bounces');
  const pbNearMissesEl = state.leftMonitorCornerScoreOverlayEl.querySelector('.left-monitor-cs-pb-near-misses');
  const pbMedalEl = state.leftMonitorCornerScoreOverlayEl.querySelector('.left-monitor-cs-pb-medal');
  if (pbScoreEl) pbScoreEl.textContent = pb ? String(pb.score) : '—';
  if (pbTimeEl) pbTimeEl.textContent = pb ? formatElapsedMs(pb.timeMs) : '—';
  if (pbBouncesEl) pbBouncesEl.textContent = pb ? String(pb.bounces) : '—';
  if (pbNearMissesEl) pbNearMissesEl.textContent = pb ? String(pb.nearMisses) : '—';
  if (pbMedalEl) {
    const medal = pb ? getMedalForScore(pb.score) : null;
    pbMedalEl.dataset.medal = medal ?? '';
    pbMedalEl.textContent = medal ? medal.charAt(0).toUpperCase() + medal.slice(1) : '—';
  }
}

function renderServerStats() {
  const stats = state.cornerScoreServerStats;
  const statsContainers = [state.whiteboardCornerScoreServerStatsEl, state.middleMonitorCornerScoreServerStatsEl].filter(Boolean);
  statsContainers.forEach((statsContainerEl) => {
    const totalScoresEl = statsContainerEl.querySelector('.whiteboard-cs-total-scores');
    const totalBouncesEl = statsContainerEl.querySelector('.whiteboard-cs-total-bounces');
    const totalNearMissesEl = statsContainerEl.querySelector('.whiteboard-cs-total-near-misses');
    const totalTimeEl = statsContainerEl.querySelector('.whiteboard-cs-total-time');
    const totalRunsEl = statsContainerEl.querySelector('.whiteboard-cs-total-runs');
    if (totalScoresEl) totalScoresEl.textContent = stats ? String(stats.totalScores) : '—';
    if (totalBouncesEl) totalBouncesEl.textContent = stats ? String(stats.totalBounces) : '—';
    if (totalNearMissesEl) totalNearMissesEl.textContent = stats ? String(stats.totalNearMisses) : '—';
    if (totalTimeEl) totalTimeEl.textContent = stats ? formatElapsedMs(stats.totalTimeMs) : '—';
    if (totalRunsEl) totalRunsEl.textContent = stats ? String(stats.totalRuns) : '—';
  });
}

function startRunStats() {
  if (state.cornerScoreRunStartTime !== null) return;
  state.cornerScoreRunStartTime = Date.now() - state.cornerScoreRunElapsedMs;
  state.cornerScoreElapsedIntervalId = window.setInterval(() => {
    state.cornerScoreRunElapsedMs = Date.now() - state.cornerScoreRunStartTime;
    renderRunStats();
  }, 1000);
}

function stopRunStats() {
  if (state.cornerScoreRunStartTime !== null) {
    state.cornerScoreRunElapsedMs = Date.now() - state.cornerScoreRunStartTime;
    state.cornerScoreRunStartTime = null;
  }
  if (state.cornerScoreElapsedIntervalId !== null) {
    window.clearInterval(state.cornerScoreElapsedIntervalId);
    state.cornerScoreElapsedIntervalId = null;
  }
  renderRunStats();
}

function resetRunStats() {
  stopRunStats();
  state.cornerScoreRunElapsedMs = 0;
  state.cornerScoreRunBounces = 0;
  state.cornerScoreRunNearMisses = 0;
  renderRunStats();
}

function recordBounce() {
  state.cornerScoreRunBounces += 1;
  renderRunStats();
}

function recordNearMiss() {
  state.cornerScoreRunNearMisses += 1;
  renderRunStats();
}

function loadPersonalBestFromStorage() {
  // Personal best is now persisted server-side; loaded via loadCornerScoreFromServer.
}

function savePersonalBestIfImproved() {
  const score = state.cornerScoreValue;
  const timeMs = state.cornerScoreRunElapsedMs;
  const bounces = state.cornerScoreRunBounces;
  const nearMisses = state.cornerScoreRunNearMisses;
  if (score === 0 && timeMs < CORNER_SCORE_MIN_RUN_TIME_MS) return;
  const pb = state.cornerScorePersonalBest;
  const isImprovement =
    !pb ||
    score > pb.score ||
    timeMs > pb.timeMs ||
    bounces > pb.bounces ||
    nearMisses > pb.nearMisses;
  if (!isImprovement) return;
  const next = {
    score: pb ? Math.max(score, pb.score) : score,
    timeMs: pb ? Math.max(timeMs, pb.timeMs) : timeMs,
    bounces: pb ? Math.max(bounces, pb.bounces) : bounces,
    nearMisses: pb ? Math.max(nearMisses, pb.nearMisses) : nearMisses
  };
  state.cornerScorePersonalBest = next;
  renderPersonalBestStats();
  void queueCornerScoreUpdate(state.cornerScoreValue, { sendPersonalBest: true });
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
  renderRunStats();
  renderPersonalBestStats();
  renderServerStats();
  if (state.bigTvHighScoreStatsValueEl) {
    state.bigTvHighScoreStatsValueEl.textContent = String(state.cornerScoreHighScoreValue);
  }
  if (state.bigTvHighScoreStatsInitialsEl) {
    state.bigTvHighScoreStatsInitialsEl.textContent = state.cornerScoreHighScoreInitials || CORNER_SCORE_INITIALS_PLACEHOLDER;
  }
}

function toggleBigTvHighScoreStats() {
  if (!state.bigTvHighScoreStatsEl) {
    return;
  }
  state.isBigTvHighScoreStatsVisible = !state.isBigTvHighScoreStatsVisible;
  state.bigTvHighScoreStatsEl.classList.toggle('is-active', state.isBigTvHighScoreStatsVisible);
  state.bigTvHighScoreStatsEl.setAttribute('aria-hidden', state.isBigTvHighScoreStatsVisible ? 'false' : 'true');
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
    state.cornerScoreServerStats = {
      totalBounces: Number.isFinite(payload?.totalBounces) ? Math.max(0, Math.floor(payload.totalBounces)) : 0,
      totalNearMisses: Number.isFinite(payload?.totalNearMisses) ? Math.max(0, Math.floor(payload.totalNearMisses)) : 0,
      totalScores: Number.isFinite(payload?.totalScores) ? Math.max(0, Math.floor(payload.totalScores)) : 0,
      totalTimeMs: Number.isFinite(payload?.totalTimeMs) ? Math.max(0, Math.floor(payload.totalTimeMs)) : 0,
      totalRuns: Number.isFinite(payload?.totalRuns) ? Math.max(0, Math.floor(payload.totalRuns)) : 0
    };
    renderServerStats();
    const pbScore = Number.isFinite(payload?.pbScore) ? Math.max(0, Math.floor(payload.pbScore)) : 0;
    const pbTimeMs = Number.isFinite(payload?.pbTimeMs) ? Math.max(0, Math.floor(payload.pbTimeMs)) : 0;
    const pbBounces = Number.isFinite(payload?.pbBounces) ? Math.max(0, Math.floor(payload.pbBounces)) : 0;
    const pbNearMisses = Number.isFinite(payload?.pbNearMisses) ? Math.max(0, Math.floor(payload.pbNearMisses)) : 0;
    if (pbScore > 0 || pbTimeMs > 0 || pbBounces > 0 || pbNearMisses > 0) {
      state.cornerScorePersonalBest = { score: pbScore, timeMs: pbTimeMs, bounces: pbBounces, nearMisses: pbNearMisses };
    }
  } catch (_) {}
}

function queueCornerScoreUpdate(
  candidateScore = state.cornerScoreValue,
  { force = false, initials = null, sendRunStats = false, sendPersonalBest = false } = {}
) {
  const sanitizedScore = Number.isFinite(candidateScore) ? Math.max(0, Math.floor(candidateScore)) : state.cornerScoreValue;
  const sanitizedInitials = initials === null ? null : sanitizeCornerScoreInitialsInput(initials);
  const shouldAttemptInitialsUpdate =
    sanitizedInitials !== null &&
    sanitizedInitials.length === CORNER_SCORE_INITIALS_LENGTH &&
    sanitizedScore >= state.cornerScoreHighScoreValue;
  const shouldSendPersonalBest = sendPersonalBest && Boolean(state.cornerScorePersonalBest);
  if (!force && !shouldAttemptInitialsUpdate && !shouldSendPersonalBest && sanitizedScore <= state.cornerScoreHighScoreValue) {
    return state.cornerScorePersistQueue;
  }
  const runStats = sendRunStats ? {
    runBounces: state.cornerScoreRunBounces,
    runNearMisses: state.cornerScoreRunNearMisses,
    runScores: state.cornerScoreValue,
    runTimeMs: state.cornerScoreRunElapsedMs
  } : null;
  const pb = shouldSendPersonalBest ? state.cornerScorePersonalBest : null;
  const pbData = pb ? {
    pbScore: pb.score,
    pbTimeMs: pb.timeMs,
    pbBounces: pb.bounces,
    pbNearMisses: pb.nearMisses
  } : null;
  state.cornerScorePersistQueue = state.cornerScorePersistQueue
    .then(async () => {
      if (!force && !shouldAttemptInitialsUpdate && !shouldSendPersonalBest && sanitizedScore <= state.cornerScoreHighScoreValue) {
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
          ...(sanitizedInitials !== null ? { initials: sanitizedInitials } : {}),
          ...(runStats !== null ? runStats : {}),
          ...(pbData !== null ? pbData : {})
        }),
        signal: controller.signal
      });
      window.clearTimeout(timeoutId);
      if (!response.ok) {
        return;
      }
      const payload = await response.json();
      setCornerScoreHighScore(payload?.score, payload?.initials);
      if (payload && typeof payload === 'object') {
        const prev = state.cornerScoreServerStats ?? {};
        state.cornerScoreServerStats = {
          totalBounces: Number.isFinite(payload.totalBounces) ? Math.max(0, Math.floor(payload.totalBounces)) : (prev.totalBounces ?? 0),
          totalNearMisses: Number.isFinite(payload.totalNearMisses) ? Math.max(0, Math.floor(payload.totalNearMisses)) : (prev.totalNearMisses ?? 0),
          totalScores: Number.isFinite(payload.totalScores) ? Math.max(0, Math.floor(payload.totalScores)) : (prev.totalScores ?? 0),
          totalTimeMs: Number.isFinite(payload.totalTimeMs) ? Math.max(0, Math.floor(payload.totalTimeMs)) : (prev.totalTimeMs ?? 0),
          totalRuns: Number.isFinite(payload.totalRuns) ? Math.max(0, Math.floor(payload.totalRuns)) : (prev.totalRuns ?? 0)
        };
        renderServerStats();
        const respPbScore = Number.isFinite(payload.pbScore) ? Math.max(0, Math.floor(payload.pbScore)) : 0;
        const respPbTimeMs = Number.isFinite(payload.pbTimeMs) ? Math.max(0, Math.floor(payload.pbTimeMs)) : 0;
        const respPbBounces = Number.isFinite(payload.pbBounces) ? Math.max(0, Math.floor(payload.pbBounces)) : 0;
        const respPbNearMisses = Number.isFinite(payload.pbNearMisses) ? Math.max(0, Math.floor(payload.pbNearMisses)) : 0;
        if (respPbScore > 0 || respPbTimeMs > 0 || respPbBounces > 0 || respPbNearMisses > 0) {
          state.cornerScorePersonalBest = { score: respPbScore, timeMs: respPbTimeMs, bounces: respPbBounces, nearMisses: respPbNearMisses };
          renderPersonalBestStats();
        }
      }
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
  hideCornerScoreStatus();
  // Persist to server in the background; a successful response will reconcile
  // any server-authoritative score/initials via setCornerScoreHighScore.
  void queueCornerScoreUpdate(highestKnownScore, {
    force: true,
    initials: submittedInitials,
    sendRunStats: true
  });
}

function unlockCornerScoreScoringAudioFromGesture() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    return;
  }
  if (!state.cornerScoreCoinAudioContext) {
    state.cornerScoreCoinAudioContext = new AudioContextClass();
  }
  if (state.cornerScoreCoinAudioContext.state === 'suspended') {
    void state.cornerScoreCoinAudioContext.resume().catch(() => {});
  }
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

  const audioContext = state.cornerScoreCoinAudioContext;
  if (!audioContext || audioContext.state !== 'running') {
    return;
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
  renderPersonalBestStats();
  state.isDvdCornerCountEnabled = true;
  state._cb.syncDvdScreensaverState?.();
}

export { sanitizeCornerScoreInitialsInput, playWrongAudio, hideCornerScoreStatus, showCornerScoreStatus, clearDvdMissIndicatorTimeout, hideDvdMissIndicator, hideAllDvdMissIndicators, showDvdMissIndicator, syncCornerScoreInitialsSubmitState, hideCornerScoreInitialsPrompt, showCornerScoreInitialsPrompt, syncCornerScoreInitialsPromptVisibility, renderCornerScore, setCornerScore, setCornerScoreHighScore, loadCornerScoreFromServer, queueCornerScoreUpdate, submitCornerScoreInitials, unlockCornerScoreScoringAudioFromGesture, playRightMonitorScoringNoise, activateRightMonitorCornerScoreMode, toggleBigTvHighScoreStats, getMedalForScore, formatElapsedMs, renderRunStats, renderPersonalBestStats, renderServerStats, startRunStats, stopRunStats, resetRunStats, recordBounce, recordNearMiss, loadPersonalBestFromStorage, savePersonalBestIfImproved };
