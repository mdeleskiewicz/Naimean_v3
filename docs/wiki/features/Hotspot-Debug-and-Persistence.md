# Hotspot Debug + Persistence

## User Experience

In debug mode, hotspot coordinates can be edited, locked/unlocked, and saved.

- Save attempts post hotspot data to the server API.
- If server save fails, a modal shows fallback source output to copy manually.
- URL overrides for selected hotspots can be stored locally.

## Code by File

### `/home/runner/work/Naimean_v3/Naimean_v3/public/assets/js/core/constants.js`

```js
export const HOTSPOT_API_PATH = '/api/hotspots';
export const LEGACY_HOTSPOT_API_PATH = '/api/data';
export const LEGACY_HOTSPOT_RECORD_TITLE = 'den-hotspots-v3';
export const SAVE_RETRY_ATTEMPTS = 3;
export const SAVE_RETRY_DELAY_MS = 350;
```

### `/home/runner/work/Naimean_v3/Naimean_v3/public/assets/js/systems/hotspots.js`

```js
async function saveHotspots() {
  if (!ensureDebugSaveAccess()) return;
  const savedRuntimeHotspots = getSavedHotspotsFromDom();
  const savedSourceHotspots = runtimeHotspotsToSource(savedRuntimeHotspots);
  state.hotspots = savedRuntimeHotspots;

  try {
    await postHotspotsToServer(savedSourceHotspots);
    persistSaveResultFlash('Hotspots saved to the server.');
    document.body.classList.remove('debug');
    window.location.reload();
  } catch (error) {
    showSaveFallbackModal(
      savedSourceHotspots,
      `Unable to save to the server (${error.message}) — hotspots were not persisted (server-only mode); copy the code below to update source manually`
    );
  }
}

function saveDenUrlOverride(hotspotId, url) {
  if (!ensureDebugSaveAccess()) return false;
  const trimmed = typeof url === 'string' ? url.trim() : '';
  if (trimmed) state.denUrlOverrides[hotspotId] = trimmed;
  else delete state.denUrlOverrides[hotspotId];
  window.localStorage.setItem(DEN_URL_OVERRIDES_STORAGE_KEY, JSON.stringify(state.denUrlOverrides));
  return true;
}
```

### `/home/runner/work/Naimean_v3/Naimean_v3/src/worker.js`

```js
async function dispatchToHotspotStore(env, request, instanceName) {
  if (!env.HOTSPOT_STORE) {
    return jsonResponse({ error: 'HOTSPOT_STORE binding is missing.' }, 500);
  }
  const stub = env.HOTSPOT_STORE.get(env.HOTSPOT_STORE.idFromName(instanceName));
  return await stub.fetch(request);
}

if (pathname === '/api/hotspots') return dispatchToHotspotStore(env, request, 'den-hotspots');
if (pathname === '/api/chapel-hotspots') return dispatchToHotspotStore(env, request, 'chapel-hotspots');
```

### `/home/runner/work/Naimean_v3/Naimean_v3/public/index.html`

```html
<button id="debug-toggle-btn" type="button" aria-label="Toggle debug mode">🐛</button>
<button id="save-hotspots-btn" type="button" aria-label="Save hotspot positions">Save</button>
<div id="debug-object-controls" aria-label="Debug object controls">
  <label for="debug-object-select">Object</label>
  <select id="debug-object-select" aria-label="Select object for debug lock state"></select>
</div>
<div id="save-modal" class="hidden" role="dialog" aria-modal="true" aria-labelledby="save-modal-title">
  <textarea id="save-modal-textarea" readonly spellcheck="false"></textarea>
</div>
```
