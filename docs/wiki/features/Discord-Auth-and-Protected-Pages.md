# Discord Auth + Protected Pages

## User Experience

Discord auth controls both room-level sign-in behavior and access to protected pages.

- The UI checks `/api/discord/me` to render signed-in vs signed-out states.
- Starting login launches a guided sequence then redirects to `/api/discord/auth`.
- Protected pages (notes, MAME GUI, calendar) redirect unauthenticated users to Discord auth.

## Code by File

### `/home/runner/work/Naimean_v3/Naimean_v3/src/worker.js`

```js
const PROTECTED_PAGE_PATHS = new Set([
  '/notes', '/notes.html',
  '/mame-gui', '/mame-gui.html',
  '/calendar', '/calendar.html'
]);

async function maybeRedirectProtectedPage(request, env, url) {
  if (!PROTECTED_PAGE_PATHS.has(url.pathname)) return null;
  const session = await getRequestSession(request, env);
  if (session?.userId) return null;
  const authUrl = new URL('/api/discord/auth', url.origin);
  authUrl.searchParams.set('state', `${url.pathname}${url.search}`);
  return Response.redirect(authUrl.toString(), 302);
}

if (pathname === '/api/discord/auth') return handleDiscordAuth(request, env);
if (pathname === '/api/discord/callback') return handleDiscordCallback(request, env);
if (pathname === '/api/discord/me') return handleDiscordMe(request, env);
if (pathname === '/api/discord/logout') return handleDiscordLogout(request, env);
```

### `/home/runner/work/Naimean_v3/Naimean_v3/public/assets/js/systems/login.js`

```js
async function fetchDiscordAuthState() {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  const res = await fetch('/api/discord/me', { signal: controller.signal });
  window.clearTimeout(timeoutId);
  if (res.ok) {
    state.discordAuthState = await res.json();
  }
  syncLoginOverlayUi();
}

async function beginDiscordLoginFlow(flowSequenceToken = state.loginSequenceToken) {
  if (state.isDiscordLoginSequenceRunning || state.discordAuthState?.authenticated) {
    syncLoginOverlayUi();
    return;
  }

  state.isDiscordLoginSequenceRunning = true;
  syncLoginOverlayUi({ stage: 'starting' });
  // ...timed stage transitions...
  window.location.assign('/api/discord/auth');
}
```

### `/home/runner/work/Naimean_v3/Naimean_v3/public/assets/js/ui/overlays.js`

```js
state.loginOverlayEl = document.createElement('div');
state.loginOverlayEl.className = 'login-overlay';

state.loginPrimaryActionButtonEl = document.createElement('button');
state.loginPrimaryActionButtonEl.type = 'button';
state.loginPrimaryActionButtonEl.className = 'login-submit';
state.loginPrimaryActionButtonEl.addEventListener('click', () =>
  void state._cb.handleLoginPrimaryAction?.()
);

state.loginOverlayEl.append(loginLogo, loginBody);
el.appendChild(state.loginOverlayEl);
state._cb.syncLoginOverlayUi?.();
```
