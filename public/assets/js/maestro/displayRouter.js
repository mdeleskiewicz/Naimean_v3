import { sceneBus, MAESTRO_EVENTS } from './sceneBus.js';

export const DISPLAY_IDS = Object.freeze({
  BIG_SCREEN: 'bigscreen',
  LEFT_MONITOR: 'left_monitor',
  CENTER_MONITOR: 'center_monitor',
});

export const LEFT_MONITOR_REGIONS = Object.freeze(['UL', 'UR', 'LL', 'LR']);

const displayState = {
  [DISPLAY_IDS.BIG_SCREEN]: { activeCard: null, hijackLevel: 0 },
  [DISPLAY_IDS.LEFT_MONITOR]: {
    hijackLevel: 0,
    regions: {
      UL: { activeCard: null },
      UR: { activeCard: null },
      LL: { activeCard: null },
      LR: { activeCard: null },
    },
  },
  [DISPLAY_IDS.CENTER_MONITOR]: { activeCard: null, hijackLevel: 0 },
};

export function routeCard({ displayId, region = null, cardId, hijackLevel = 1, cardState = {} }) {
  if (displayId === DISPLAY_IDS.LEFT_MONITOR && region) {
    if (!LEFT_MONITOR_REGIONS.includes(region)) throw new Error(`Unknown left monitor region: ${region}`);
    displayState.left_monitor.regions[region] = { activeCard: cardId, cardState };
    displayState.left_monitor.hijackLevel = Math.max(displayState.left_monitor.hijackLevel, hijackLevel);
  } else if (displayState[displayId]) {
    displayState[displayId] = { ...displayState[displayId], activeCard: cardId, hijackLevel, cardState };
  }

  sceneBus.emit(MAESTRO_EVENTS.CARD_REQUESTED, { displayId, region, cardId, hijackLevel, cardState });
  return getDisplayState();
}

export function routeMusicCard() {
  routeCard({ displayId: DISPLAY_IDS.LEFT_MONITOR, region: 'UL', cardId: 'music_pitch_reactive' });
  routeCard({ displayId: DISPLAY_IDS.LEFT_MONITOR, region: 'UR', cardId: 'now_playing' });
  routeCard({ displayId: DISPLAY_IDS.LEFT_MONITOR, region: 'LL', cardId: 'up_next' });
  routeCard({ displayId: DISPLAY_IDS.LEFT_MONITOR, region: 'LR', cardId: 'lyrics_visualizer' });
  return getDisplayState();
}

export function getDisplayState() {
  return JSON.parse(JSON.stringify(displayState));
}

export const displayRouter = { routeCard, routeMusicCard, getDisplayState };
