import { sceneBus, MAESTRO_EVENTS } from './sceneBus.js';
import { navigationStack } from './navigationStack.js';
import { sourceManager } from './sourceManager.js';
import { queueManager } from './queueManager.js';
import { fixtureManager } from './fixtureManager.js';
import { displayRouter } from './displayRouter.js';

let initialized = false;

function getState() {
  return {
    source: sourceManager.getActiveSource(),
    sources: sourceManager.getSources(),
    navigation: navigationStack.getNavigationState(),
    playback: queueManager.getPlaybackState(),
    fixtures: fixtureManager.getFixtures(),
    displays: displayRouter.getDisplayState(),
    naimeanSections: sourceManager.getNaimeanLibrarySections(),
  };
}

function selectSource(sourceId) {
  const source = sourceManager.selectSource(sourceId);
  sceneBus.emit(MAESTRO_EVENTS.SOURCE_SELECTED, { source });
  return source;
}

function navigate(screenId, params = {}) {
  const nav = navigationStack.pushScreen(screenId, params);
  sceneBus.emit(MAESTRO_EVENTS.NAVIGATE, nav);
  return nav;
}

function back() {
  const nav = navigationStack.back();
  sceneBus.emit(MAESTRO_EVENTS.BACK, nav);
  return nav;
}

function queueMedia(item) {
  const queued = queueManager.addToQueue(item);
  sceneBus.emit(MAESTRO_EVENTS.MEDIA_QUEUED, { item: queued, queue: queueManager.getQueue() });
  sceneBus.emit(MAESTRO_EVENTS.QUEUE_UPDATED, { queue: queueManager.getQueue() });
  return queued;
}

function playMedia(item, user = null) {
  const playback = queueManager.play(item, user);
  displayRouter.routeMusicCard();
  sceneBus.emit(MAESTRO_EVENTS.PLAYBACK_STARTED, playback);
  sceneBus.emit(MAESTRO_EVENTS.NOW_PLAYING_CHANGED, playback);
  return playback;
}

function mute() {
  const playback = queueManager.setMuted(true);
  sceneBus.emit(MAESTRO_EVENTS.PLAYBACK_MUTED, playback);
  return playback;
}

function unmute(volume = 35) {
  const playback = queueManager.setVolume(volume);
  sceneBus.emit(MAESTRO_EVENTS.PLAYBACK_UNMUTED, playback);
  return playback;
}

function initializeMaestro() {
  if (initialized) return getState();
  initialized = true;
  fixtureManager.initializeDefaultFixtures();

  const api = {
    sceneBus,
    getState,
    selectSource,
    navigate,
    back,
    queueMedia,
    playMedia,
    mute,
    unmute,
    sourceManager,
    queueManager,
    fixtureManager,
    displayRouter,
    navigationStack,
  };

  window.MAESTRO = api;
  sceneBus.emit(MAESTRO_EVENTS.READY, getState());
  console.info('[MAESTRO] Orchestrator ready. Use window.MAESTRO.getState() for current state.');
  return getState();
}

// Initialize once the browser reaches module execution. This is intentionally non-invasive:
// no DOM is required, and existing one-off systems continue to work while they migrate to triggers.
initializeMaestro();

export { initializeMaestro };
