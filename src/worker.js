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
  if (options.secure) cookie += '; Secure';
  return cookie;
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
  '/mame-gui.html'
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
  { id: 'aquarium', x: 2680, y: 445, w: 455, h: 729 },
  { id: 'rca-board', x: 738, y: 380, w: 470, h: 1060 },
  { id: 'overlay-whiteboard-corner-score-control', x: 785, y: 456, w: 355, h: 260 },
  { id: 'chapel', x: 3840, y: 0, w: 3840, h: 2160 },
  { id: 'pencil-sharpener', x: 2562, y: 1220, w: 221, h: 245 },
  { id: 'overlay-big-tv-control', x: 1469, y: 330, w: 1000, h: 572 },
  { id: 'overlay-flip-clock-control', x: 990, y: 1740, w: 360, h: 156 },
  { id: 'overlay-left-monitor-control', x: 1322, y: 1028, w: 298, h: 206 },
  { id: 'overlay-right-monitor-control', x: 1758, y: 1014, w: 288, h: 228 },
  { id: 'rca-apps', x: 145, y: 195, w: 145, h: 145 },
  { id: 'rca_apps', x: 145, y: 195, w: 145, h: 145 },
  { id: 'cap-ex', x: 772, y: 462, w: 402, h: 120 },
  { id: 'cap-ex_totals', x: 772, y: 462, w: 402, h: 120 },
  { id: 'snow-tickets', x: 772, y: 614, w: 402, h: 120 },
  { id: 'ntst-cases', x: 772, y: 766, w: 402, h: 120 },
  { id: 'jira-board', x: 772, y: 918, w: 402, h: 120 },
  { id: 'change-mgmt', x: 772, y: 1070, w: 402, h: 120 },
  { id: 'change-mgmt-open', x: 772, y: 1222, w: 402, h: 120 }
];

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

function requireSessionSecret(env) {
  if (!env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET is not configured.');
  }
  return env.SESSION_SECRET;
}

async function handleDiscordAuth(request, env) {
  if (request.method !== 'GET') return new Response('Method Not Allowed', { status: 405 });
  const url = new URL(request.url);
  const clientId = env.DISCORD_CLIENT_ID;
  if (!clientId) return errorRedirect(`${url.origin}/`, 'configuration_error');
  
  const redirectUri = env.DISCORD_REDIRECT_URI || `${url.origin}/api/discord/callback`;
  const requestedReturnPath = normalizePostAuthPath(url.searchParams.get('state') || '/');
  const state = createOAuthState(requestedReturnPath);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'identify email guilds.members.read',
    state: state
  });
  
  const headers = new Headers({
    'Location': `https://discord.com/oauth2/authorize?${params.toString()}`,
    'Set-Cookie': serializeCookie(OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: 'Lax',
      path: '/',
      maxAge: 300,
      secure: url.protocol === 'https:'
    }),
    'Access-Control-Allow-Origin': '*'
  });
  applySecurityHeaders(headers);
  return new Response(null, { status: 302, headers });
}

