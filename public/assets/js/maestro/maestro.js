// public/assets/js/maestro/maestro.js

import { sceneBus, MAESTRO_EVENTS } from './sceneBus.js';

const DEFAULT_STATE = Object.freeze({
  initialized: false,

  source: 'naimean',

  muted: true,
  volume: 0,

  nowPlaying: null,

  queue: [],

  owner: null,

  fixtures: {},

  displays: {},
});

const state = structuredClone(DEFAULT_STATE);

function initialize() {
  if (state.initialized) {
    return state;
  }

  state.initialized = true;

  console.info('[MAESTRO] Initialized.');

  sceneBus.emit(MAESTRO_EVENTS.READY, {
    state: getState(),
  });

  return state;
}

function getState() {
  return structuredClone(state);
}

function setSource(source) {
  state.source = source;

  sceneBus.emit(MAESTRO_EVENTS.SOURCE_SELECTED, {
    source,
  });
}

function setMuted(muted) {
  state.muted = Boolean(muted);

  sceneBus.emit(
    state.muted
      ? MAESTRO_EVENTS.PLAYBACK_MUTED
      : MAESTRO_EVENTS.PLAYBACK_UNMUTED,
    {
      muted: state.muted,
      volume: state.volume,
    }
  );
}

function setVolume(volume) {
  state.volume = Math.max(0, Math.min(100, Number(volume)));

  sceneBus.emit(MAESTRO_EVENTS.TRIGGER, {
    type: 'volume_changed',
    volume: state.volume,
  });
}

function setNowPlaying(track) {
  state.nowPlaying = track;

  sceneBus.emit(MAESTRO_EVENTS.NOW_PLAYING_CHANGED, {
    track,
  });
}

function setQueue(queue) {
  state.queue = [...queue];

  sceneBus.emit(MAESTRO_EVENTS.QUEUE_UPDATED, {
    queue: getQueue(),
  });
}

function addToQueue(item) {
  state.queue.push(item);

  sceneBus.emit(MAESTRO_EVENTS.QUEUE_UPDATED, {
    queue: getQueue(),
    added: item,
  });
}

function removeFromQueue(index) {
  if (index < 0 || index >= state.queue.length) {
    return;
  }

  const removed = state.queue.splice(index, 1)[0];

  sceneBus.emit(MAESTRO_EVENTS.QUEUE_UPDATED, {
    queue: getQueue(),
    removed,
  });
}

function clearQueue() {
  state.queue.length = 0;

  sceneBus.emit(MAESTRO_EVENTS.QUEUE_UPDATED, {
    queue: [],
  });
}

function getQueue() {
  return [...state.queue];
}

export const maestro = Object.freeze({
  initialize,

  getState,

  setSource,

  setMuted,

  setVolume,

  setNowPlaying,

  setQueue,
  addToQueue,
  removeFromQueue,
  clearQueue,
  getQueue,
});

export default maestro;
