# Big TV Tools Overlay

## User Experience

The big TV has a tools overlay with two modes:

- **Menu mode:** lists built-in Notes and saved tools.
- **Editor mode:** add/edit tool name + URL and return to menu.

Custom tools are saved in local storage, and launching a tool opens it in a new tab.

## Code by File

### `/home/runner/work/Naimean_v3/Naimean_v3/public/assets/js/core/constants.js`

```js
export const BIG_TV_TOOLS_STORAGE_KEY = 'naimean.bigTvTools.entries';
export const BIG_TV_TOOLS_MAX_NAME_LENGTH = 80;
export const BIG_TV_TOOLS_MAX_URL_LENGTH = 2048;
export const BIG_TV_TOOLS_LOGO_URL = 'assets/images/big-tv-tools-logo.png';
export const NOTES_URL = 'notes.html';
```

### `/home/runner/work/Naimean_v3/Naimean_v3/public/assets/js/ui/overlays.js`

```js
state.bigTvToolsOverlayEl = document.createElement('div');
state.bigTvToolsOverlayEl.className = 'big-tv-tools-overlay';

const toolsHeader = document.createElement('div');
toolsHeader.className = 'big-tv-tools-header';
state.bigTvToolsHeaderActionButtonEl = document.createElement('button');
state.bigTvToolsHeaderActionButtonEl.className = 'big-tv-tools-header-action';
state.bigTvToolsHeaderActionButtonEl.textContent = '+';

const toolsLogo = document.createElement('img');
toolsLogo.className = 'big-tv-tools-logo';
toolsLogo.src = BIG_TV_TOOLS_LOGO_URL;

toolsHeader.append(state.bigTvToolsHeaderActionButtonEl, toolsLogo);

state.bigTvToolsListEl = document.createElement('div');
state.bigTvToolsListEl.className = 'big-tv-tools-list';

state.bigTvToolsFooterEl = document.createElement('div');
state.bigTvToolsFooterEl.className = 'big-tv-tools-footer is-hidden';

state.bigTvToolsOverlayEl.append(toolsHeader, state.bigTvToolsListEl, state.bigTvToolsFooterEl);
el.appendChild(state.bigTvToolsOverlayEl);
```

### `/home/runner/work/Naimean_v3/Naimean_v3/public/assets/js/systems/tools.js`

```js
function loadBigTvToolsEntries() {
  const storedValue = window.localStorage.getItem(BIG_TV_TOOLS_STORAGE_KEY);
  if (!storedValue) return [];
  const parsedValue = JSON.parse(storedValue);
  if (!Array.isArray(parsedValue)) return [];
  return parsedValue.map(normalizeBigTvToolEntry).filter((entry) => entry.name || entry.url);
}

function saveBigTvToolsEntries() {
  if (!ensureDebugSaveAccess()) return;
  const sanitizedEntries = state.bigTvToolsEntries.map(normalizeBigTvToolEntry);
  state.bigTvToolsEntries = sanitizedEntries;
  window.localStorage.setItem(BIG_TV_TOOLS_STORAGE_KEY, JSON.stringify(sanitizedEntries));
}

function showBigTvToolsMenu() {
  state.bigTvToolsViewMode = 'menu';
  syncBigTvToolsUiMode();
}

function showBigTvToolsEditor({ focusRowIndex = null, focusField = 'name' } = {}) {
  state.bigTvToolsViewMode = 'editor';
  syncBigTvToolsUiMode({ focusRowIndex, focusField });
}
```

### `/home/runner/work/Naimean_v3/Naimean_v3/public/assets/css/index.css`

```css
.big-tv-tools-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}

.big-tv-tools-overlay.is-active {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}

.big-tv-tools-list {
  flex: 1;
  overflow-y: auto;
}
```