async function handleDiscordCallback(request, env) {
  if (request.method !== 'GET') return new Response('Method Not Allowed', { status: 405 });
  const url = new URL(request.url);
  const origin = url.origin;
  const errorParam = url.searchParams.get('error');
  if (errorParam) return errorRedirect(`${origin}/`, errorParam);
  
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || !state) return errorRedirect(`${origin}/`, 'invalid_request');
  
  const cookies = parseCookies(request);
  if (!cookies[OAUTH_STATE_COOKIE] || cookies[OAUTH_STATE_COOKIE] !== state) {
    return errorRedirect(`${origin}/`, 'state_mismatch');
  }
  const postAuthPath = readReturnPathFromOAuthState(state);
  
  const clientId = env.DISCORD_CLIENT_ID;
  const clientSecret = env.DISCORD_CLIENT_SECRET;
  const sessionSecret = env.SESSION_SECRET;
  const targetRedirectUri = env.DISCORD_REDIRECT_URI || `${origin}/api/discord/callback`;
  if (!clientId || !clientSecret || !sessionSecret) {
    return errorRedirect(`${origin}/`, 'configuration_error');
  }
  
  const tokenRes = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: targetRedirectUri
    })
  });
  
  if (!tokenRes.ok) return errorRedirect(`${origin}/`, 'token_exchange_failed');
  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;
  if (!accessToken) return errorRedirect(`${origin}/`, 'token_exchange_failed');
  
  const authHeader = { Authorization: 'Bearer ' + accessToken };
  const userRes = await fetch(`${DISCORD_API}/users/@me`, { headers: authHeader });
  if (!userRes.ok) return errorRedirect(`${origin}/`, 'user_fetch_failed');
  const user = await userRes.json();
  
  const guildId = env.DISCORD_GUILD_ID;
  if (!guildId || guildId === REQUIRED_DISCORD_GUILD_ID_PLACEHOLDER) {
    return errorRedirect(`${origin}/`, 'configuration_error');
  }
  let isMember = true;
  let roles = [];
  const memberRes = await fetch(`${DISCORD_API}/users/@me/guilds/${guildId}/member`, { headers: authHeader });
  if (memberRes.ok) {
    const member = await memberRes.json();
    roles = Array.isArray(member?.roles) ? member.roles : [];
  } else if (memberRes.status === 403 || memberRes.status === 404) {
    isMember = false;
    roles = [];
  } else {
    return errorRedirect(`${origin}/`, 'guild_lookup_failed');
  }
  
  const exp = Date.now() + SESSION_TTL_MS;
  const sessionToken = await createSessionToken(sessionSecret, {
    userId: user.id,
    username: user.username,
    avatar: user.avatar || null,
    isMember,
    roles,
    exp
  });
  
  const secure = url.protocol === 'https:';
  const clearStateCookie = serializeCookie(OAUTH_STATE_COOKIE, '', {
    httpOnly: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: 0,
    secure
  });
  const sessionCookieStr = serializeCookie(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    sameSite: 'Lax',
    path: '/',
    secure
  });
  
  const headers = new Headers({ Location: postAuthPath });
  headers.append('Set-Cookie', sessionCookieStr);
  headers.append('Set-Cookie', clearStateCookie);
  applySecurityHeaders(headers);
  return new Response(null, { status: 302, headers });
}

async function handleDiscordMe(request, env) {
  const sessionSecret = requireSessionSecret(env);
  const cookies = parseCookies(request);
  const token = cookies[SESSION_COOKIE];
  if (!token) return jsonResponse({ authenticated: false });
  
  const session = await verifySessionToken(sessionSecret, token);
  if (!session) return jsonResponse({ authenticated: false });
  
  const roles = Array.isArray(session.roles) ? session.roles : [];
  const allowedRoleIds = String(env.DISCORD_ALLOWED_ROLE_IDS || '')
    .split(',')
    .map((roleId) => roleId.trim())
    .filter(Boolean);
  const hasRole = allowedRoleIds.length === 0 || roles.some((roleId) => allowedRoleIds.includes(roleId));
  
  return jsonResponse({
    authenticated: true,
    userId: session.userId,
    username: session.username,
    avatar: session.avatar || null,
    isMember: session.isMember !== false,
    roles,
    hasRole
  });
}

async function handleDiscordLogout(request) {
  if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
  const clearCookie = serializeCookie(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: 0,
    secure: new URL(request.url).protocol === 'https:'
  });
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: applySecurityHeaders(new Headers({ ...JSON_HEADERS, 'Set-Cookie': clearCookie }))
  });
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
}

