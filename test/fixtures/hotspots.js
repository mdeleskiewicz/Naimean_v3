const DEFAULT_HOTSPOTS = [
  { id: 'noahs-arcade', x: 880, y: 320, w: 2050, h: 1280 },
  { id: 'aquarium', x: 2652, y: 888, w: 492, h: 423 },
  { id: 'rca-board', x: 386, y: 660, w: 483, h: 108 },
  { id: 'overlay-whiteboard-corner-score-control', x: 859, y: 329, w: 445, h: 400 },
  { id: 'chapel', x: 3840, y: 0, w: 3840, h: 2160 },
  { id: 'rca_apps', x: 392, y: 357, w: 436, h: 294 },
  { id: 'cap-ex', x: 390, y: 774, w: 478, h: 85 },
  { id: 'cap-ex_totals', x: 868, y: 755, w: 402, h: 100 },
  { id: 'snow-tickets', x: 394, y: 1051, w: 666, h: 103 },
  { id: 'ntst-cases', x: 390, y: 1148, w: 468, h: 92 },
  { id: 'jira-board', x: 390, y: 1239, w: 470, h: 100 },
  { id: 'change-mgmt', x: 392, y: 856, w: 804, h: 105 },
  { id: 'change-mgmt-open', x: 392, y: 958, w: 808, h: 94 },
  { id: 'pencil-sharpener', x: 2538, y: 1362, w: 153, h: 217 },
  { id: 'overlay-big-tv-control', x: 1316, y: 378, w: 886, h: 646 },
  { id: 'overlay-commodore-screen-control', x: 1323, y: 982, w: 923, h: 665 },
  { id: 'monitor-group-middle-control', x: 1720, y: 1004, w: 338, h: 226 },
  { id: 'overlay-commodore-power-button-control', x: 1977, y: 1528, w: 55, h: 39 },
  { id: 'monitor-group-right-control', x: 1869, y: 990, w: 780, h: 495 },
  { id: 'overlay-flip-clock-control', x: 848, y: 1439, w: 329, h: 136 },
  { id: 'ashtray-smoke-effect-control', x: 2925, y: 45, w: 280, h: 1680 },
  { id: 'ashtray-cigarette-effect-control', x: 2922, y: 1682, w: 148, h: 44 },
  { id: 'monitor-group-left-control', x: 929, y: 987, w: 776, h: 495 },
  { id: 'github-shelf-object-control', x: 2379, y: 497, w: 130, h: 130 }
];
const LEGACY_HOTSPOT_ID_ALIASES = new Map([
  ['overlay-ashtray-smoke-control', 'ashtray-smoke-effect-control'],
  ['overlay-ashtray-cigarette-control', 'ashtray-cigarette-effect-control']
]);
const AQUARIUM_DEPTH_OVERLAY_IDS = ['aquarium-depth-overlay-left', 'aquarium-depth-overlay-right'];

const HOTSPOT_LIMITS = {
  minX: 0,
  maxX: 3840,
  minY: 0,
  maxY: 2160,
  minW: 20,
  maxW: 3840,
  minH: 20,
  maxH: 2160
};

const JSON_HEADERS = {
  'content-type': 'application/json; charset=UTF-8',
  'cache-control': 'no-store',
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type'
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function normalizeHotspotId(id) {
  return LEGACY_HOTSPOT_ID_ALIASES.get(id) || id;
}

function sanitizeHotspots(input) {
  if (!Array.isArray(input)) return DEFAULT_HOTSPOTS;

  const entriesById = new Map();
  input.forEach((entry) => {
    if (!entry || typeof entry !== 'object' || typeof entry.id !== 'string') return;
    entriesById.set(normalizeHotspotId(entry.id), entry);
  });

  return DEFAULT_HOTSPOTS.map((fallback) => {
    const entry = entriesById.get(fallback.id);
    if (!entry) return { ...fallback };

    const x = isFiniteNumber(entry.x) ? clamp(Math.round(entry.x), HOTSPOT_LIMITS.minX, HOTSPOT_LIMITS.maxX) : fallback.x;
    const y = isFiniteNumber(entry.y) ? clamp(Math.round(entry.y), HOTSPOT_LIMITS.minY, HOTSPOT_LIMITS.maxY) : fallback.y;
    const w = isFiniteNumber(entry.w) ? clamp(Math.round(entry.w), HOTSPOT_LIMITS.minW, HOTSPOT_LIMITS.maxW) : fallback.w;
    const h = isFiniteNumber(entry.h) ? clamp(Math.round(entry.h), HOTSPOT_LIMITS.minH, HOTSPOT_LIMITS.maxH) : fallback.h;

    return {
      id: fallback.id,
      x,
      y,
      w,
      h,
      ...(entry.locked === true ? { locked: true } : {})
    };
  });
}

function sanitizeAquariumDepthOverlays(input) {
  if (!Array.isArray(input)) return [];

  const entriesById = new Map();
  input.forEach((entry) => {
    if (!entry || typeof entry !== 'object' || typeof entry.id !== 'string' || !AQUARIUM_DEPTH_OVERLAY_IDS.includes(entry.id)) return;
    if (!isFiniteNumber(entry.x) || !isFiniteNumber(entry.y) || !isFiniteNumber(entry.w) || !isFiniteNumber(entry.h)) return;
    entriesById.set(entry.id, {
      id: entry.id,
      x: Math.round(entry.x),
      y: Math.round(entry.y),
      w: clamp(Math.round(entry.w), HOTSPOT_LIMITS.minW, HOTSPOT_LIMITS.maxW),
      h: clamp(Math.round(entry.h), HOTSPOT_LIMITS.minH, HOTSPOT_LIMITS.maxH)
    });
  });

  return AQUARIUM_DEPTH_OVERLAY_IDS.flatMap((id) => {
    const entry = entriesById.get(id);
    return entry ? [entry] : [];
  });
}

function sanitizeStoredHotspotPayload(input) {
  if (Array.isArray(input)) {
    return {
      hotspots: sanitizeHotspots(input),
      aquariumDepthOverlays: []
    };
  }

  const source = input && typeof input === 'object' ? input : {};
  return {
    hotspots: sanitizeHotspots(source.hotspots),
    aquariumDepthOverlays: sanitizeAquariumDepthOverlays(source.aquariumDepthOverlays)
  };
}

export class HotspotStore {
  constructor(state) {
    this.state = state;
  }

  async fetch(request) {
    if (request.method === 'GET') {
      const saved = await this.state.storage.get('hotspots');
      return json(sanitizeStoredHotspotPayload(saved));
    }

    if (request.method === 'POST') {
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: 'Invalid JSON body.' }, 400);
      }

      const payload = sanitizeStoredHotspotPayload(body);
      await this.state.storage.put('hotspots', payload);
      return json({ ok: true, hotspots: payload.hotspots, aquariumDepthOverlays: payload.aquariumDepthOverlays });
    }

    return json({ error: 'Method not allowed.' }, 405);
  }
}

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: JSON_HEADERS });
  }

  if (!env.HOTSPOT_STORE) {
    return json({ error: 'HOTSPOT_STORE binding is missing.' }, 500);
  }

  const id = env.HOTSPOT_STORE.idFromName('den-hotspots');
  const stub = env.HOTSPOT_STORE.get(id);
  try {
    return await stub.fetch(request);
  } catch (error) {
    return json({ error: `Hotspot store request failed: ${error?.message || 'Unknown error'}` }, 500);
  }
}
