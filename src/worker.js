// ─── Session token utilities ──────────────────────────────────────────────────
const HMAC_KEY_CACHE = new Map();

async function importHmacKey(secret) {
  if (!secret) {
    throw new Error('SESSION_SECRET is not configured.');
  }
  let keyPromise = HMAC_KEY_CACHE.get(secret);
  if (!keyPromise) {
    keyPromise = crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify']
    );
    HMAC_KEY_CACHE.set(secret, keyPromise);
  }
  return keyPromise;
}

function toBase64Url(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function fromBase64Url(str) {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4;
  const base64 = pad ? padded + '='.repeat(4 - pad) : padded;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export async function createSessionToken(secret, payload) {
  const encoded = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await importHmacKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(encoded));
  return `${encoded}.${toBase64Url(new Uint8Array(sig))}`;
}

export async function verifySessionToken(secret, token) {
  if (!token || typeof token !== 'string') return null;
  const lastDot = token.lastIndexOf('.');
  if (lastDot < 0) return null;
  const encoded = token.slice(0, lastDot);
  const sigStr = token.slice(lastDot + 1);
  let sigBytes;
  try {
    sigBytes = fromBase64Url(sigStr);
  } catch {
    return null;
  }
  const key = await importHmacKey(secret);
  const valid = await crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(encoded));
  if (!valid) return null;
  let payload;
  try {
    const bytes = new Uint8Array(fromBase64Url(encoded));
    let decoded = '';
    for (let i = 0; i < bytes.length; i++) decoded += String.fromCharCode(bytes[i]);
    payload = JSON.parse(decoded);
  } catch {
    return null;
  }
  if (payload.exp && Date.now() > payload.exp) return null;
  return payload;
}

// ─── Cookie utilities ─────────────────────────────────────────────────────────
function parseCookies(request) {
  const header = request.headers.get('Cookie') || '';
  const cookies = {};
  for (const part of header.split(';')) {
    const eqIdx = part.indexOf('=');
    if (eqIdx < 0) continue;
    const key = part.slice(0, eqIdx).trim();
    const value = part.slice(eqIdx + 1).trim();
    if (key) cookies[key] = value;
  }
  return cookies;
}

// ─── Cookie Utilities (Continued) ─────────────────────────────────────────────
function serializeCookie(name, value, options = {}) {
  let cookie = `${name}=${value}`;
  if (options.httpOnly) cookie += '; HttpOnly';
  if (options.sameSite) cookie += `; SameSite=${options.sameSite}`;
  if (options.maxAge !== undefined) cookie += `; Max-Age=${options.maxAge}`;
  if (options.path) cookie += `; Path=${options.path}`;
  if (options.domain) cookie += `; Domain=${options.domain}`;
  if (options.secure) cookie += '; Secure';
  return cookie;
}

function isIpHostname(hostname) {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) || hostname.includes(':');
}

function isCookieDomainCandidate(hostname) {
  if (!hostname || typeof hostname !== 'string') return false;
  const normalized = hostname.toLowerCase();
  if (normalized === 'localhost' || normalized.endsWith('.localhost')) return false;
  if (!normalized.includes('.')) return false;
  if (isIpHostname(normalized)) return false;
  return true;
}

function resolveOAuthStateCookieDomain(requestUrl, redirectUri, forceRedirectHost = false) {
  let redirectHost;
  try {
    redirectHost = new URL(redirectUri, requestUrl).hostname.toLowerCase();
  } catch {
    return null;
  }
  const requestHost = requestUrl.hostname.toLowerCase();
  if (!isCookieDomainCandidate(redirectHost)) return null;
  if (requestHost === redirectHost) {
    return forceRedirectHost ? redirectHost : null;
  }
  if (requestHost.endsWith(`.${redirectHost}`)) return redirectHost;
  if (redirectHost.endsWith(`.${requestHost}`) && isCookieDomainCandidate(requestHost)) return requestHost;
  return null;
}

// ─── Response helpers ─────────────────────────────────────────────────────────
const JSON_HEADERS = {
  'content-type': 'application/json; charset=UTF-8',
  'cache-control': 'no-store',
  'access-control-allow-origin': '*'
};

