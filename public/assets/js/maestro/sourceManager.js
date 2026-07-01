/**
 * MAESTRO source selector.
 * V1 shows provider labels, but only Naimean server-saved music is intended to be wired first.
 */
export const MAESTRO_SOURCES = Object.freeze([
  {
    id: 'apple_music',
    label: 'Apple Music',
    accent: '#f5f5f7',
    status: 'planned',
    requiresAuth: true,
  },
  {
    id: 'spotify',
    label: 'Spotify',
    accent: '#1db954',
    status: 'planned',
    requiresAuth: true,
  },
  {
    id: 'soundcloud',
    label: 'SoundCloud',
    accent: '#ff7700',
    status: 'planned',
    requiresAuth: true,
  },
  {
    id: 'naimean',
    label: 'Naimean',
    description: 'Server Saved Files',
    accent: '#d5a642',
    status: 'active',
    requiresAuth: false,
  },
]);

export const NAIMEAN_LIBRARY_SECTIONS = Object.freeze([
  { id: 'songs', label: 'Songs', enabled: true, count: 0 },
  { id: 'playlists', label: 'Playlists', enabled: false, count: 0 },
  { id: 'videos', label: 'Videos', enabled: false, count: 0 },
  { id: 'reels', label: 'Reels', enabled: false, count: 0 },
  { id: 'movies', label: 'Movies', enabled: false, count: 0 },
  { id: 'tv_shows', label: 'TV Shows', enabled: false, count: 0 },
  { id: 'photos', label: 'Photos', enabled: false, count: 0 },
  { id: 'pictures', label: 'Pictures', enabled: false, count: 0 },
  { id: 'ringtones', label: 'Ringtones', enabled: false, count: 0 },
]);

let activeSourceId = 'naimean';

export function getSources() {
  return MAESTRO_SOURCES.map((source) => ({ ...source, active: source.id === activeSourceId }));
}

export function getActiveSource() {
  return MAESTRO_SOURCES.find((source) => source.id === activeSourceId) || MAESTRO_SOURCES[0];
}

export function selectSource(sourceId) {
  const source = MAESTRO_SOURCES.find((entry) => entry.id === sourceId);
  if (!source) throw new Error(`Unknown MAESTRO source: ${sourceId}`);
  activeSourceId = sourceId;
  return getActiveSource();
}

export function getNaimeanLibrarySections(counts = {}) {
  return NAIMEAN_LIBRARY_SECTIONS.map((section) => ({
    ...section,
    count: Number.isFinite(counts[section.id]) ? counts[section.id] : section.count,
  }));
}

export const sourceManager = {
  getSources,
  getActiveSource,
  selectSource,
  getNaimeanLibrarySections,
};
