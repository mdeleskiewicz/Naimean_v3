import {
  LEFT_MONITOR_CARD_CORNERSCORE,
  LEFT_MONITOR_CARD_DISCORD,
  LEFT_MONITOR_CARD_GITHUB,
  LEFT_MONITOR_CARD_LOGGED_IN,
  LEFT_MONITOR_CARD_SHRIMP,
  LEFT_MONITOR_CARD_NONE,
  DEFAULT_LEFT_MONITOR_CARD,
  GITHUB_V3_ISSUES_URL,
  GITHUB_V3_AGENTS_URL,
  GITHUB_V3_WIKI_URL,
  GITHUB_V3_ACTIONS_URL,
  DISCORD_WIDGET_URL
} from '../core/constants.js';
import { state } from '../core/state.js';

/**
 * Activate a specific card on the left monitor group
 * @param {string} cardType - The card type to activate
 * @returns {Promise<boolean>} - True if successful
 */
async function activateLeftMonitorCard(cardType) {
  if (cardType === state.leftMonitorActiveCard) {
    return true;
  }

  state.leftMonitorCardTransitionToken += 1;
  const sequenceToken = state.leftMonitorCardTransitionToken;

  // Play static transition
  await playLeftMonitorCardStaticTransition(sequenceToken);

  if (sequenceToken !== state.leftMonitorCardTransitionToken) {
    return false;
  }

  // Hide all card overlays
  hideAllLeftMonitorCardOverlays();

  // Update active card
  state.leftMonitorActiveCard = cardType;

  // Show the appropriate card overlay
  switch (cardType) {
    case LEFT_MONITOR_CARD_CORNERSCORE:
      showCornerScoreCard();
      break;
    case LEFT_MONITOR_CARD_DISCORD:
      showDiscordCard();
      break;
    case LEFT_MONITOR_CARD_GITHUB:
      showGithubCard();
      break;
    case LEFT_MONITOR_CARD_LOGGED_IN:
      showLoggedInCard();
      break;
    case LEFT_MONITOR_CARD_SHRIMP:
      showShrimpCard();
      break;
    case LEFT_MONITOR_CARD_NONE:
    default:
      // No card active
      break;
  }

  return true;
}

/**
 * Play static transition between cards
 * @param {number} sequenceToken - The sequence token for this transition
 * @returns {Promise<boolean>} - True if completed successfully
 */
async function playLeftMonitorCardStaticTransition(sequenceToken) {
  if (!state.leftMonitorStaticOverlayEl || !state.leftMonitorStaticVideoEl) {
    return false;
  }

  state.leftMonitorStaticVideoEl.pause();
  state.leftMonitorStaticVideoEl.loop = false;
  state.leftMonitorStaticVideoEl.currentTime = 0;

  if (sequenceToken !== state.leftMonitorCardTransitionToken) {
    state.leftMonitorStaticVideoEl.loop = true;
    return false;
  }

  state.leftMonitorStaticOverlayEl.classList.add('is-active');

  let hasEnded = false;
  try {
    await state.leftMonitorStaticVideoEl.play();
    const onDone = () => {
      hasEnded = true;
      cleanup();
    };
    const onError = () => {
      console.warn('Left monitor card static video playback error');
      cleanup();
    };
    const cleanup = () => {
      state.leftMonitorStaticVideoEl.removeEventListener('ended', onDone);
      state.leftMonitorStaticVideoEl.removeEventListener('error', onError);
    };
    state.leftMonitorStaticVideoEl.addEventListener('ended', onDone, { once: true });
    state.leftMonitorStaticVideoEl.addEventListener('error', onError, { once: true });
  } catch (error) {
    if (error?.name !== 'AbortError') {
      console.warn('Unable to play left monitor card static.', error);
    }
    state.leftMonitorStaticOverlayEl.classList.remove('is-active');
    state.leftMonitorStaticVideoEl.loop = true;
    return false;
  }

  await new Promise((resolve) => {
    const checkDone = () => {
      if (hasEnded || sequenceToken !== state.leftMonitorCardTransitionToken) {
        resolve();
      } else {
        window.requestAnimationFrame(checkDone);
      }
    };
    checkDone();
  });

  state.leftMonitorStaticOverlayEl.classList.remove('is-active');
  state.leftMonitorStaticVideoEl.loop = true;

  return hasEnded && sequenceToken === state.leftMonitorCardTransitionToken;
}

