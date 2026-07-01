/**
 * MAESTRO Scene Bus
 * Central trigger/event layer for Naimean room orchestration.
 *
 * Existing systems can stay as-is and gradually move from one-off handlers to:
 *   trigger -> sceneBus.emit(...) -> MAESTRO orchestrates -> fixtures/cards react
 */
const listeners = new Map();
const history = [];
const MAX_HISTORY = 200;

export const MAESTRO_EVENTS = Object.freeze({
  READY: 'MAESTRO_READY',
  NAVIGATE: 'MAESTRO_NAVIGATE',
  BACK: 'MAESTRO_BACK',
  SOURCE_SELECTED: 'SOURCE_SELECTED',
  MEDIA_SELECTED: 'MEDIA_SELECTED',
  MEDIA_QUEUED: 'MEDIA_QUEUED',
  QUEUE_UPDATED: 'QUEUE_UPDATED',
  PLAY_REQUESTED: 'PLAY_REQUESTED',
  PLAYBACK_STARTED: 'PLAYBACK_STARTED',
  PLAYBACK_PAUSED: 'PLAYBACK_PAUSED',
  PLAYBACK_MUTED: 'PLAYBACK_MUTED',
  PLAYBACK_UNMUTED: 'PLAYBACK_UNMUTED',
  NOW_PLAYING_CHANGED: 'NOW_PLAYING_CHANGED',
  EXPERIENCE_STARTED: 'EXPERIENCE_STARTED',
  EXPERIENCE_ENDED: 'EXPERIENCE_ENDED',
  FIXTURE_COMMAND: 'FIXTURE_COMMAND',
  CARD_REQUESTED: 'CARD_REQUESTED',
});

export function on(eventName, handler) {
  if (!listeners.has(eventName)) listeners.set(eventName, new Set());
  listeners.get(eventName).add(handler);
  return () => off(eventName, handler);
}

export function once(eventName, handler) {
  const unsubscribe = on(eventName, (event) => {
    unsubscribe();
    handler(event);
  });
  return unsubscribe;
}

export function off(eventName, handler) {
  listeners.get(eventName)?.delete(handler);
}

export function emit(eventName, payload = {}) {
  const event = {
    type: eventName,
    payload,
    timestamp: Date.now(),
  };

  history.push(event);
  if (history.length > MAX_HISTORY) history.shift();

  listeners.get(eventName)?.forEach((handler) => {
    try {
      handler(event);
    } catch (error) {
      console.error(`[MAESTRO] SceneBus handler failed for ${eventName}:`, error);
    }
  });

  listeners.get('*')?.forEach((handler) => {
    try {
      handler(event);
    } catch (error) {
      console.error(`[MAESTRO] SceneBus wildcard handler failed for ${eventName}:`, error);
    }
  });

  return event;
}

export function getHistory() {
  return [...history];
}

export const sceneBus = { on, once, off, emit, getHistory, events: MAESTRO_EVENTS };
