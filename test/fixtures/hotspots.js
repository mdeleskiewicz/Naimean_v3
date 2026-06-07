const DEFAULT_HOTSPOTS = [
  { id: 'noahs-arcade', x: 880, y: 320, w: 2050, h: 1280 },
  { id: 'aquarium', x: 2680, y: 445, w: 455, h: 729 },
  { id: 'rca-board', x: 738, y: 380, w: 470, h: 1060 },
  { id: 'rca-apps', x: 145, y: 195, w: 145, h: 145 },
  { id: 'chapel', x: 3840, y: 0, w: 3840, h: 2160 },
  { id: 'pencil-sharpener', x: 2562, y: 1220, w: 221, h: 245 },
  { id: 'overlay-big-tv-control', x: 1469, y: 330, w: 1000, h: 572 },
  { id: 'overlay-flip-clock-control', x: 990, y: 1740, w: 360, h: 156 }
];

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

function sanitizeHotspots(input) {
  if (!Array.isArray(input)) return DEFAULT_HOTSPOTS;

  const entriesById = new Map();
  input.forEach((entry) => {
    if (!entry || typeof entry !== 'object' || typeof entry.id !== 'string') return;
    entriesById.set(entry.id, entry);
  });

  return DEFAULT_HOTSPOTS.map((fallback) => {
    const entry = entriesById.get(fallback.id);
    if (!entry) return { ...fallback };

    const x = isFiniteNumber(entry.x) ? clamp(Math.round(entry.x), HOTSPOT_LIMITS.minX, HOTSPOT_LIMITS.maxX) : fallback.x;
    const y = isFiniteNumber(entry.y) ? clamp(Math.round(entry.y), HOTSPOT_LIMITS.minY, HOTSPOT_LIMITS.maxY) : fallback.y;
    const w = isFiniteNumber(entry.w) ? clamp(Math.round(entry.w), HOTSPOT_LIMITS.minW, HOTSPOT_LIMITS.maxW) : fallback.w;
    const h = isFiniteNumber(entry.h) ? clamp(Math.round(entry.h), HOTSPOT_LIMITS.minH, HOTSPOT_LIMITS.maxH) : fallback.h;

    return { id: fallback.id, x, y, w, h };
  });
}

export class HotspotStore {
  constructor(state) {
    this.state = state;
  }

  async fetch(request) {
    if (request.method === 'GET') {
      const saved = await this.state.storage.get('hotspots');
      return json({ hotspots: sanitizeHotspots(saved) });
    }

    if (request.method === 'POST') {
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: 'Invalid JSON body.' }, 400);
      }

      const hotspots = sanitizeHotspots(body?.hotspots);
      await this.state.storage.put('hotspots', hotspots);
      return json({ ok: true, hotspots });
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
