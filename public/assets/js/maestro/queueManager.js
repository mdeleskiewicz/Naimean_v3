let queue = [];
let nowPlaying = null;
let owner = null;
let muted = true;
let volume = 0;

function normalizeMediaItem(item = {}) {
  return {
    id: item.id || `media_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    title: item.title || 'Untitled Track',
    artist: item.artist || 'Unknown Artist',
    album: item.album || '',
    year: item.year || '',
    durationMs: item.durationMs || 0,
    source: item.source || 'naimean',
    artworkUrl: item.artworkUrl || '',
    mediaType: item.mediaType || 'song',
    addedBy: item.addedBy || null,
    addedAt: item.addedAt || Date.now(),
  };
}

export function addToQueue(item) {
  const queueItem = normalizeMediaItem(item);
  queue = [...queue, queueItem];
  return queueItem;
}

export function clearQueue() {
  queue = [];
  return getQueue();
}

export function play(item, user = null) {
  nowPlaying = normalizeMediaItem(item);
  owner = user;
  muted = true;
  volume = 0;
  return getPlaybackState();
}

export function playNext(user = null) {
  if (!queue.length) return getPlaybackState();
  const [next, ...rest] = queue;
  queue = rest;
  nowPlaying = next;
  owner = user || next.addedBy || owner;
  muted = true;
  volume = 0;
  return getPlaybackState();
}

export function setMuted(nextMuted) {
  muted = Boolean(nextMuted);
  if (muted) volume = 0;
  return getPlaybackState();
}

export function setVolume(nextVolume) {
  volume = Math.max(0, Math.min(100, Number(nextVolume) || 0));
  muted = volume === 0;
  return getPlaybackState();
}

export function getQueue() {
  return [...queue];
}

export function getPlaybackState() {
  return {
    nowPlaying,
    owner,
    muted,
    volume,
    queue: getQueue(),
  };
}

export const queueManager = {
  addToQueue,
  clearQueue,
  play,
  playNext,
  setMuted,
  setVolume,
  getQueue,
  getPlaybackState,
};