/**
 * Hide all left monitor card overlays
 */
function hideAllLeftMonitorCardOverlays() {
  // Hide all card-specific overlays
  if (state.leftMonitorCornerScoreCardEl) {
    state.leftMonitorCornerScoreCardEl.classList.remove('is-active');
    state.leftMonitorCornerScoreCardEl.setAttribute('aria-hidden', 'true');
  }
  if (state.leftMonitorDiscordCardEl) {
    state.leftMonitorDiscordCardEl.classList.remove('is-active');
    state.leftMonitorDiscordCardEl.setAttribute('aria-hidden', 'true');
  }
  if (state.leftMonitorGithubCardEl) {
    state.leftMonitorGithubCardEl.classList.remove('is-active');
    state.leftMonitorGithubCardEl.setAttribute('aria-hidden', 'true');
  }
  if (state.leftMonitorLoggedInCardEl) {
    state.leftMonitorLoggedInCardEl.classList.remove('is-active');
    state.leftMonitorLoggedInCardEl.setAttribute('aria-hidden', 'true');
  }
  if (state.leftMonitorShrimpCardEl) {
    state.leftMonitorShrimpCardEl.classList.remove('is-active');
    state.leftMonitorShrimpCardEl.setAttribute('aria-hidden', 'true');
  }

  // Also hide the legacy left monitor selector and overlays
  if (state.leftMonitorSelectorEl) {
    state.leftMonitorSelectorEl.classList.add('is-hidden');
    state.leftMonitorSelectorEl.setAttribute('aria-hidden', 'true');
  }
  if (state.bigTvGithubQuadrantEl) {
    state.bigTvGithubQuadrantEl.classList.remove('is-active');
    state.bigTvGithubQuadrantEl.setAttribute('aria-hidden', 'true');
  }
  if (state.leftMonitorCornerScoreOverlayEl) {
    state.leftMonitorCornerScoreOverlayEl.classList.remove('is-active');
    state.leftMonitorCornerScoreOverlayEl.setAttribute('aria-hidden', 'true');
  }
}

/**
 * Show the CornerScore card
 */
function showCornerScoreCard() {
  if (!state.leftMonitorCornerScoreCardEl) return;

  state.leftMonitorCornerScoreCardEl.classList.add('is-active');
  state.leftMonitorCornerScoreCardEl.setAttribute('aria-hidden', 'false');

  // Update quadrant data
  updateCornerScoreCardData();
}

/**
 * Update CornerScore card quadrant data
 */
function updateCornerScoreCardData() {
  if (!state.leftMonitorCornerScoreCardEl) return;

  // Quadrant UL: Current Run
  const currentRunScoreEl = state.leftMonitorCornerScoreCardEl.querySelector('.cs-card-current-run-score');
  const currentRunTimeEl = state.leftMonitorCornerScoreCardEl.querySelector('.cs-card-current-run-time');
  if (currentRunScoreEl) currentRunScoreEl.textContent = state.cornerScoreValue ?? '0';
  if (currentRunTimeEl) currentRunTimeEl.textContent = formatCornerScoreTime(state.cornerScoreElapsed ?? 0);

  // Quadrant UR: Best Personal Run
  const pbScoreEl = state.leftMonitorCornerScoreCardEl.querySelector('.cs-card-pb-score');
  const pbTimeEl = state.leftMonitorCornerScoreCardEl.querySelector('.cs-card-pb-time');
  if (pbScoreEl) pbScoreEl.textContent = state.cornerScorePersonalBest ?? '—';
  if (pbTimeEl) pbTimeEl.textContent = state.cornerScorePersonalBestTime ? formatCornerScoreTime(state.cornerScorePersonalBestTime) : '—';

  // Quadrant LL: High-Score Run
  const highScoreEl = state.leftMonitorCornerScoreCardEl.querySelector('.cs-card-high-score');
  const highScoreInitialsEl = state.leftMonitorCornerScoreCardEl.querySelector('.cs-card-high-score-initials');
  if (highScoreEl) highScoreEl.textContent = state.cornerScoreHighScore ?? '—';
  if (highScoreInitialsEl) highScoreInitialsEl.textContent = state.cornerScoreHighScoreInitials ?? '—';

  // Quadrant LR: Server Stats
  const serverScoresEl = state.leftMonitorCornerScoreCardEl.querySelector('.cs-card-server-scores');
  const serverBouncesEl = state.leftMonitorCornerScoreCardEl.querySelector('.cs-card-server-bounces');
  if (serverScoresEl) serverScoresEl.textContent = state.cornerScoreServerTotalScores ?? '—';
  if (serverBouncesEl) serverBouncesEl.textContent = state.cornerScoreServerTotalBounces ?? '—';
}

