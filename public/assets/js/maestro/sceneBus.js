// public/assets/js/maestro/sceneBus.js

const listeners = new Map();
const history = [];

const MAX_HISTORY = 100;

export const MAESTRO_EVENTS = Object.freeze({
  READY: 'maestro:ready',
  TRIGGER: 'maestro:trigger',

  CARD_REQUESTED: 'maestro:card_requested',
  DISPLAY_COMMAND: 'maestro:display_command',

  SOURCE_SELECTED: 'maestro:source_selected',

  QUEUE_UPDATED: 'maestro:queue_updated',
  NOW_PLAYING_CHANGED: 'maestro:now_playing_changed',

  PLAYBACK_STARTED: 'maestro:playback_started',
  PLAYBACK_PAUSED: 'maestro:playback_paused',
  PLAYBACK_MUTED: 'maestro:playback_muted',
  PLAYBACK_UNMUTED: 'maestro:playback_unmuted',

  FIXTURE_COMMAND: 'maestro:fixture_command',

  ERROR: 'maestro:error',
});

export function on(eventName, handler) {
  if (!eventName || typeof handler !== 'function') {
    console.warn('[MAESTRO SceneBus] Invalid listener registration.', {
      eventName,
      handler,
    });

    return () => {};
  }

  if (!listeners.has(eventName)) {
    listeners.set(eventName, new Set());
  }

  listeners.get(eventName).add(handler);

  return () => off(eventName, handler);
}

export function off(eventName, handler) {
  const eventListeners = listeners.get(eventName);

  if (!eventListeners) return;

  eventListeners.delete(handler);

  if (eventListeners.size === 0) {
    listeners.delete(eventName);
  }
}

export function emit(eventName, payload = {}) {
  const event = {
    name: eventName,
    payload,
    timestamp: Date.now(),
  };

  history.push(event);

  if (history.length > MAX_HISTORY) {
    history.shift();
  }

  const eventListeners = listeners.get(eventName);

  if (!eventListeners || eventListeners.size === 0) {
    console.debug('[MAESTRO SceneBus] Event emitted with no listeners:', event);
    return event;
  }

  for (const handler of eventListeners) {
    try {
      handler(event);
    } catch (error) {
      console.error('[MAESTRO SceneBus] Listener failed:', {
        eventName,
        payload,
        error,
      });
    }
  }

  return event;
}

export function once(eventName, handler) {
  const unsubscribe = on(eventName, (event) => {
    unsubscribe();
    handler(event);
  });

  return unsubscribe;
}

export function getHistory() {
  return [...history];
}

export function clearHistory() {
  history.length = 0;
}

export function listenerCount(eventName) {
  const eventListeners = listeners.get(eventName);
  return eventListeners ? eventListeners.size : 0;
}

export const sceneBus = Object.freeze({
  on,
  off,
  once,
  emit,
  getHistory,
  clearHistory,
  listenerCount,
});