const SECURITY_HEADERS = {
  'referrer-policy': 'strict-origin-when-cross-origin',
  'x-content-type-options': 'nosniff'
};

function applySecurityHeaders(headers) {
  Object.entries(SECURITY_HEADERS).forEach(([name, value]) => {
    if (!headers.has(name)) headers.set(name, value);
  });
  return headers;
}

function jsonResponse(body, status = 200, extraHeaders = {}) {
  const headers = applySecurityHeaders(new Headers({ ...JSON_HEADERS, ...extraHeaders }));
  return new Response(JSON.stringify(body), {
    status,
    headers
  });
}

function errorRedirect(base, errorCode) {
  return Response.redirect(`${base}?discord_error=${errorCode}`, 302);
}

// ─── Asset serving ────────────────────────────────────────────────────────────
const INDEX_ALIAS_PATHS = new Set(['/den', '/den.html']);
const ASSET_ALIAS_PATHS = new Map([
  ['/mame_gui', '/mame-gui.html'],
  ['/mame_gui.html', '/mame-gui.html'],
  ['/mame-gui', '/mame-gui.html']
]);
const PROTECTED_PAGE_PATHS = new Set([
  '/notes',
  '/notes.html',
  '/mame-gui',
  '/mame-gui.html',
  '/calendar',
  '/calendar.html'
]);

function isHtmlPath(pathname) {
  if (pathname.startsWith('/api/')) return false;
  const lastSegment = pathname.split('/').pop() || '';
  return pathname === '/' || pathname.endsWith('.html') || !lastSegment.includes('.');
}

function normalizePostAuthPath(rawPath) {
  if (typeof rawPath !== 'string' || !rawPath.startsWith('/') || rawPath.startsWith('//')) return '/';
  let parsed;
  try {
    parsed = new URL(rawPath, 'https://naimean.local');
  } catch {
    return '/';
  }
  if (parsed.origin !== 'https://naimean.local') return '/';
  if (!PROTECTED_PAGE_PATHS.has(parsed.pathname)) return '/';
  return `${parsed.pathname}${parsed.search}`;
}

function encodeOAuthStateValue(value) {
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodeOAuthStateValue(value) {
  const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (normalized.length % 4)) % 4);
  return atob(normalized + padding);
}

function createOAuthState(returnPath) {
  return encodeOAuthStateValue(
    JSON.stringify({
      nonce: crypto.randomUUID().replace(/-/g, ''),
      returnPath: normalizePostAuthPath(returnPath)
    })
  );
}

function readReturnPathFromOAuthState(state) {
  try {
    const parsed = JSON.parse(decodeOAuthStateValue(state));
    return normalizePostAuthPath(parsed?.returnPath);
  } catch {
    return '/';
  }
}

const VERSIONED_ASSET_RE = /\.v\d{4}[^.]*\.(png|mp4)$/i;
const STATIC_BYPASS_EXTENSIONS = new Set([
  '.mp4',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.avif',
  '.svg',
  '.ico',
  '.wav',
  '.mp3',
  '.ogg',
  '.woff2',
  '.woff',
  '.ttf',
  '.css'
]);

function shouldBypassStaticAsset(pathname) {
  if (pathname.startsWith('/api/')) return false;
  const lowerPath = pathname.toLowerCase();
  for (const ext of STATIC_BYPASS_EXTENSIONS) {
    if (lowerPath.endsWith(ext)) return true;
  }
  return false;
}

function applyAssetCacheHeaders(pathname, headers) {
  if (isHtmlPath(pathname)) {
    headers.set('cache-control', 'no-store');
  } else if (VERSIONED_ASSET_RE.test(pathname)) {
    headers.set('cache-control', 'public, max-age=31536000, immutable');
  } else {
    headers.set('cache-control', 'public, max-age=0, must-revalidate');
  }
}

