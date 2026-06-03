# Naimean_v3 Architectural Session Pack &amp; Transcript

This artifact consolidates the full architectural diagnostic session, structural assessments, technical matrices, and optimization roadmaps into a single, comprehensive asset.

---

## Section 1: Session Transcript

### [User Input] Codebase Context &amp; Technical Specification
The user provided the core specifications for **Naimean_v3**:
*   **Definition:** Retro, room-based interactive site built around a virtual den deployed on Cloudflare Workers. Combines static pages in `public/` with an edge routing script in `src/worker.js`.
*   **Spaces:** Den (`/`), Noah's Arcade (`/noahs-arcade.html`), Chapel (`/chapel.html`), Commodore (`/commodore.html`), Antechamber (`/antechamber.html`), Calendar (`/calendar.html`), Notes (`/notes.html`), Recombobulator (`/recombobulator.html`), MAME GUI (`/mame-gui.html`), and variant state screens.
*   **Infrastructure Layout:** Cloudflare Worker core runtime, static asset bindings from `public/`, and state handling backed by a Cloudflare Durable Object (`HOTSPOT_STORE`) leveraging built-in SQLite engines.
*   **Wrangler Routing Architecture:** Worker-first routing on all paths via `run_worker_first: ["/*"]`.
*   **The Problem Space:** Eliminating "pretend saving" workflows for hybrid/local states (Calendar data, layout adjustments, power mechanics) and establishing reliable cross-device sync.

### [User Input] UX &amp; Workflow Improvement Plan (Top 10)
1. Server-first calendar persistence.
2. Visible sync status for all saved data indicators.
3. Offline queue + background retry mechanics.
4. Unified in-app navigation layer.
5. Onboarding and contextual guidance layers.
6. Mobile-first interaction pass (touch targets/gestures).
7. Accessibility hardening (focus management/ARIA/motion reduction).
8. Global settings panel normalization.
9. Performance budgeting and heavy media asset optimization.
10. Workflow simplification for administrative structural updates.

---

### [AI Analysis] Diagnostic Architectural &amp; UX Assessment

#### 1. "Split-Brain" State Vulnerability in Hybrid Features
Items **1 (Server-first calendar)**, **2 (Sync status)**, and **3 (Offline queue)** are deeply interdependent. Because your Durable Object runs a single-threaded SQLite instance per storage entity, introducing highly transactional, rapidly changing event arrays can cause lock-contention or massive serialized object writes if data continues to live as a single monolithic JSON blob.
*   **The Risk:** If a user modifies a calendar event offline while another updates it on a desktop, merging two large JSON strings in a Durable Object without an internal CRDT or row-level atomic edits results in the last write winning, completely erasing one session's data.
*   **The Solution:** Do not store calendar events as serialized JSON fields. Leverage the Durable Object's relational SQLite capabilities. Create explicit tables for `calendar_events` and `user_preferences` with structural `updated_at` columns. This allows row-level updates, making background offline synchronization straightforward via standard timestamp checking.

#### 2. Asset Layer Caching vs. Worker-First Routing Overhead
Your configurations define `run_worker_first: ["/*"]`. This means *every single static asset request* passes through the `src/worker.js` routing logic before falling back to or being served by Cloudflare Assets.
*   **The Risk:** For heavy binary assets like `.mp4` aquarium clips, `.png` background frames, or `.wav` soundboard files, passing through the worker engine adds unnecessary CPU execution time and edge latency if your custom header injection logic isn't aggressively optimized.
*   **The Solution:** Ensure that your `src/worker.js` intercepts image/video/audio extensions immediately at the top of the `fetch` handler and returns a bare asset bind response, bypassing session checking, cookie parsing, or routing tables. Your plan for **Performance Budgeting (Item 9)** will fail if the Worker execution overhead bottlenecks streaming assets on mobile pipes.

#### 3. The Authentication Security Loophole on Static Assets
Your plan details **Onboarding &amp; Guidance (Item 5)** and **Workflow Simplification (Item 10)** for admin updates. Right now, your HTML files live under `/public` and are served based on aliases.
*   **The Risk:** If an unauthenticated user or an external script guesses a URL path like `/mame-gui.html` or `/notes.html`, your worker-first router might protect the `/api/notes` data endpoint, but it still serves the entire structural frontend client shell, script tags, and DOM elements to the open web. This leaks application structure and client-side logic.
*   **The Solution:** Implement an inline middleware check in `src/worker.js` for paths ending in `.html`. If a user requests a protected room layout (like `/mame-gui` or `/notes`) and lacks a valid signed Discord session cookie, issue a `302 Redirect` to `/api/discord/auth` *before* letting Cloudflare serve the static asset from the `public` binding.

---

## Section 2: Concrete Technical Recommendations Matrix

