import {
  LEFT_MONITOR_CARD_CORNERSCORE,
  LEFT_MONITOR_CARD_DISCORD,
  LEFT_MONITOR_CARD_GITHUB,
  LEFT_MONITOR_CARD_LOGGED_IN,
  LEFT_MONITOR_CARD_SHRIMP
} from '../core/constants.js';
import { state } from '../core/state.js';

const CARD_SHRIMP = 'shrimp';
const CARD_CORNERSCORE = 'cornerscore';
const CARD_GITHUB = 'github';
const CARD_DISCORD = 'discord';
const CARD_POWER_ON = 'power-on';
const CARD_POWER_OFF = 'power-off';
const CARD_LOGGED_IN = 'logged-in';

const CARD_IDS = Object.freeze([
  CARD_SHRIMP,
  CARD_CORNERSCORE,
  CARD_GITHUB,
  CARD_DISCORD,
  CARD_POWER_ON,
  CARD_POWER_OFF,
  CARD_LOGGED_IN
]);

const ORCHESTRATOR_EVENT_NAME = 'naimean:orchestrator';

const TRIGGERS = Object.freeze({
  SHRIMP_REQUESTED: 'shrimp-requested',
  CORNER_SCORE_REQUESTED: 'corner-score-requested',
  GITHUB_REQUESTED: 'github-requested',
  DISCORD_REQUESTED: 'discord-requested',
  LOGGED_IN_REQUESTED: 'logged-in-requested',
  POWER_ON_REQUESTED: 'power-on-requested',
  POWER_OFF_REQUESTED: 'power-off-requested'
});

const TRIGGER_TO_CARD = Object.freeze({
  [TRIGGERS.SHRIMP_REQUESTED]: CARD_SHRIMP,
  [TRIGGERS.CORNER_SCORE_REQUESTED]: CARD_CORNERSCORE,
  [TRIGGERS.GITHUB_REQUESTED]: CARD_GITHUB,
  [TRIGGERS.DISCORD_REQUESTED]: CARD_DISCORD,
  [TRIGGERS.LOGGED_IN_REQUESTED]: CARD_LOGGED_IN,
  [TRIGGERS.POWER_ON_REQUESTED]: CARD_POWER_ON,
  [TRIGGERS.POWER_OFF_REQUESTED]: CARD_POWER_OFF
});

function publishOrchestratorEvent(type, detail = {}) {
  try {
    window.dispatchEvent(
      new CustomEvent(ORCHESTRATOR_EVENT_NAME, {
        detail: {
          type,
          at: Date.now(),
          ...detail
        }
      })
    );
  } catch (error) {
    console.warn('[Naimean] Unable to publish orchestrator event:', type, error);
  }
}

function syncRightMonitorJoinDiscordMode() {
  state.rightMonitorDisplayMode = 'join-discord';
  state._cb.syncDvdScreensaverState?.();
}

