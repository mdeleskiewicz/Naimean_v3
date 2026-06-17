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

function syncRightMonitorJoinDiscordMode() {
  state.rightMonitorDisplayMode = 'join-discord';
  state._cb.syncDvdScreensaverState?.();
}

async function activateCard(cardId) {
  switch (cardId) {
    case CARD_CORNERSCORE: {
      await state._cb.activateLeftMonitorCard?.(LEFT_MONITOR_CARD_CORNERSCORE);
      state._cb.activateRightMonitorCornerScoreMode?.();
      return true;
    }
    case CARD_DISCORD: {
      await state._cb.activateLeftMonitorCard?.(LEFT_MONITOR_CARD_DISCORD);
      syncRightMonitorJoinDiscordMode();
      return true;
    }
    case CARD_GITHUB: {
      await state._cb.activateLeftMonitorCard?.(LEFT_MONITOR_CARD_GITHUB);
      return true;
    }
    case CARD_SHRIMP: {
      await state._cb.activateLeftMonitorCard?.(LEFT_MONITOR_CARD_SHRIMP);
      return true;
    }
    case CARD_LOGGED_IN: {
      const isAuthenticated = await state._cb.ensureDiscordAuthForQuadrantAction?.();
      if (!isAuthenticated) {
        return false;
      }
      await state._cb.activateLeftMonitorCard?.(LEFT_MONITOR_CARD_LOGGED_IN);
      syncRightMonitorJoinDiscordMode();
      return true;
    }
    case CARD_POWER_ON: {
      if (!state.isCommodorePoweringOn) {
        state._cb.triggerCommodorePowerOnSequence?.();
      }
      return true;
    }
    case CARD_POWER_OFF: {
      if (state.isCommodorePoweringOn) {
        state._cb.triggerCommodorePowerOnSequence?.();
      }
      return true;
    }
    default:
      return false;
  }
}

function triggerCornerScoreCard() {
  void activateCard(CARD_CORNERSCORE);
}

function triggerDiscordCard() {
  void activateCard(CARD_DISCORD);
}

function triggerGithubCard() {
  void activateCard(CARD_GITHUB);
}

function triggerLoggedInCard() {
  void activateCard(CARD_LOGGED_IN);
}

function triggerShrimpCard() {
  void activateCard(CARD_SHRIMP);
}

function triggerPowerOnCard() {
  void activateCard(CARD_POWER_ON);
}

function triggerPowerOffCard() {
  void activateCard(CARD_POWER_OFF);
}

state._cb.activateCard = activateCard;
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
  activateCard
};