async function serveAsset(request, env, pathname) {
  if (!env.ASSETS?.fetch) {
    return jsonResponse({ error: 'Static assets unavailable.' }, 500);
  }
  let assetRequest = request;
  if (INDEX_ALIAS_PATHS.has(pathname)) {
    assetRequest = new Request(new URL('/index.html', request.url).toString(), request);
  } else if (ASSET_ALIAS_PATHS.has(pathname)) {
    assetRequest = new Request(new URL(ASSET_ALIAS_PATHS.get(pathname), request.url).toString(), request);
  }
  const rangeHeader = request.headers.get('range');
  if (rangeHeader && pathname.toLowerCase().endsWith('.mp4')) {
    const headers = new Headers(assetRequest.headers);
    headers.set('range', rangeHeader);
    assetRequest = new Request(assetRequest, { headers });
  }
  const upstream = await env.ASSETS.fetch(assetRequest);
  const headers = new Headers(upstream.headers);
  applyAssetCacheHeaders(pathname, headers);
  applySecurityHeaders(headers);
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers
  });
}

// ─── HotspotStore ─────────────────────────────────────────────────────────────
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
  { id: 'github-shelf-object-control', x: 2379, y: 497, w: 130, h: 130 },
  { id: 'neon-sign', x: 2230, y: 530, w: 520, h: 250 }
];
const LEGACY_HOTSPOT_ID_ALIASES = new Map([
  ['overlay-ashtray-smoke-control', 'ashtray-smoke-effect-control'],
  ['overlay-ashtray-cigarette-control', 'ashtray-cigarette-effect-control']
]);
const AQUARIUM_DEPTH_OVERLAY_IDS = ['aquarium-depth-overlay-left', 'aquarium-depth-overlay-right'];

const HOTSPOT_LIMITS = {
  minX: 0, maxX: 3840,
  minY: 0, maxY: 2160,
  minW: 20, maxW: 3840,
  minH: 20, maxH: 2160
};

const DEFAULT_CHAPEL_ANCHOR_POINTS = {
  aceVenturaTopLeft: { x: 359, y: 2215 },
  aceVenturaBottomRight: { x: 457, y: 2355 },
  sillyGooseTopLeft: { x: 289, y: 2303 },
  sillyGooseBottomRight: { x: 349, y: 2381 },
  crustyTheClownTopLeft: { x: 4, y: 2285 },
  crustyTheClownBottomRight: { x: 118, y: 2512 },
  caseyJonesTopLeft: { x: 129, y: 2230 },
  caseyJonesBottomRight: { x: 278, y: 2410 },
  rickTopLeft: { x: 773, y: 2268 },
  rickBottomRight: { x: 844, y: 2401 },
  mortyTopLeft: { x: 697, y: 2321 },
  mortyBottomRight: { x: 762, y: 2401 },
  scroogeMcduckTopLeft: { x: 855, y: 2249 },
  scroogeMcduckBottomRight: { x: 989, y: 2511 },
  chapelMonitorShadowTopLeft: { x: 470, y: 2027 },
  chapelMonitorShadowBottomRight: { x: 608, y: 2116 },
  commodoreButtonsTopLeft: { x: 531, y: 2171 },
  commodoreButtonsBottomRight: { x: 543, y: 2183 },
  antechamberTopLeft: { x: 305, y: 2928 },
  antechamberBottomRight: { x: 775, y: 3400 },
  sauceDropTopLeft: { x: 536, y: 370 },
  sauceDropBottomRight: { x: 604, y: 2858 }
};

const DEFAULT_CHAPEL_HOTSPOTS = [
  {
    id: 'chapel-commodore-power-button',
    label: 'Commodore power button',
    variant: 'power-button',
    anchors: ['commodoreButtonsTopLeft', 'commodoreButtonsBottomRight'],
    href: '/commodore.html'
  },
  {
    id: 'chapel-antechamber',
    label: 'Antechamber',
    anchors: ['antechamberTopLeft', 'antechamberBottomRight'],
    href: '/antechamber.html'
  }
];

const CHAPEL_LIMITS = {
  minX: 0, maxX: 993,
  minY: 0, maxY: 3709
};

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