async function activateCard(cardId, source = 'direct') {
  publishOrchestratorEvent('CARD_ACTIVATION_REQUESTED', {
    cardId,
    source
  });

  try {
    switch (cardId) {
      case CARD_CORNERSCORE: {
        await state._cb.activateLeftMonitorCard?.(LEFT_MONITOR_CARD_CORNERSCORE);
        state._cb.activateRightMonitorCornerScoreMode?.();

        publishOrchestratorEvent('CARD_ACTIVATED', { cardId, source });
        return true;
      }

      case CARD_DISCORD: {
        await state._cb.activateLeftMonitorCard?.(LEFT_MONITOR_CARD_DISCORD);
        syncRightMonitorJoinDiscordMode();

        publishOrchestratorEvent('CARD_ACTIVATED', { cardId, source });
        return true;
      }

      case CARD_GITHUB: {
        await state._cb.activateLeftMonitorCard?.(LEFT_MONITOR_CARD_GITHUB);

        publishOrchestratorEvent('CARD_ACTIVATED', { cardId, source });
        return true;
      }

      case CARD_SHRIMP: {
        await state._cb.activateLeftMonitorCard?.(LEFT_MONITOR_CARD_SHRIMP);

        publishOrchestratorEvent('CARD_ACTIVATED', { cardId, source });
        return true;
      }

      case CARD_LOGGED_IN: {
        const isAuthenticated = await state._cb.ensureDiscordAuthForQuadrantAction?.();

        if (!isAuthenticated) {
          publishOrchestratorEvent('CARD_ACTIVATION_BLOCKED', {
            cardId,
            source,
            reason: 'auth-required'
          });
          return false;
        }

        await state._cb.activateLeftMonitorCard?.(LEFT_MONITOR_CARD_LOGGED_IN);
        syncRightMonitorJoinDiscordMode();

        publishOrchestratorEvent('CARD_ACTIVATED', { cardId, source });
        return true;
      }

      case CARD_POWER_ON: {
        if (!state.isCommodorePoweringOn) {
          state._cb.triggerCommodorePowerOnSequence?.();
        }

        publishOrchestratorEvent('CARD_ACTIVATED', { cardId, source });
        return true;
      }

      case CARD_POWER_OFF: {
        if (state.isCommodorePoweringOn) {
          state._cb.triggerCommodorePowerOnSequence?.();
        }

        publishOrchestratorEvent('CARD_ACTIVATED', { cardId, source });
        return true;
      }

      default:
        publishOrchestratorEvent('CARD_ACTIVATION_UNKNOWN', { cardId, source });
        return false;
    }
  } catch (error) {
    publishOrchestratorEvent('CARD_ACTIVATION_FAILED', {
      cardId,
      source,
      message: error?.message || String(error)
    });

    console.error('[Naimean] Card activation failed:', cardId, error);
    return false;
  }
}

async function triggerOrchestrator(triggerId, payload = {}) {
  const cardId = TRIGGER_TO_CARD[triggerId];

  publishOrchestratorEvent('TRIGGER_RECEIVED', {
    triggerId,
    cardId,
    payload
  });

  if (!cardId) {
    publishOrchestratorEvent('TRIGGER_UNHANDLED', {
      triggerId,
      payload
    });
    return false;
  }

  return activateCard(cardId, triggerId);
}

function triggerCornerScoreCard() {
  void triggerOrchestrator(TRIGGERS.CORNER_SCORE_REQUESTED);
}

function triggerDiscordCard() {
  void triggerOrchestrator(TRIGGERS.DISCORD_REQUESTED);
}

function triggerGithubCard() {
  void triggerOrchestrator(TRIGGERS.GITHUB_REQUESTED);
}

function triggerLoggedInCard() {
  void triggerOrchestrator(TRIGGERS.LOGGED_IN_REQUESTED);
}

function triggerShrimpCard() {
  void triggerOrchestrator(TRIGGERS.SHRIMP_REQUESTED);
}

function triggerPowerOnCard() {
  void triggerOrchestrator(TRIGGERS.POWER_ON_REQUESTED);
}

function triggerPowerOffCard() {
  void triggerOrchestrator(TRIGGERS.POWER_OFF_REQUESTED);
}

state._cb.activateCard = activateCard;
state._cb.triggerOrchestrator = triggerOrchestrator;
state._cb.triggerCornerScoreCard = triggerCornerScoreCard;
state._cb.triggerDiscordCard = triggerDiscordCard;
state._cb.triggerGithubCard = triggerGithubCard;
state._cb.triggerLoggedInCard = triggerLoggedInCard;
state._cb.triggerShrimpCard = triggerShrimpCard;
state._cb.triggerPowerOnCard = triggerPowerOnCard;
state._cb.triggerPowerOffCard = triggerPowerOffCard;

export {
  CARD_IDS,
  CARD_SHRIMP,
  CARD_CORNERSCORE,
  CARD_GITHUB,
  CARD_DISCORD,
  CARD_POWER_ON,
  CARD_POWER_OFF,
  CARD_LOGGED_IN,
  TRIGGERS,
  ORCHESTRATOR_EVENT_NAME,
  activateCard,
  triggerOrchestrator
};