function sanitizeHotspots(input) {
  if (!Array.isArray(input)) return DEFAULT_HOTSPOTS.map((h) => ({ ...h }));
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

function sanitizeChapelAnchorPoints(input) {
  const source = input && typeof input === 'object' ? input : {};
  return Object.fromEntries(
    Object.entries(DEFAULT_CHAPEL_ANCHOR_POINTS).map(([name, fallback]) => {
      const entry = source[name];
      const x = isFiniteNumber(entry?.x) ? clamp(Math.round(entry.x), CHAPEL_LIMITS.minX, CHAPEL_LIMITS.maxX) : fallback.x;
      const y = isFiniteNumber(entry?.y) ? clamp(Math.round(entry.y), CHAPEL_LIMITS.minY, CHAPEL_LIMITS.maxY) : fallback.y;
      return [name, { x, y }];
    })
  );
}

function sanitizeChapelHotspots(input) {
  const entriesById = Array.isArray(input)
    ? new Map(
      input
        .filter((entry) => entry && typeof entry === 'object' && typeof entry.id === 'string')
        .map((entry) => [entry.id, entry])
    )
    : new Map();

  return DEFAULT_CHAPEL_HOTSPOTS.map((fallback) => {
    const entry = entriesById.get(fallback.id);
    const href = typeof entry?.href === 'string' && entry.href.startsWith('/') ? entry.href : fallback.href;
    return { ...fallback, href };
  });
}

function sanitizeChapelConfig(input) {
  const source = input && typeof input === 'object' ? input : {};
  return {
    anchorPoints: sanitizeChapelAnchorPoints(source.anchorPoints),
    hotspots: sanitizeChapelHotspots(source.hotspots)
  };
}

function normalizeArcadeUrl(input) {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^(\/|\.\/|\.\.\/|\?|#)/.test(trimmed)) return trimmed;
  return null;
}

function sanitizeArcadeUrlOverrides(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const overrides = {};
  for (const [name, rawUrl] of Object.entries(input)) {
    if (typeof name !== 'string' || !name.trim()) continue;
    const normalized = normalizeArcadeUrl(rawUrl);
    if (normalized) overrides[name] = normalized;
  }
  return overrides;
}

function sanitizeCornerScore(input) {
  const parsed = Number(input);
  if (!Number.isFinite(parsed)) return 0;
  const floored = Math.floor(parsed);
  return Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, floored));
}

function sanitizeCornerScoreInitials(input) {
  if (typeof input !== 'string') return '';
  const sanitized = input.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
  return sanitized.length === 3 ? sanitized : '';
}

function sanitizeCornerScoreIncrement(input) {
  const parsed = Number(input);
  if (!Number.isFinite(parsed)) return 0;
  const floored = Math.floor(parsed);
  return Math.max(0, Math.min(1000, floored));
}

const CORNER_SCORE_BASELINE = 0;

function getStoredCornerScoreRecord(input) {
  if (input && typeof input === 'object' && !Array.isArray(input)) {
    return {
      score: Math.max(CORNER_SCORE_BASELINE, sanitizeCornerScore(input.score)),
      initials: sanitizeCornerScoreInitials(input.initials)
    };
  }
  return {
    score: Math.max(CORNER_SCORE_BASELINE, sanitizeCornerScore(input)),
    initials: ''
  };
}

function getStoredCornerHighScore(input) {
  return getStoredCornerScoreRecord(input).score;
}

const MAX_NOTES_BYTES = 512 * 1024;
const NOTES_MAX_COUNT = 500;
const NOTES_TITLE_MAX = 500;
const NOTES_BODY_MAX = 50000;
const NOTES_TEXT_MAX = 10000;
const NOTES_ID_MAX = 64;
const NOTES_COLOR_MAX = 64;
const NOTES_TAG_MAX = 64;
const NOTES_TAGS_MAX = 20;
const VALID_VIEW_MODES = new Set(['list', 'grid']);

function sanitizeNotesState(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  if (body.version !== 2) return null;
  const viewMode = VALID_VIEW_MODES.has(body.viewMode) ? body.viewMode : 'list';
  const rawNotes = Array.isArray(body.notes) ? body.notes : [];
  const notes = rawNotes.slice(0, NOTES_MAX_COUNT).map((n) => {
    if (!n || typeof n !== 'object' || Array.isArray(n)) return null;
    return {
      id: typeof n.id === 'string' ? n.id.slice(0, NOTES_ID_MAX) : '',
      title: typeof n.title === 'string' ? n.title.slice(0, NOTES_TITLE_MAX) : '',
      body: typeof n.body === 'string' ? n.body.slice(0, NOTES_BODY_MAX) : '',
      text: typeof n.text === 'string' ? n.text.slice(0, NOTES_TEXT_MAX) : '',
      color: n.color === null
        ? null
        : typeof n.color === 'string'
          ? n.color.slice(0, NOTES_COLOR_MAX)
          : null,
      tags: Array.isArray(n.tags)
        ? n.tags.slice(0, NOTES_TAGS_MAX).map((t) => (typeof t === 'string' ? t.slice(0, NOTES_TAG_MAX) : '')).filter(Boolean)
        : [],
      created: typeof n.created === 'number' && Number.isFinite(n.created) ? n.created : 0,
      pinned: Boolean(n.pinned),
      completedAt: typeof n.completedAt === 'number' && Number.isFinite(n.completedAt) ? n.completedAt : null
    };
  }).filter(Boolean);
  return { notes, viewMode, version: 2 };
}