// ─── Discord OAuth Actions ────────────────────────────────────────────────────
const DISCORD_API = 'https://discord.com/api/v10';
const OAUTH_STATE_COOKIE = 'naimean_oauth_state';
const SESSION_COOKIE = 'naimean_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const REQUIRED_DISCORD_GUILD_ID_PLACEHOLDER = 'REQUIRED_SET_DISCORD_GUILD_ID';
const DISCORD_CANONICAL_CALLBACK_HOST = 'naimean.com';
const DISCORD_WWW_HOST = `www.${DISCORD_CANONICAL_CALLBACK_HOST}`;

function requireSessionSecret(env) {
  if (!env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET is not configured.');
  }
  return env.SESSION_SECRET;
}
// ─── NEW: Fetch Notes from Google Drive ───────────────────────────────────
    if (pathname === '/api/fetch-drive-notes') {
      const FOLDER_ID = '13mnHEVznrsh_Lw1RZNhK7wWDV57ZRXyb';
      const API_KEY = this.env.GOOGLE_DRIVE_API_KEY;
      const res = await fetch(`https://www.googleapis.com/drive/v3/files?q='${FOLDER_ID}'+in+parents&key=${API_KEY}`);
      const data = await res.json();
      return hotspotJson(data.files || []);
    }
    // ──────────────────────────────────────────────────────────────────────────

    const isCalendarEvents = pathname === '/api/calendar-events';
    const isUserPreferences = pathname === '/api/user-preferences';
    const roomStateMatch = pathname.match(/^\/api\/room-state\/([^/]+)$/);

    if (request.method === 'OPTIONS' && (isCalendarEvents || isUserPreferences || roomStateMatch)) {
      const methods = isCalendarEvents
        ? 'GET, POST, PUT, DELETE, OPTIONS'
        : 'GET, PUT, OPTIONS';
      return new Response(null, {
        status: 204,
        headers: {
          ...HOTSPOT_JSON_HEADERS,
          'access-control-allow-methods': methods
        }
      });
    }

    if (isCalendarEvents) {
      const userId = this.userIdFromRequest(request);
      if (!userId) return hotspotJson({ error: 'Unauthorized' }, 401);
      if (request.method === 'GET') return this.handleCalendarEventsGet(userId);
      if (request.method === 'POST') {
        const { body, error } = await this.parseJsonBody(request);
        if (error) return error;
        return this.handleCalendarEventsPost(userId, body);
      }
      if (request.method === 'PUT') {
        const { body, error } = await this.parseJsonBody(request);
        if (error) return error;
        return this.handleCalendarEventsPut(userId, body);
      }
      if (request.method === 'DELETE') {
        let body = null;
        if (request.headers.get('content-type')?.toLowerCase().includes('application/json')) {
          const parsed = await this.parseJsonBody(request);
          if (parsed.error) return parsed.error;
          body = parsed.body;
        }
        return this.handleCalendarEventsDelete(request, userId, body);
      }
      return hotspotJson({ error: 'Method not allowed.' }, 405);
    }

    if (isUserPreferences) {
      const userId = this.userIdFromRequest(request);
      if (!userId) return hotspotJson({ error: 'Unauthorized' }, 401);
      if (request.method === 'GET') return hotspotJson(this.readUserPreferences(userId));
      if (request.method === 'PUT') {
        const { body, error } = await this.parseJsonBody(request);
        if (error) return error;
        return this.handleUserPreferencesPut(userId, body);
      }
      return hotspotJson({ error: 'Method not allowed.' }, 405);
    }

    if (roomStateMatch) {
      const roomId = decodeURIComponent(roomStateMatch[1] || '').trim();
      if (!roomId) return hotspotJson({ error: 'Room id is required.' }, 400);
      if (request.method === 'GET') return hotspotJson(this.readRoomState(roomId));
      if (request.method === 'PUT') {
        const { body, error } = await this.parseJsonBody(request);
        if (error) return error;
        return this.handleRoomStatePut(roomId, body);
      }
      return hotspotJson({ error: 'Method not allowed.' }, 405);
    }

    const isChapelConfig = pathname === '/api/chapel-hotspots';
    const isArcadeUrlOverrides = pathname === '/api/arcade-url-overrides';
    const isCornerScore = pathname === '/api/corner-score';
    const isNotes = pathname === '/api/notes';
    const storageKey = isChapelConfig
      ? 'chapel-hotspots'
      : isArcadeUrlOverrides
        ? 'arcade-url-overrides'
        : isCornerScore
          ? 'corner-score'
          : isNotes
            ? 'notes'
            : 'hotspots';
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: HOTSPOT_JSON_HEADERS });
    if (request.method === 'DELETE' && isCornerScore) {
      const resetRecord = {
        score: 0,
        initials: '',
        totalBounces: 0,
        totalNearMisses: 0,
        totalScores: 0,
        totalTimeMs: 0,
        totalRuns: 0,
        pbScore: 0,
        pbTimeMs: 0,
        pbBounces: 0,
        pbNearMisses: 0
      };
      try {
        await this.state.storage.put(storageKey, resetRecord);
      } catch (err) {
        return hotspotJson({ error: `Failed to reset corner score: ${err?.message || 'Unknown error'}` }, 500);
      }
      return hotspotJson({ ok: true, ...resetRecord });
    }
    if (request.method === 'GET') {
      let saved;
      try {
        saved = await this.state.storage.get(storageKey);
      } catch (err) {
        return hotspotJson({ error: `Failed to load hotspots: ${err?.message || 'Unknown error'}` }, 500);
      }
      if (isChapelConfig) {
        return hotspotJson(sanitizeChapelConfig(saved));
      }
      if (isArcadeUrlOverrides) {
        return hotspotJson({ overrides: sanitizeArcadeUrlOverrides(saved) });
      }
      if (isCornerScore) {
        return hotspotJson(getStoredCornerScoreRecord(saved));
      }
      if (isNotes) {
        return hotspotJson(saved ?? { notes: [], viewMode: 'list', version: 2 });
      }
      return hotspotJson(sanitizeStoredHotspotPayload(saved));
    }
    if (request.method === 'POST') {
      let body;
      try {
        body = await request.json();
      } catch {
        return hotspotJson({ error: 'Invalid JSON body.' }, 400);
      }
      if (isNotes) {
        const notesPayload = sanitizeNotesState(body);
        if (!notesPayload) return hotspotJson({ error: 'Invalid notes payload.' }, 400);
        if (JSON.stringify(notesPayload).length > MAX_NOTES_BYTES) {
          return hotspotJson({ error: 'Notes payload too large.' }, 413);
        }
        try {
          await this.state.storage.put(storageKey, notesPayload);
        } catch (err) {
          return hotspotJson({ error: `Failed to save notes: ${err?.message || 'Unknown error'}` }, 500);
        }
        return hotspotJson({ ok: true });
      }
      const payload = isChapelConfig
        ? sanitizeChapelConfig(body)
        : isArcadeUrlOverrides
          ? { overrides: sanitizeArcadeUrlOverrides(body?.overrides) }
          : isCornerScore
            ? null
        : sanitizeStoredHotspotPayload(body);
      if (isCornerScore) {
        let storedRecord;
        try {
          storedRecord = getStoredCornerScoreRecord(await this.state.storage.get(storageKey));
        } catch (err) {
          return hotspotJson({ error: `Failed to load corner score: ${err?.message || 'Unknown error'}` }, 500);
        }
        const hasExplicitScore = Boolean(body) && Object.prototype.hasOwnProperty.call(body, 'score');
        const explicitScore = hasExplicitScore ? sanitizeCornerScore(body?.score) : storedRecord.score;
        const incrementBy = sanitizeCornerScoreIncrement(body?.incrementBy);
        const candidateScore = sanitizeCornerScore(explicitScore + incrementBy);
        const nextScore = Math.max(storedRecord.score, candidateScore);
        const submittedInitials = sanitizeCornerScoreInitials(body?.initials);
        const canApplySubmittedInitials = Boolean(
          submittedInitials &&
          (
            (hasExplicitScore && explicitScore >= storedRecord.score) ||
            (
              storedRecord.initials === '' &&
              nextScore === storedRecord.score &&
              (hasExplicitScore || incrementBy === 0)
            )
          )
        );
        const shouldUpdateScore = nextScore > storedRecord.score;
        let nextInitials = storedRecord.initials;
        if (canApplySubmittedInitials) {
          nextInitials = submittedInitials;
        } else if (shouldUpdateScore) {
          nextInitials = '';
        }
        const shouldUpdateInitials = nextInitials !== storedRecord.initials;
        // Accumulate run stats (add-only)
        const runBounces = sanitizeCornerScoreAggregateDelta(body?.runBounces);
        const runNearMisses = sanitizeCornerScoreAggregateDelta(body?.runNearMisses);
        const runScores = sanitizeCornerScoreAggregateDelta(body?.runScores);
        const runTimeMs = sanitizeCornerScoreAggregateDelta(body?.runTimeMs);
        const hasRunStats = runBounces > 0 || runNearMisses > 0 || runScores > 0 || runTimeMs > 0;
        const nextTotalBounces = storedRecord.totalBounces + runBounces;
        const nextTotalNearMisses = storedRecord.totalNearMisses + runNearMisses;
        const nextTotalScores = storedRecord.totalScores + runScores;
        const nextTotalTimeMs = storedRecord.totalTimeMs + runTimeMs;
        const nextTotalRuns = storedRecord.totalRuns + (hasRunStats ? 1 : 0);
        // Personal best (take max per metric)
        const pbScore = sanitizeCornerScoreAggregateDelta(body?.pbScore);
        const pbTimeMs = sanitizeCornerScoreAggregateDelta(body?.pbTimeMs);
        const pbBounces = sanitizeCornerScoreAggregateDelta(body?.pbBounces);
        const pbNearMisses = sanitizeCornerScoreAggregateDelta(body?.pbNearMisses);
        const nextPbScore = Math.max(storedRecord.pbScore, pbScore);
        const nextPbTimeMs = Math.max(storedRecord.pbTimeMs, pbTimeMs);
        const nextPbBounces = Math.max(storedRecord.pbBounces, pbBounces);
        const nextPbNearMisses = Math.max(storedRecord.pbNearMisses, pbNearMisses);
        const hasPbUpdate = nextPbScore !== storedRecord.pbScore || nextPbTimeMs !== storedRecord.pbTimeMs || nextPbBounces !== storedRecord.pbBounces || nextPbNearMisses !== storedRecord.pbNearMisses;
        const nextRecord = {
          score: nextScore,
          initials: nextInitials,
          totalBounces: nextTotalBounces,
          totalNearMisses: nextTotalNearMisses,
          totalScores: nextTotalScores,
          totalTimeMs: nextTotalTimeMs,
          totalRuns: nextTotalRuns,
          pbScore: nextPbScore,
          pbTimeMs: nextPbTimeMs,
          pbBounces: nextPbBounces,
          pbNearMisses: nextPbNearMisses
        };
        const shouldUpdate = shouldUpdateScore || shouldUpdateInitials || hasRunStats || hasPbUpdate;
        if (shouldUpdate) {
          try {
            await this.state.storage.put(storageKey, nextRecord);
          } catch (err) {
            return hotspotJson({ error: `Failed to save corner score: ${err?.message || 'Unknown error'}` }, 500);
          }
        }
        return hotspotJson({
          ok: true,
          score: nextRecord.score,
          initials: nextRecord.initials,
          totalBounces: nextRecord.totalBounces,
          totalNearMisses: nextRecord.totalNearMisses,
          totalScores: nextRecord.totalScores,
          totalTimeMs: nextRecord.totalTimeMs,
          totalRuns: nextRecord.totalRuns,
          pbScore: nextRecord.pbScore,
          pbTimeMs: nextRecord.pbTimeMs,
          pbBounces: nextRecord.pbBounces,
          pbNearMisses: nextRecord.pbNearMisses,
          updated: shouldUpdate
        });
      }
      try {
        await this.state.storage.put(
          storageKey,
          isChapelConfig ? payload : isArcadeUrlOverrides ? payload.overrides : payload
        );
      } catch (err) {
        return hotspotJson({ error: `Failed to save hotspots: ${err?.message || 'Unknown error'}` }, 500);
      }
      return hotspotJson({ ok: true, ...payload });
    }
    return hotspotJson({ error: 'Method not allowed.' }, 405);
}