/**
 * Format corner score time in MM:SS format
 * @param {number} ms - Time in milliseconds
 * @returns {string} - Formatted time string
 */
function formatCornerScoreTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Show the Discord card
 */
function showDiscordCard() {
  if (!state.leftMonitorDiscordCardEl) return;

  state.leftMonitorDiscordCardEl.classList.add('is-active');
  state.leftMonitorDiscordCardEl.setAttribute('aria-hidden', 'false');
}

/**
 * Show the GitHub card
 */
function showGithubCard() {
  if (!state.leftMonitorGithubCardEl) return;

  state.leftMonitorGithubCardEl.classList.add('is-active');
  state.leftMonitorGithubCardEl.setAttribute('aria-hidden', 'false');
}

/**
 * Show the Logged In card
 */
function showLoggedInCard() {
  if (!state.leftMonitorLoggedInCardEl) return;

  state.leftMonitorLoggedInCardEl.classList.add('is-active');
  state.leftMonitorLoggedInCardEl.setAttribute('aria-hidden', 'false');
}

/**
 * Show the Shrimp card
 */
function showShrimpCard() {
  if (!state.leftMonitorShrimpCardEl) return;

  state.leftMonitorShrimpCardEl.classList.add('is-active');
  state.leftMonitorShrimpCardEl.setAttribute('aria-hidden', 'false');
}

/**
 * Trigger CornerScore card when corner score game is active
 */
function triggerCornerScoreCard() {
  if (state.isDvdCornerCountEnabled) {
    void activateLeftMonitorCard(LEFT_MONITOR_CARD_CORNERSCORE);
  }
}

/**
 * Trigger Discord card
 */
function triggerDiscordCard() {
  void activateLeftMonitorCard(LEFT_MONITOR_CARD_DISCORD);
}

/**
 * Trigger GitHub card
 */
function triggerGithubCard() {
  void activateLeftMonitorCard(LEFT_MONITOR_CARD_GITHUB);
}

/**
 * Trigger Logged In card (requires authentication)
 */
async function triggerLoggedInCard() {
  const isAuthenticated = await state._cb.ensureDiscordAuthForQuadrantAction?.();
  if (isAuthenticated) {
    void activateLeftMonitorCard(LEFT_MONITOR_CARD_LOGGED_IN);
  }
}

/**
 * Trigger Shrimp card and start aquarium playback
 */
function triggerShrimpCard() {
  void activateLeftMonitorCard(LEFT_MONITOR_CARD_SHRIMP);
  // Also trigger aquarium playback sequence
  state._cb.playAquariumHotspotSequence?.();
}

/**
 * Reset to no active card
 */
function resetLeftMonitorCard() {
  void activateLeftMonitorCard(LEFT_MONITOR_CARD_NONE);
}

// Register callbacks
state._cb.activateLeftMonitorCard = activateLeftMonitorCard;
state._cb.triggerCornerScoreCard = triggerCornerScoreCard;
state._cb.triggerDiscordCard = triggerDiscordCard;
state._cb.triggerGithubCard = triggerGithubCard;
state._cb.triggerLoggedInCard = triggerLoggedInCard;
state._cb.triggerShrimpCard = triggerShrimpCard;
state._cb.resetLeftMonitorCard = resetLeftMonitorCard;
state._cb.updateCornerScoreCardData = updateCornerScoreCardData;

export {
  activateLeftMonitorCard,
  triggerCornerScoreCard,
  triggerDiscordCard,
  triggerGithubCard,
  triggerLoggedInCard,
  triggerShrimpCard,
  resetLeftMonitorCard,
  updateCornerScoreCardData
};