const HOTSPOT_JSON_HEADERS = {
  'content-type': 'application/json; charset=UTF-8',
  'cache-control': 'no-store',
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type'
};

function hotspotJson(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: applySecurityHeaders(new Headers(HOTSPOT_JSON_HEADERS))
  });
}

const HOTSPOT_SQL_MIGRATIONS = [
  { version: 1, statements: [] },
  {
    version: 2,
    statements: [
      `CREATE TABLE IF NOT EXISTS user_preferences (
        user_id TEXT,
        key TEXT,
        value TEXT,
        updated_at TEXT,
        UNIQUE(user_id, key)
      )`,
      `CREATE TABLE IF NOT EXISTS room_state (
        room_id TEXT,
        key TEXT,
        value TEXT,
        updated_at TEXT,
        PRIMARY KEY(room_id, key)
      )`
    ]
  }
];

function parseJsonText(text) {
  if (typeof text !== 'string') return text ?? null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function toStoredText(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export class HotspotStore {
  constructor(state) {
    this.state = state;
    this.sqlSchemaReady = false;
  }

  readSqlFirstColumn(row) {
    if (!row || typeof row !== 'object') return 0;
    const values = Object.values(row);
    if (values.length === 0) return 0;
    const candidate = Number(values[0]);
    return Number.isFinite(candidate) ? candidate : 0;
  }

  ensureSqlCursorRows(cursor) {
    if (!cursor) return [];
    if (typeof cursor.toArray === 'function') return cursor.toArray();
    if (typeof cursor[Symbol.iterator] === 'function') return [...cursor];
    return [];
  }

  ensureSqlSchema() {
    if (this.sqlSchemaReady) return;
    const sql = this.state?.storage?.sql;
    if (!sql || typeof sql.exec !== 'function') return;
    const pragmaRows = this.ensureSqlCursorRows(sql.exec('PRAGMA user_version'));
    let currentVersion = pragmaRows.length > 0 ? this.readSqlFirstColumn(pragmaRows[0]) : 0;
    HOTSPOT_SQL_MIGRATIONS.forEach((migration) => {
      if (migration.version <= currentVersion) return;
      migration.statements.forEach((statement) => sql.exec(statement));
      sql.exec(`PRAGMA user_version = ${migration.version}`);
      currentVersion = migration.version;
    });
    this.sqlSchemaReady = true;
  }

  async parseJsonBody(request) {
    try {
      return { body: await request.json(), error: null };
    } catch {
      return { body: null, error: hotspotJson({ error: 'Invalid JSON body.' }, 400) };
    }
  }

  userIdFromRequest(request) {
    const userId = request.headers.get('x-naimean-user-id');
    return typeof userId === 'string' && userId.trim() ? userId.trim() : null;
  }

  readUserPreferences(userId) {
    this.ensureSqlSchema();
    const sql = this.state.storage.sql;
    const rows = this.ensureSqlCursorRows(
      sql.exec(
        `SELECT key, value, updated_at
         FROM user_preferences
         WHERE user_id = ?
         ORDER BY key ASC`,
        userId
      )
    );
    const preferences = {};
    rows.forEach((row) => {
      preferences[row.key] = parseJsonText(row.value);
    });
    return { preferences };
  }

  handleUserPreferencesPut(userId, body) {
    this.ensureSqlSchema();
    const sql = this.state.storage.sql;
    const entries = [];
    if (typeof body?.key === 'string' && Object.prototype.hasOwnProperty.call(body, 'value')) {
      entries.push([body.key, body.value]);
    }
    if (body?.preferences && typeof body.preferences === 'object' && !Array.isArray(body.preferences)) {
      Object.entries(body.preferences).forEach(([key, value]) => {
        entries.push([key, value]);
      });
    }
    const normalizedEntries = entries
      .map(([key, value]) => [typeof key === 'string' ? key.trim() : '', value])
      .filter(([key]) => Boolean(key));
    if (normalizedEntries.length === 0) {
      return hotspotJson({ error: 'No preferences provided.' }, 400);
    }
    const updatedAt = new Date().toISOString();
    normalizedEntries.forEach(([key, value]) => {
      sql.exec(
        `INSERT INTO user_preferences (user_id, key, value, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(user_id, key)
         DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        userId,
        key,
        toStoredText(value),
        updatedAt
      );
    });
    return hotspotJson({ ok: true, ...this.readUserPreferences(userId) });
  }

  readRoomState(roomId) {
    this.ensureSqlSchema();
    const sql = this.state.storage.sql;
    const rows = this.ensureSqlCursorRows(
      sql.exec(
        `SELECT key, value, updated_at
         FROM room_state
         WHERE room_id = ?
         ORDER BY key ASC`,
        roomId
      )
    );
    const state = {};
    rows.forEach((row) => {
      state[row.key] = parseJsonText(row.value);
    });
    return { roomId, state };
  }

  handleRoomStatePut(roomId, body) {
    this.ensureSqlSchema();
    const sql = this.state.storage.sql;
    const entries = [];
    if (typeof body?.key === 'string' && Object.prototype.hasOwnProperty.call(body, 'value')) {
      entries.push([body.key, body.value]);
    }
    if (body?.state && typeof body.state === 'object' && !Array.isArray(body.state)) {
      Object.entries(body.state).forEach(([key, value]) => {
        entries.push([key, value]);
      });
    }
    const normalizedEntries = entries
      .map(([key, value]) => [typeof key === 'string' ? key.trim() : '', value])
      .filter(([key]) => Boolean(key));
    if (normalizedEntries.length === 0) {
      return hotspotJson({ error: 'No room state provided.' }, 400);
    }
    const updatedAt = new Date().toISOString();
    normalizedEntries.forEach(([key, value]) => {
      sql.exec(
        `INSERT INTO room_state (room_id, key, value, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(room_id, key)
         DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        roomId,
        key,
        toStoredText(value),
        updatedAt
      );
    });
    return hotspotJson({ ok: true, ...this.readRoomState(roomId) });
  }

  async fetch(request) {
    const pathname = new URL(request.url).pathname;
    const isUserPreferences = pathname === '/api/user-preferences';
    const roomStateMatch = pathname.match(/^\/api\/room-state\/([^/]+)$/);

    if (request.method === 'OPTIONS' && (isUserPreferences || roomStateMatch)) {
      return new Response(null, {
        status: 204,
        headers: {
          ...HOTSPOT_JSON_HEADERS,
          'access-control-allow-methods': 'GET, PUT, OPTIONS'
        }
      });
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
      return hotspotJson({ hotspots: sanitizeHotspots(saved) });
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
          : { hotspots: sanitizeHotspots(body?.hotspots) };
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
        const nextRecord = {
          score: nextScore,
          initials: nextInitials
        };
        if (shouldUpdateScore || shouldUpdateInitials) {
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
          updated: shouldUpdateScore || shouldUpdateInitials
        });
      }
      try {
        await this.state.storage.put(
          storageKey,
          isChapelConfig ? payload : isArcadeUrlOverrides ? payload.overrides : payload.hotspots
        );
      } catch (err) {
        return hotspotJson({ error: `Failed to save hotspots: ${err?.message || 'Unknown error'}` }, 500);
      }
      return hotspotJson({ ok: true, ...payload });
    }
    return hotspotJson({ error: 'Method not allowed.' }, 405);
  }
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

    // Hotspot Durable Object routes
    if (pathname === '/api/hotspots') return dispatchToHotspotStore(env, request, 'den-hotspots');
    if (pathname === '/api/chapel-hotspots') return dispatchToHotspotStore(env, request, 'chapel-hotspots');
    if (pathname === '/api/arcade-url-overrides') return dispatchToHotspotStore(env, request, 'arcade-url-overrides');
    if (pathname === '/api/corner-score') return dispatchToHotspotStore(env, request, 'corner-score');

    // Per-user notes store
    if (pathname === '/api/notes') return handleNotes(request, env);
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