// ─── Aquarium / shrimp clips ──────────────────────────────────────────────────
const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const CLIP_ID_RE = /^[A-Za-z0-9_-]{10,}$/;
const SHRIMP_CLIP_CACHE_CONTROL = 'public, max-age=300';
const SHRIMP_CLIP_CATALOG_CACHE_CONTROL = 'public, max-age=300, stale-while-revalidate=3600';

function localShrimpClips(env) {
  const count = parseInt(env.AQUARIUM_LOCAL_CLIP_COUNT || '23', 10);
  const clips = [];
  for (let i = 1; i <= count; i++) clips.push(`assets/video/shrimp/sh${i}.mp4`);
  return jsonResponse({ source: 'local-fallback', clips }, 200, {
    'cache-control': SHRIMP_CLIP_CATALOG_CACHE_CONTROL
  });
}

async function googleDriveShrimpClips(env) {
  const { GOOGLE_DRIVE_API_KEY: apiKey, GOOGLE_DRIVE_SHRIMP_FOLDER_ID: folderId } = env;
  const pageSize = parseInt(env.GOOGLE_DRIVE_PAGE_SIZE || '100', 10);
  const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
  const fields = encodeURIComponent('files(id,name,mimeType)');
  const url = `${DRIVE_API_BASE}/files?q=${query}&fields=${fields}&pageSize=${pageSize}&key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();
  const clips = (data.files || [])
    .filter((f) => f.mimeType && f.mimeType.startsWith('video/'))
    .map((f) => `/api/aquarium/shrimp-clip/${f.id}`);
  return jsonResponse({ source: 'google-drive', clips }, 200, {
    'cache-control': SHRIMP_CLIP_CATALOG_CACHE_CONTROL
  });
}

async function proxyShrimpClip(env, fileId) {
  if (!env.GOOGLE_DRIVE_API_KEY) return jsonResponse({ error: 'Google Drive API key is not configured.' }, 503);
  if (!CLIP_ID_RE.test(fileId)) return jsonResponse({ error: 'Invalid clip id.' }, 400);
  const url = `${DRIVE_API_BASE}/files/${fileId}?alt=media&key=${env.GOOGLE_DRIVE_API_KEY}`;
  const upstream = await fetch(url);
  const headers = new Headers();
  const ct = upstream.headers.get('content-type');
  if (ct) headers.set('content-type', ct);
  headers.set('cache-control', SHRIMP_CLIP_CACHE_CONTROL);
  return new Response(upstream.body, { status: upstream.status, headers });
}

// ─── Durable Object dispatch helper ──────────────────────────────────────────
async function dispatchToHotspotStore(env, request, instanceName) {
  if (!env.HOTSPOT_STORE) return jsonResponse({ error: 'HOTSPOT_STORE binding is missing.' }, 500);
  try {
    const stub = env.HOTSPOT_STORE.get(env.HOTSPOT_STORE.idFromName(instanceName));
    return await stub.fetch(request);
  } catch (err) {
    return jsonResponse({ error: `Hotspot store unavailable: ${err?.message || 'Unknown error'}` }, 500);
  }
}

async function getRequestSession(request, env) {
  const cookies = parseCookies(request);
  const token = cookies[SESSION_COOKIE];
  if (!token) return null;
  const sessionSecret = requireSessionSecret(env);
  return verifySessionToken(sessionSecret, token);
}

async function maybeRedirectProtectedPage(request, env, url) {
  if (!PROTECTED_PAGE_PATHS.has(url.pathname)) return null;
  const session = await getRequestSession(request, env);
  if (session?.userId) return null;
  const authUrl = new URL('/api/discord/auth', url.origin);
  authUrl.searchParams.set('state', `${url.pathname}${url.search}`);
  return Response.redirect(authUrl.toString(), 302);
}

function withUserIdHeader(request, userId) {
  const headers = new Headers(request.headers);
  headers.set('x-naimean-user-id', userId);
  return new Request(request, { headers });
}

async function handleAuthenticatedHotspotRoute(request, env, instanceName) {
  const session = await getRequestSession(request, env);
  if (!session?.userId) return jsonResponse({ error: 'Unauthorized' }, 401);
  return dispatchToHotspotStore(env, withUserIdHeader(request, session.userId), instanceName);
}

async function handleNotes(request, env) {
  const session = await getRequestSession(request, env);
  if (!session?.userId) return jsonResponse({ error: 'Unauthorized' }, 401);
  return dispatchToHotspotStore(env, request, `notes-${session.userId}`);
}

async function handleRoomStateRoute(request, env) {
  const roomAuthEnabled = String(env.ROOM_STATE_REQUIRE_AUTH || '').toLowerCase() === 'true';
  if (!roomAuthEnabled) return dispatchToHotspotStore(env, request, 'room-state');
  const session = await getRequestSession(request, env);
  if (!session?.userId) return jsonResponse({ error: 'Unauthorized' }, 401);
  return dispatchToHotspotStore(env, withUserIdHeader(request, session.userId), 'room-state');
}

// ─── Main worker entry router ──────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;
    if (shouldBypassStaticAsset(pathname)) {
      if (!env.ASSETS?.fetch) {
        return jsonResponse({ error: 'Static assets unavailable.' }, 500);
      }
      return env.ASSETS.fetch(request);
    }

    // Route matching for Discord endpoints
    if (pathname === '/api/discord/auth') return handleDiscordAuth(request, env);
    if (pathname === '/api/discord/callback') return handleDiscordCallback(request, env);
    if (pathname === '/api/discord/me') return handleDiscordMe(request, env);
    if (pathname === '/api/discord/logout') return handleDiscordLogout(request, env);

    // Infrastructure diagnostics
    if (pathname === '/api/db-test' && env.DB) {
      const { results } = await env.DB.prepare('SELECT 1').all();
      return jsonResponse({ connected: true, results });
    }

    // Hotspot Durable Object routes
    if (pathname === '/api/hotspots') return dispatchToHotspotStore(env, request, 'den-hotspots');
    if (pathname === '/api/chapel-hotspots') return dispatchToHotspotStore(env, request, 'chapel-hotspots');
    if (pathname === '/api/arcade-url-overrides') return dispatchToHotspotStore(env, request, 'arcade-url-overrides');
    if (pathname === '/api/corner-score') {
      return dispatchToHotspotStore(env, request, 'corner-score');
    }

    // Per-user notes store
    if (pathname === '/api/notes') return handleNotes(request, env);
    if (pathname === '/api/calendar-events') return handleAuthenticatedHotspotRoute(request, env, 'calendar-events');
    if (pathname === '/api/user-preferences') return handleAuthenticatedHotspotRoute(request, env, 'user-preferences');
    if (pathname.startsWith('/api/room-state/')) return handleRoomStateRoute(request, env);

    // /api/aquarium/shrimp-clips
    if (pathname === '/api/aquarium/shrimp-clips') {
      if (env.GOOGLE_DRIVE_API_KEY && env.GOOGLE_DRIVE_SHRIMP_FOLDER_ID) {
        return googleDriveShrimpClips(env);
      }
      return localShrimpClips(env);
    }

    // /api/aquarium/shrimp-clip/:id
    if (pathname.startsWith('/api/aquarium/shrimp-clip/')) {
      const fileId = pathname.slice('/api/aquarium/shrimp-clip/'.length);
      return proxyShrimpClip(env, fileId);
    }

    if (pathname === '/api/health') return jsonResponse({ status: 'healthy', timestamp: Date.now() });

    const protectedPageRedirect = await maybeRedirectProtectedPage(request, env, url);
    if (protectedPageRedirect) return protectedPageRedirect;

    // Catch all static paths → Asset handler
    return serveAsset(request, env, pathname);
  }
};
