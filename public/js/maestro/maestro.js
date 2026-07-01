// public/js/maestro/maestro.js

import { sceneBus, MAESTRO_EVENTS } from "./sceneBus.js";

let initialized = false;

const maestroState = {
  initialized: false,
  source: "naimean",
  muted: true,
  volume: 0,
  nowPlaying: null,
  queue: [],
};

export function initMaestro() {
  if (initialized) return maestroState;

  initialized = true;
  maestroState.initialized = true;

  console.info("[MAESTRO] Initialized.", maestroState);

  sceneBus.emit(MAESTRO_EVENTS.READY, {
    source: maestroState.source,
    muted: maestroState.muted,
    volume: maestroState.volume,
  });

  return maestroState;
}

export function getMaestroState() {
  return { ...maestroState };
}

export function setMaestroSource(source) {
  maestroState.source = source;

  sceneBus.emit(MAESTRO_EVENTS.SOURCE_SELECTED, {
    source,
  });

  return getMaestroState();
}

export function setMaestroMuted(muted) {
  maestroState.muted = Boolean(muted);

  sceneBus.emit(
    maestroState.muted
      ? MAESTRO_EVENTS.PLAYBACK_MUTED
      : MAESTRO_EVENTS.PLAYBACK_UNMUTED,
    {
      muted: maestroState.muted,
      volume: maestroState.volume,
    }
  );

  return getMaestroState();
}

export const maestro = Object.freeze({
  init: initMaestro,
  getState: getMaestroState,
  setSource: setMaestroSource,
  setMuted: setMaestroMuted,
});
