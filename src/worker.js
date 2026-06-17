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

// ─── Response helpers ─────────────────────────────────────────────────────────
const JSON_HEADERS = {
  'content-type': 'application/json; charset=UTF-8',
  'cache-control': 'no-store',
  'access-control-allow-origin': '*'
};

function jsonResponse(body, status = 200, extraHeaders = {}) {
  const headers = new Headers({ ...JSON_HEADERS, ...extraHeaders });
  return new Response(JSON.stringify(body), { status, headers });
}

// ─── Durable Object Class Wrapper ─────────────────────────────────────────────
export class HotspotStore {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    const url = new URL(request.url);
    const { pathname } = url;
    
    // Wrapped logic to avoid top-level return
    const initResult = await this.handleInitialization(pathname);
    if (initResult) return initResult;

  // Continue from HotspotStore.fetch ...
    const isCalendarEvents = pathname === '/api/calendar-events';
    const isUserPreferences = pathname === '/api/user-preferences';
    const roomStateMatch = pathname.match(/^\/api\/room-state\/([^/]+)$/);

    if (request.method === 'OPTIONS' && (isCalendarEvents || isUserPreferences || roomStateMatch)) {
      const methods = isCalendarEvents ? 'GET, POST, PUT, DELETE, OPTIONS' : 'GET, PUT, OPTIONS';
      return new Response(null, {
        status: 204,
        headers: { ...JSON_HEADERS, 'access-control-allow-methods': methods }
      });
    }

    if (isCalendarEvents) {
      const userId = this.userIdFromRequest(request);
      if (!userId) return jsonResponse({ error: 'Unauthorized' }, 401);
      if (request.method === 'GET') return this.handleCalendarEventsGet(userId);
      if (request.method === 'POST') {
        const { body, error } = await this.parseJsonBody(request);
        if (error) return error;
        return this.handleCalendarEventsPost(userId, body);
      }
      // ... [Include your existing POST/PUT/DELETE logic here] ...
      return jsonResponse({ error: 'Method not allowed.' }, 405);
    }
    
    // ... [Include your isUserPreferences and roomStateMatch handlers here] ...

    return jsonResponse({ error: 'Method not allowed.' }, 405);
  }

  // --- Move helper methods like handleInitialization here as class methods ---
  async handleInitialization(pathname) {
    if (pathname === '/api/fetch-drive-notes') {
      const FOLDER_ID = '13mnHEVznrsh_Lw1RZNhK7wWDV57ZRXyb';
      const API_KEY = this.env.GOOGLE_DRIVE_API_KEY;
      const res = await fetch(`https://www.googleapis.com/drive/v3/files?q='${FOLDER_ID}'+in+parents&key=${API_KEY}`);
      const data = await res.json();
      return jsonResponse(data.files || []);
    }
    return null;
  }
}

// ─── Aquarium / shrimp clips ──────────────────────────────────────────────────
// ... [Place your existing Aquarium, proxy, and dispatchToHotspotStore functions here] ...

// ─── Main worker entry router ──────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;
   

    // ... [Rest of your router logic remains as is] ...
    if (pathname === '/api/health') return jsonResponse({ status: 'healthy', timestamp: Date.now() });
    return serveAsset(request, env, pathname);
  }
};
