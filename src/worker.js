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
  '.mp4', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.svg', '.ico', 
  '.wav', '.mp3', '.ogg', '.woff2', '.woff', '.ttf', '.css'
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

// ─── Durable Object: HotspotStore ─────────────────────────────────────────────
// (Keep your existing HotspotStore class implementation here as per your original file)
// Note: Ensure the class is exported.
export class HotspotStore {
    constructor(state, env) {
        this.state = state;
        this.env = env; // You can now access env.DB and env.ASSETS_STORAGE here
    }
    // ... [Original HotspotStore methods remain here] ...
    async fetch(request) {
        // Updated logic: you can now perform D1 queries using this.env.DB
        // ...
    }
}

// ─── Main worker entry router ──────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;
    
    // Static assets bypass
    if (shouldBypassStaticAsset(pathname)) {
      return env.ASSETS.fetch(request);
    }

    // New Infrastructure Access points (examples)
    if (pathname === '/api/db-test') {
        const { results } = await env.DB.prepare("SELECT 1").all();
        return jsonResponse({ connected: true, results });
    }

    // Discord endpoints... (keep original)
    // ...

    // Default: Asset handler
    return serveAsset(request, env, pathname);
  }
};