| Target System Profile | Legacy Architecture / Bottleneck | Target Relational Architecture Pattern | Tactical Advantage |
| :--- | :--- | :--- | :--- |
| **Durable Object State** | Monolithic JSON strings mapped to monolithic KV storage fields. | Structured tables utilizing raw internal SQLite relational storage. | Guarantees atomic row-level updates; eliminates offline sync race conditions. |
| **Worker Routing Engines** | Heavy binary data frames passing through full execution logic stacks. | Explicit extension short-circuit bypass at the global header parsing phase. | Conserves worker compute cycles; scales performance parameters for mobile pipes. |
| **Client Protection Shields** | APIs restricted via sessions; structural HTML files left wide open. | Server-enforced `302 Redirects` inside the path mapping array matrix. | Shields front-end application blueprints from public scraping attempts. |
| **Media Pipeline Delivery** | Static loops served without context blocks out of the asset directory. | Integrated HTTP Range Request parsing mechanics at the worker border. | Crucial optimization for iOS viewports; forces media to stream properly. |

---

## Section 3: Priority Implementation Action Plan

- [ ] **Step 1: SQLite Engine Migration** — Apply relational structural initialization commands across your Durable Object to establish independent data arrays with native `updated_at` timestamps.
- [ ] **Step 2: Perimeter Route Shielding** — Restructure incoming request maps inside `src/worker.js` to immediately block static asset distribution for admin layouts when active session signatures are absent.
- [ ] **Step 3: Short-Circuit Asset Handling** — Drop a regular expression intercept mapping direct binary structures right at the start of your worker thread to eliminate execution overhead.
- [ ] **Step 4: Unified Sync Telemetry** — Modernize front-end scripts to replace standard mock indicators with true transactional states backed by background retry hooks.

---

## Section 4: Target Infrastructure Source Code

### 1. Refactored Edge Routing Runtime (`src/worker.js`)
```javascript
/**
 * src/worker.js - Naimean_v3 Core Runtime
 * Integrated Relational SQLite DO Architecture, Perimeter Access Protection, and Short-Circuit Assets Bypassing.
 */

// ─── Session &amp; Cryptographic Utilities ────────────────────────────────────────
const DEFAULT_SESSION_SECRET = 'fallback-dev-secret-key-string';
const SESSION_COOKIE = 'naimean_session';
const OAUTH_STATE_COOKIE = 'naimean_oauth_state';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const HMAC_KEY_CACHE = new Map();

async function importHmacKey(secret) {
  const normalizedSecret = secret || DEFAULT_SESSION_SECRET;
  let keyPromise = HMAC_KEY_CACHE.get(normalizedSecret);
  if (!keyPromise) {
    keyPromise = crypto.subtle.importKey(
      'raw', new TextEncoder().encode(normalizedSecret),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']
    );
    HMAC_KEY_CACHE.set(normalizedSecret, keyPromise);
  }
  return keyPromise;
}

function toBase64Url(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  let binary = '';
  for (let i = 0; i &lt; bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function fromBase64Url(str) {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4;
  const base64 = pad ? padded + '='.repeat(4 - pad) : padded;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i &lt; binary.length; i++) bytes[i] = binary.charCodeAt(i);
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
  if (lastDot &lt; 0) return null;
  const encoded = token.slice(0, lastDot);
  const sigStr = token.slice(lastDot + 1);
  let sigBytes;
  try { sigBytes = fromBase64Url(sigStr); } catch { return null; }
  const key = await importHmacKey(secret);
  const valid = await crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(encoded));
  if (!valid) return null;
  try {
    const bytes = new Uint8Array(fromBase64Url(encoded));
    const payload = JSON.parse(new TextDecoder().decode(bytes));
    if (payload.exp &amp;&amp; Date.now() &gt; payload.exp) return null;
    return payload;
  } catch { return null; }
}

function parseCookies(request) {
  const header = request.headers.get('Cookie') || '';
  const cookies = {};
  for (const part of header.split(';')) {
    const eqIdx = part.indexOf('=');
    if (eqIdx &lt; 0) continue;
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

// ─── Response Optimization Helpers ──────────────────────────────────────────
const JSON_HEADERS = { 'content-type': 'application/json; charset=UTF-8', 'cache-control': 'no-store' };
const SECURITY_HEADERS = { 'referrer-policy': 'strict-origin-when-cross-origin', 'x-content-type-options': 'nosniff' };

function applySecurityHeaders(headers) {
  Object.entries(SECURITY_HEADERS).forEach(([name, value]) =&gt; headers.set(name, value));
  return headers;
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: applySecurityHeaders(new Headers(JSON_HEADERS)) });
}

// ─── Static Asset Layer Interceptors ──────────────────────────────────────────
const VERSIONED_ASSET_RE = /\.v\d{4}[^.]*\.(png|mp4|avif|webp)$/i;
const STATIC_BYPASS_RE = /\.(png|mp4|avif|webp|wav|mp3|ico|css|js|jsonc)$/i;

async function serveAsset(request, env, pathname) {
  const upstream = await env.ASSETS.fetch(request);
  const headers = new Headers(upstream.headers);
  
  if (pathname.endsWith('.html') || pathname === '/') {
    headers.set('cache-control', 'no-store');
  } else if (VERSION
