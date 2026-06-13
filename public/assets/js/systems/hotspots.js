import {
  API_TIMEOUT_MS,
  AQUARIUM_HOTSPOT_IDS,
  AQUARIUM_OVERLAY_ID,
  CHAPEL_URL,
  COMMODORE_HITBOX_HORIZONTAL_INSET,
  COMMODORE_HITBOX_VERTICAL_INSET,
  COMMODORE_MIN_SOURCE_HITBOX_HEIGHT,
  COMMODORE_MIN_SOURCE_HITBOX_WIDTH,
  COMMODORE_OVERLAY_CONTROL_ID,
  COMMODORE_POWER_BUTTON_CONTROL_ID,
  DEFAULT_LEFT_MONITOR_STATE,
  DEN_URL_OVERRIDES_STORAGE_KEY,
  DISCORD_OVERLAY_CONTROL_ID,
  DISCORD_OVERLAY_ID,
  HOTSPOT_API_PATH,
  HOTSPOT_CLICK_SUPPRESSION_MS,
  HOTSPOT_READABLE_LABELS,
  LEGACY_HOTSPOT_API_PATH,
  LEGACY_HOTSPOT_RECORD_TITLE,
  LEGACY_MONITOR_BOUNDS_TOLERANCE_PX,
  LOCKED_DEBUG_HOTSPOT_IDS,
  MIN_HOTSPOT_SIZE,
  MIN_MONITOR_RATIO_DENOMINATOR,
  MONITOR_FRAME_BOUNDS_BY_OVERLAY_CONTROL_ID,
  MONITOR_SCREEN_INSETS_BY_CONTROL_ID,
  MONITOR_SCREEN_INSETS_BY_OVERLAY_ID,
  MONITOR_SCREEN_INSETS_BY_SIDE_FRAME_CONTROL_ID,
  NEDRY_GATE_TRIGGER_HOTSPOT_IDS,
  NOAHS_ARCADE_HOTSPOT_ID,
  NOAHS_ARCADE_URL,
  NOTES_URL,
  OVERLAY_CONTROL_TO_OVERLAY_ID,
  OVERLAY_ID_TO_CONTROL_ID,
  PENCIL_SHARPENER_HOTSPOT_ID,
  SAVE_BUTTON_RESET_MS,
  SAVE_RETRY_ATTEMPTS,
  SAVE_RETRY_DELAY_MS,
  SAVE_RESULT_FLASH_KEY,
  WHITEBOARD_HOTSPOT_IDS,
  WHITEBOARD_HOTSPOT_URLS,
  LEFT_MONITOR_SIDE_FRAME_CONTROL_ID,
  RIGHT_MONITOR_SIDE_FRAME_CONTROL_ID,
  defaultHotspots,
  overlayDefaults
} from '../core/constants.js';
import { state } from '../core/state.js';
import { dom } from '../core/domRefs.js';
import { wait, sourceHotspotsToRuntime, runtimeHotspotXToSource, frameBoundsToScreenBounds } from '../core/utils.js';
import { loadAquariumShrimpClipCatalog } from './aquarium.js';
import { loadCornerScoreFromServer } from './cornerScore.js';
import { fetchDiscordAuthState, syncDiscordAuthBodyClass, syncDiscordButtonUi } from './login.js';

const DEBUG_SAVE_PASSWORD_KEY = 'naimean-debug';
const DEBUG_SAVE_PASSWORD_CIPHER = [90, 87, 91, 84, 85];

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function screenBoundsToFrameBounds(screenBounds, insets) {
  const usableWidthRatio = Math.max(MIN_MONITOR_RATIO_DENOMINATOR, 1 - insets.left - insets.right);
  const usableHeightRatio = Math.max(MIN_MONITOR_RATIO_DENOMINATOR, 1 - insets.top - insets.bottom);
  const w = screenBounds.w / usableWidthRatio;
  const h = screenBounds.h / usableHeightRatio;
  const x = screenBounds.x - (w * insets.left);
  const y = screenBounds.y - (h * insets.top);
  return { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
}

function normalizeLegacyMonitorOverlayControlBounds(spot, fallback, { allowLegacyNormalization = true } = {}) {
  if (!allowLegacyNormalization) return spot;
  const insets = MONITOR_SCREEN_INSETS_BY_CONTROL_ID.get(spot.id);
  const legacyFrameBounds = MONITOR_FRAME_BOUNDS_BY_OVERLAY_CONTROL_ID.get(spot.id);
  if (!insets || !legacyFrameBounds) return spot;
  const resemblesLegacyFrameBounds =
    Math.abs(spot.x - legacyFrameBounds.x) <= LEGACY_MONITOR_BOUNDS_TOLERANCE_PX &&
    Math.abs(spot.y - legacyFrameBounds.y) <= LEGACY_MONITOR_BOUNDS_TOLERANCE_PX &&
    Math.abs(spot.w - legacyFrameBounds.w) <= LEGACY_MONITOR_BOUNDS_TOLERANCE_PX &&
    Math.abs(spot.h - legacyFrameBounds.h) <= LEGACY_MONITOR_BOUNDS_TOLERANCE_PX;
  if (!resemblesLegacyFrameBounds) return spot;
  const normalizedScreenBounds = frameBoundsToScreenBounds(spot, insets);
  return {
    ...spot,
    x: normalizedScreenBounds.x,
    y: normalizedScreenBounds.y,
    w: Math.max(MIN_HOTSPOT_SIZE, normalizedScreenBounds.w),
    h: Math.max(MIN_HOTSPOT_SIZE, normalizedScreenBounds.h)
  };
}

function normalizeLegacyMonitorSideFrameControlBounds(spot, fallback) {
  const insets = MONITOR_SCREEN_INSETS_BY_SIDE_FRAME_CONTROL_ID.get(spot.id);
  if (!insets) return spot;
  const legacyScreenBounds = frameBoundsToScreenBounds(fallback, insets);
  const resemblesLegacyScreenBounds =
    Math.abs(spot.w - legacyScreenBounds.w) <= LEGACY_MONITOR_BOUNDS_TOLERANCE_PX &&
    Math.abs(spot.h - legacyScreenBounds.h) <= LEGACY_MONITOR_BOUNDS_TOLERANCE_PX;
  if (!resemblesLegacyScreenBounds) return spot;
  const normalizedFrameBounds = screenBoundsToFrameBounds(spot, insets);
  return {
    ...spot,
    x: normalizedFrameBounds.x,
    y: normalizedFrameBounds.y,
    w: Math.max(MIN_HOTSPOT_SIZE, normalizedFrameBounds.w),
    h: Math.max(MIN_HOTSPOT_SIZE, normalizedFrameBounds.h)
  };
}

function sanitizeSourceHotspots(input) {
  if (!Array.isArray(input)) return null;
  const entriesById = new Map();
  input.forEach((entry) => {
    if (!entry || typeof entry !== 'object' || typeof entry.id !== 'string') return;
    entriesById.set(entry.id, entry);
  });
  const hasModernMonitorSideFrameControls =
    entriesById.has(LEFT_MONITOR_SIDE_FRAME_CONTROL_ID) ||
    entriesById.has(RIGHT_MONITOR_SIDE_FRAME_CONTROL_ID);

  return defaultHotspots.map((fallback) => {
    const entry = entriesById.get(fallback.id);
    const minWidth = fallback.id === COMMODORE_OVERLAY_CONTROL_ID ? COMMODORE_MIN_SOURCE_HITBOX_WIDTH : MIN_HOTSPOT_SIZE;
    const minHeight = fallback.id === COMMODORE_OVERLAY_CONTROL_ID ? COMMODORE_MIN_SOURCE_HITBOX_HEIGHT : MIN_HOTSPOT_SIZE;
    if (!entry) return { ...fallback };
    const sanitizedEntry = {
      id: fallback.id,
      x: isFiniteNumber(entry.x) ? Math.round(entry.x) : fallback.x,
      y: isFiniteNumber(entry.y) ? Math.round(entry.y) : fallback.y,
      w: isFiniteNumber(entry.w) ? Math.max(minWidth, Math.round(entry.w)) : fallback.w,
      h: isFiniteNumber(entry.h) ? Math.max(minHeight, Math.round(entry.h)) : fallback.h,
      ...(entry.locked === true ? { locked: true } : {})
    };
    const normalized = normalizeLegacyMonitorOverlayControlBounds(sanitizedEntry, fallback, {
      allowLegacyNormalization: !hasModernMonitorSideFrameControls
    });
    return normalizeLegacyMonitorSideFrameControlBounds(normalized, fallback);
  });
}

function getSavedHotspotsFromDom() {
  const saved = [];
  dom.hotspotLayer.querySelectorAll('.hotspot').forEach((el) => {
    const entry = {
      id: el.id,
      x: Math.round(parseFloat(el.style.left)),
      y: Math.round(parseFloat(el.style.top)),
      w: Math.round(parseFloat(el.style.width)),
      h: Math.round(parseFloat(el.style.height))
    };
    if (el.classList.contains('locked-debug-hotspot')) {
      entry.locked = true;
    }
    saved.push(entry);
  });
  return saved;
}

function getRuntimeHotspotById(id) {
  return state.hotspots.find((spot) => spot.id === id) || null;
}

function rectFromBounds(bounds) {
  return { x: bounds.x, y: bounds.y, w: bounds.w, h: bounds.h };
}

function getOverlayRect(overlayId) {
  let controlHotspotId = OVERLAY_ID_TO_CONTROL_ID.get(overlayId);
  if (!controlHotspotId && overlayId === AQUARIUM_OVERLAY_ID) {
    controlHotspotId = DISCORD_OVERLAY_CONTROL_ID;
  }
  if (controlHotspotId) {
    const controlledSpot = getRuntimeHotspotById(controlHotspotId);
    if (controlledSpot) {
      if (overlayId === 'overlay-commodore-screen') {
        return {
          x: controlledSpot.x - COMMODORE_HITBOX_HORIZONTAL_INSET,
          y: controlledSpot.y - COMMODORE_HITBOX_VERTICAL_INSET,
          w: controlledSpot.w + (COMMODORE_HITBOX_HORIZONTAL_INSET * 2),
          h: controlledSpot.h + (COMMODORE_HITBOX_VERTICAL_INSET * 2)
        };
      }
      const monitorInsets = MONITOR_SCREEN_INSETS_BY_OVERLAY_ID.get(overlayId);
      if (monitorInsets) {
        return screenBoundsToFrameBounds(controlledSpot, monitorInsets);
      }
      return rectFromBounds(controlledSpot);
    }
  }
  const fallback = overlayDefaults.find((overlay) => overlay.id === overlayId);
  return fallback ? rectFromBounds(fallback) : null;
}

function syncControlledOverlaysFromHotspots() {
  OVERLAY_CONTROL_TO_OVERLAY_ID.forEach((overlayId, controlHotspotId) => {
    const hotspotEl = document.getElementById(controlHotspotId);
    const overlayEl = state.overlayElementsById.get(overlayId);
    if (!hotspotEl || !overlayEl) return;
    if (overlayId === 'overlay-commodore-screen') {
      const hotspotLeft = parseFloat(hotspotEl.style.left);
      const hotspotTop = parseFloat(hotspotEl.style.top);
      const hotspotWidth = parseFloat(hotspotEl.style.width);
      const hotspotHeight = parseFloat(hotspotEl.style.height);
      overlayEl.style.left = `${hotspotLeft - COMMODORE_HITBOX_HORIZONTAL_INSET}px`;
      overlayEl.style.top = `${hotspotTop - COMMODORE_HITBOX_VERTICAL_INSET}px`;
      overlayEl.style.width = `${hotspotWidth + (COMMODORE_HITBOX_HORIZONTAL_INSET * 2)}px`;
      overlayEl.style.height = `${hotspotHeight + (COMMODORE_HITBOX_VERTICAL_INSET * 2)}px`;
      return;
    }
    const monitorInsets = MONITOR_SCREEN_INSETS_BY_OVERLAY_ID.get(overlayId);
    if (monitorInsets) {
      const frameBounds = screenBoundsToFrameBounds({
        x: parseFloat(hotspotEl.style.left),
        y: parseFloat(hotspotEl.style.top),
        w: parseFloat(hotspotEl.style.width),
        h: parseFloat(hotspotEl.style.height)
      }, monitorInsets);
      overlayEl.style.left = `${frameBounds.x}px`;
      overlayEl.style.top = `${frameBounds.y}px`;
      overlayEl.style.width = `${frameBounds.w}px`;
      overlayEl.style.height = `${frameBounds.h}px`;
      return;
    }
    overlayEl.style.left = hotspotEl.style.left;
    overlayEl.style.top = hotspotEl.style.top;
    overlayEl.style.width = hotspotEl.style.width;
    overlayEl.style.height = hotspotEl.style.height;
  });
  const discordOverlayEl = state.overlayElementsById.get(DISCORD_OVERLAY_ID);
  const aquariumOverlayEl = state.overlayElementsById.get(AQUARIUM_OVERLAY_ID);
  if (discordOverlayEl && aquariumOverlayEl) {
    aquariumOverlayEl.style.left = discordOverlayEl.style.left;
    aquariumOverlayEl.style.top = discordOverlayEl.style.top;
    aquariumOverlayEl.style.width = discordOverlayEl.style.width;
    aquariumOverlayEl.style.height = discordOverlayEl.style.height;
  }
}

function runtimeHotspotsToSource(runtimeHotspots) {
  return runtimeHotspots.map((spot) => {
    let sourceX = runtimeHotspotXToSource(spot.id, spot.x);
    let sourceY = spot.y;
    let sourceW = spot.w;
    let sourceH = spot.h;
    if (spot.id === COMMODORE_OVERLAY_CONTROL_ID) {
      sourceX -= COMMODORE_HITBOX_HORIZONTAL_INSET;
      sourceW = Math.max(COMMODORE_MIN_SOURCE_HITBOX_WIDTH, sourceW + (COMMODORE_HITBOX_HORIZONTAL_INSET * 2));
      sourceY -= COMMODORE_HITBOX_VERTICAL_INSET;
      sourceH = Math.max(COMMODORE_MIN_SOURCE_HITBOX_HEIGHT, sourceH + (COMMODORE_HITBOX_VERTICAL_INSET * 2));
    }
    return {
      id: spot.id,
      x: sourceX,
      y: sourceY,
      w: sourceW,
      h: sourceH,
      ...(spot.locked ? { locked: true } : {})
    };
  });
}

function getSourceOutput(sourceHotspots) {
  const lines = sourceHotspots.map((spot) =>
    `  { id: ${JSON.stringify(spot.id)}, x: ${spot.x}, y: ${spot.y}, w: ${spot.w}, h: ${spot.h} },`
  );
  return `const hotspots = [\n${lines.join('\n')}\n].map((spot) => ({ ...spot, x: spot.x + 3840 }));`;
}

function persistSaveResultFlash(message) {
  try { sessionStorage.setItem(SAVE_RESULT_FLASH_KEY, message); } catch (_) {}
}

function consumeSaveResultFlash() {
  try {
    const flash = sessionStorage.getItem(SAVE_RESULT_FLASH_KEY);
    if (!flash) return '';
    sessionStorage.removeItem(SAVE_RESULT_FLASH_KEY);
    return flash;
  } catch (_) {
    return '';
  }
}

function shouldUseLegacyDataApi(status) {
  return status === 404;
}

function extractSourceHotspotsFromLegacyRows(rows) {
  if (!Array.isArray(rows)) return null;
  for (const row of rows) {
    if (!row || row.title !== LEGACY_HOTSPOT_RECORD_TITLE) continue;
    let parsed = null;
    if (typeof row.content === 'string') {
      try { parsed = JSON.parse(row.content); } catch (_) {}
    } else if (Array.isArray(row.content)) {
      parsed = row.content;
    }
    const sanitized = sanitizeSourceHotspots(parsed);
    if (sanitized) return sanitized;
  }
  return null;
}

async function loadHotspotsFromLegacyServer() {
  try {
    const response = await fetch(LEGACY_HOTSPOT_API_PATH, { cache: 'no-store' });
    if (!response.ok) return null;
    const payload = await response.json();
    const sanitized = extractSourceHotspotsFromLegacyRows(payload);
    return sanitized ? sourceHotspotsToRuntime(sanitized) : null;
  } catch (_) {
    return null;
  }
}

async function loadHotspotsFromServer() {
  if (state.hotspotApiMode === 'legacy') {
    return loadHotspotsFromLegacyServer();
  }
  try {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), API_TIMEOUT_MS);
    const response = await fetch(HOTSPOT_API_PATH, { cache: 'no-store', signal: controller.signal });
    window.clearTimeout(timeoutId);
    if (!response.ok) {
      if (shouldUseLegacyDataApi(response.status)) {
        state.hotspotApiMode = 'legacy';
        return loadHotspotsFromLegacyServer();
      }
      return null;
    }
    const payload = await response.json();
    const sanitized = sanitizeSourceHotspots(payload?.hotspots);
    return sanitized ? sourceHotspotsToRuntime(sanitized) : null;
  } catch (_) {
    return null;
  }
}

function encodeDebugSavePassword(value) {
  const source = String(value ?? '');
  return Array.from(source, (char, index) => char.charCodeAt(0) ^ DEBUG_SAVE_PASSWORD_KEY.charCodeAt(index % DEBUG_SAVE_PASSWORD_KEY.length));
}

function hasMatchingDebugSaveCipher(encodedValue) {
  return encodedValue.length === DEBUG_SAVE_PASSWORD_CIPHER.length && encodedValue.every((byte, index) => byte === DEBUG_SAVE_PASSWORD_CIPHER[index]);
}

function ensureDebugSaveAccess() {
  if (!document.body.classList.contains('debug')) return true;
  if (state.hasDebugSaveAccess) return true;
  const attempt = window.prompt('Debug save password required.');
  if (attempt === null) {
    if (dom.debugStatus) dom.debugStatus.textContent = 'Debug save cancelled.';
    return false;
  }
  const isValid = hasMatchingDebugSaveCipher(encodeDebugSavePassword(attempt.trim()));
  if (!isValid) {
    if (dom.debugStatus) dom.debugStatus.textContent = 'Debug save password incorrect.';
    return false;
  }
  state.hasDebugSaveAccess = true;
  if (dom.debugStatus) dom.debugStatus.textContent = 'Debug save unlocked.';
  return true;
}

async function readResponseErrorText(response) {
  try {
    const payload = await response.clone().json();
    if (payload && typeof payload.error === 'string' && payload.error.trim()) return payload.error.trim();
  } catch (_) {}
  try {
    const text = await response.text();
    if (text && text.trim()) return text.trim();
  } catch (_) {}
  return '';
}

async function postHotspotsToLegacyServer(savedSourceHotspots) {
  let lastError = null;
  for (let attempt = 1; attempt <= SAVE_RETRY_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(LEGACY_HOTSPOT_API_PATH, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: LEGACY_HOTSPOT_RECORD_TITLE, content: JSON.stringify(savedSourceHotspots) }),
        cache: 'no-store'
      });
      if (!response.ok) {
        const errorDetails = await readResponseErrorText(response);
        throw new Error(errorDetails ? `Server save failed (${response.status}): ${errorDetails}` : `Server save failed (${response.status})`);
      }
      return;
    } catch (error) {
      lastError = error;
      if (attempt < SAVE_RETRY_ATTEMPTS) {
        await wait(SAVE_RETRY_DELAY_MS * (2 ** (attempt - 1)));
      }
    }
  }
  throw lastError || new Error('Server save failed');
}

async function postHotspotsToServer(savedSourceHotspots) {
  if (state.hotspotApiMode === 'legacy') {
    await postHotspotsToLegacyServer(savedSourceHotspots);
    return;
  }
  let lastError = null;
  for (let attempt = 1; attempt <= SAVE_RETRY_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(HOTSPOT_API_PATH, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ hotspots: savedSourceHotspots }),
        cache: 'no-store'
      });
      if (!response.ok) {
        if (shouldUseLegacyDataApi(response.status)) {
          state.hotspotApiMode = 'legacy';
          await postHotspotsToLegacyServer(savedSourceHotspots);
          return;
        }
        const errorDetails = await readResponseErrorText(response);
        throw new Error(errorDetails ? `Server save failed (${response.status}): ${errorDetails}` : `Server save failed (${response.status})`);
      }
      return;
    } catch (error) {
      lastError = error;
      if (attempt < SAVE_RETRY_ATTEMPTS) {
        await wait(SAVE_RETRY_DELAY_MS * (2 ** (attempt - 1)));
      }
    }
  }
  throw lastError || new Error('Server save failed');
}

function setSaveButtonText(text, disabled = false) {
  dom.saveBtn.textContent = text;
  dom.saveBtn.disabled = disabled;
}

function resetSaveButtonSoon() {
  if (state.saveButtonResetTimeoutId !== null) {
    window.clearTimeout(state.saveButtonResetTimeoutId);
  }
  state.saveButtonResetTimeoutId = window.setTimeout(() => {
    setSaveButtonText('Save');
    state.saveButtonResetTimeoutId = null;
  }, SAVE_BUTTON_RESET_MS);
}

function hideSaveModal() {
  dom.saveModal.classList.add('hidden');
}

function showSaveFallbackModal(sourceHotspots, message) {
  dom.saveModalTitle.textContent = message;
  dom.saveModalTextarea.value = getSourceOutput(sourceHotspots);
  dom.saveModal.classList.remove('hidden');
}

async function saveHotspots() {
  if (!ensureDebugSaveAccess()) {
    setSaveButtonText('Password required');
    resetSaveButtonSoon();
    return;
  }
  const savedRuntimeHotspots = getSavedHotspotsFromDom();
  const savedSourceHotspots = runtimeHotspotsToSource(savedRuntimeHotspots);
  state.hotspots = savedRuntimeHotspots;
  hideSaveModal();
  setSaveButtonText('Saving...', true);
  state.saveBadge?.saving?.();
  try {
    await postHotspotsToServer(savedSourceHotspots);
    state.saveBadge?.saved?.();
    persistSaveResultFlash('Hotspots saved to the server.');
    document.body.classList.remove('debug');
    window.location.reload();
  } catch (error) {
    setSaveButtonText('Save failed');
    state.saveBadge?.failed?.(saveHotspots);
    if (dom.debugStatus) {
      dom.debugStatus.textContent = 'Server save failed; hotspots were not persisted (server-only mode).';
    }
    showSaveFallbackModal(savedSourceHotspots, `Unable to save to the server (${error.message}) — hotspots were not persisted (server-only mode); copy the code below to update source manually`);
    resetSaveButtonSoon();
  }
}

function addResizeHandles(el) {
  ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'].forEach((dir) => {
    const handle = document.createElement('div');
    handle.className = `resize-handle resize-${dir}`;
    handle.dataset.dir = dir;
    handle.setAttribute('aria-hidden', 'true');
    el.appendChild(handle);
  });
}

function updateHotspotLabel(el) {
  const label = el.querySelector('.hotspot-label');
  if (!label) return;
  const readableLabel = el.dataset.label || el.id;
  const x = Math.round(parseFloat(el.style.left));
  const y = Math.round(parseFloat(el.style.top));
  const w = Math.round(parseFloat(el.style.width));
  const h = Math.round(parseFloat(el.style.height));
  label.textContent = `${readableLabel} (${x}, ${y}) ${w}×${h}`;
}

function getDebugHotspotElements() {
  return Array.from(dom.hotspotLayer.querySelectorAll('.hotspot'));
}

function getDebugHotspotLabel(hotspotEl) {
  return hotspotEl.dataset.label || hotspotEl.id;
}

function getSelectedDebugHotspotElement() {
  const selectedId = dom.debugObjectSelect?.value;
  return selectedId ? document.getElementById(selectedId) : null;
}

function getHotspotDefaultUrl(hotspotId) {
  if (hotspotId === NOAHS_ARCADE_HOTSPOT_ID) return NOAHS_ARCADE_URL;
  if (hotspotId === 'chapel') return CHAPEL_URL;
  if (hotspotId === PENCIL_SHARPENER_HOTSPOT_ID) return NOTES_URL;
  if (WHITEBOARD_HOTSPOT_IDS.has(hotspotId)) return WHITEBOARD_HOTSPOT_URLS[hotspotId] || WHITEBOARD_HOTSPOT_URLS.whiteboard;
  return null;
}

function loadDenUrlOverrides() {
  try {
    const stored = window.localStorage.getItem(DEN_URL_OVERRIDES_STORAGE_KEY);
    if (!stored) return {};
    const parsed = JSON.parse(stored);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
  } catch {}
  return {};
}

function saveDenUrlOverride(hotspotId, url) {
  if (!ensureDebugSaveAccess()) return false;
  const trimmed = typeof url === 'string' ? url.trim() : '';
  if (trimmed) state.denUrlOverrides[hotspotId] = trimmed;
  else delete state.denUrlOverrides[hotspotId];
  try {
    window.localStorage.setItem(DEN_URL_OVERRIDES_STORAGE_KEY, JSON.stringify(state.denUrlOverrides));
    return true;
  } catch {
    return false;
  }
}

function getHotspotEffectiveUrl(hotspotId) {
  return state.denUrlOverrides[hotspotId] || getHotspotDefaultUrl(hotspotId);
}

function refreshDebugObjectActions() {
  if (!dom.debugObjectLockButton || !dom.debugObjectUnlockButton || !dom.debugObjectSelect) return;
  const selectedEl = getSelectedDebugHotspotElement();
  const hasSelection = !!selectedEl;
  const isLocked = hasSelection && selectedEl.classList.contains('locked-debug-hotspot');
  dom.debugObjectLockButton.disabled = !hasSelection || isLocked;
  dom.debugObjectUnlockButton.disabled = !hasSelection || !isLocked;
  if (dom.debugUrlRow && dom.debugUrlInput) {
    const selectedId = hasSelection ? selectedEl.id : null;
    const defaultUrl = selectedId ? getHotspotDefaultUrl(selectedId) : null;
    if (defaultUrl !== null) {
      dom.debugUrlRow.hidden = false;
      dom.debugUrlInput.value = getHotspotEffectiveUrl(selectedId);
      dom.debugUrlInput.placeholder = defaultUrl;
    } else {
      dom.debugUrlRow.hidden = true;
      dom.debugUrlInput.value = '';
    }
  }
}

function refreshDebugObjectSelectOptions() {
  if (!dom.debugObjectSelect) return;
  const previousSelection = dom.debugObjectSelect.value;
  const hotspotElements = getDebugHotspotElements().sort((a, b) => getDebugHotspotLabel(a).localeCompare(getDebugHotspotLabel(b)));
  dom.debugObjectSelect.textContent = '';
  if (!hotspotElements.length) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'No objects available';
    dom.debugObjectSelect.appendChild(option);
    dom.debugObjectSelect.disabled = true;
    refreshDebugObjectActions();
    return;
  }
  hotspotElements.forEach((hotspotEl) => {
    const option = document.createElement('option');
    option.value = hotspotEl.id;
    option.textContent = getDebugHotspotLabel(hotspotEl);
    dom.debugObjectSelect.appendChild(option);
  });
  dom.debugObjectSelect.disabled = false;
  dom.debugObjectSelect.value = previousSelection && hotspotElements.some((hotspotEl) => hotspotEl.id === previousSelection)
    ? previousSelection
    : hotspotElements[0].id;
  refreshDebugObjectActions();
}

function setHotspotDebugLockState(hotspotId, isLocked) {
  const hotspotEl = document.getElementById(hotspotId);
  if (!hotspotEl) return;
  hotspotEl.classList.toggle('locked-debug-hotspot', isLocked);
  if (isLocked) LOCKED_DEBUG_HOTSPOT_IDS.add(hotspotId);
  else LOCKED_DEBUG_HOTSPOT_IDS.delete(hotspotId);
  refreshDebugObjectActions();
}

function hydrateNonCriticalSceneData() {
  void loadAquariumShrimpClipCatalog();
  void loadCornerScoreFromServer();
  void fetchDiscordAuthState().then(() => {
    syncDiscordAuthBodyClass();
    syncDiscordButtonUi();
  });
}

function hydrateHotspotsFromServer({ hasSaveResultFlash = false } = {}) {
  void loadHotspotsFromServer().then((serverHotspots) => {
    const hasServerHotspots = serverHotspots !== null && serverHotspots !== undefined;
    if (hasServerHotspots) {
      state.hotspots = serverHotspots;
      state._cb.renderHotspotLayers?.();
      state._cb.resize?.();
    }
    if (!hasSaveResultFlash && dom.debugStatus) {
      dom.debugStatus.textContent = hasServerHotspots
        ? 'Hotspots loaded from the server.'
        : 'Server hotspots unavailable; loaded bundled default hotspots.';
    }
  });
}

async function loadHotspots() {
  const serverHotspots = await loadHotspotsFromServer();
  if (serverHotspots) {
    state.hotspots = serverHotspots;
    state._cb.renderHotspotLayers?.();
    state._cb.resize?.();
  }
  return serverHotspots;
}

function applyHotspotsToDOM() {
  state._cb.renderHotspotLayers?.();
}

function renderHotspots() {
  state._cb.renderHotspotLayers?.();
}

function createHotspots(hotspotList) {
  dom.hotspotLayer.textContent = '';
  const toTitleCase = (value) => value.split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  hotspotList.forEach((spot) => {
    const readableLabel = HOTSPOT_READABLE_LABELS.get(spot.id) || (NEDRY_GATE_TRIGGER_HOTSPOT_IDS.has(spot.id) ? 'Join our Discord' : toTitleCase(spot.id));
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'hotspot';
    if (OVERLAY_CONTROL_TO_OVERLAY_ID.has(spot.id) && spot.id !== COMMODORE_OVERLAY_CONTROL_ID) {
      el.classList.add('overlay-control-hotspot');
    }
    if (LOCKED_DEBUG_HOTSPOT_IDS.has(spot.id) || spot.locked) {
      el.classList.add('locked-debug-hotspot');
      LOCKED_DEBUG_HOTSPOT_IDS.add(spot.id);
    }
    el.id = spot.id;
    el.style.left = `${spot.x}px`;
    el.style.top = `${spot.y}px`;
    el.style.width = `${spot.w}px`;
    el.style.height = `${spot.h}px`;
    el.dataset.label = readableLabel;
    el.setAttribute('aria-label', readableLabel);
    el.title = readableLabel;
    const label = document.createElement('span');
    label.className = 'hotspot-label';
    label.textContent = `${readableLabel} (${spot.x}, ${spot.y}) ${spot.w}×${spot.h}`;
    el.appendChild(label);
    addResizeHandles(el);
    el.addEventListener('click', () => {
      if (spot.id === NOAHS_ARCADE_HOTSPOT_ID) return void window.location.assign(getHotspotEffectiveUrl(spot.id) || NOAHS_ARCADE_URL);
      if (spot.id === 'chapel') return void window.location.assign(getHotspotEffectiveUrl(spot.id) || CHAPEL_URL);
      if (spot.id === COMMODORE_POWER_BUTTON_CONTROL_ID) return void state._cb.triggerCommodorePowerOnSequence?.();
      if (spot.id === DISCORD_OVERLAY_CONTROL_ID) {
        if (!state._cb.isBigTvMonitorInteractive?.()) return;
        const wasDvdScreensaverActive = state.bigTvDvdOverlayEl?.classList.contains('is-active');
        state._cb.interruptBigTvDvdLoop?.();
        if (wasDvdScreensaverActive) state._cb.activateRightMonitorCornerScoreMode?.();
        state._cb.setLeftMonitorState?.(DEFAULT_LEFT_MONITOR_STATE);
        return void state._cb.enterBigTvFullscreen?.();
      }
      if (spot.id === FLIP_CLOCK_OVERLAY_CONTROL_ID) return void state._cb.openClockApp?.();
      if (WHITEBOARD_HOTSPOT_IDS.has(spot.id)) return void window.open(getHotspotEffectiveUrl(spot.id) || WHITEBOARD_HOTSPOT_URLS[spot.id] || WHITEBOARD_HOTSPOT_URLS.whiteboard, '_blank', 'noopener,noreferrer');
      if (AQUARIUM_HOTSPOT_IDS.has(spot.id)) return void state._cb.playAquariumHotspotSequence?.();
      if (NEDRY_GATE_TRIGGER_HOTSPOT_IDS.has(spot.id)) {
        if (spot.id === 'right-monitor' && state._cb.isRightMonitorShrimpLogoActive?.()) return void state._cb.transitionAquariumToDvdCornerScoreFromRightMonitor?.();
        if (state._cb.isAquariumPlaybackSequenceActive?.()) {
          const didReplay = state._cb.replayAquariumPlaybackSequenceFromStatic?.();
          if (didReplay) return;
        }
        if (!state._cb.isRightMonitorInteractive?.()) return;
        return void state._cb.activateBigTvPromptMode?.();
      }
      if (spot.id === PENCIL_SHARPENER_HOTSPOT_ID) return void window.location.assign(getHotspotEffectiveUrl(spot.id) || NOTES_URL);
    });
    el.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        el.click();
      }
    });
    dom.hotspotLayer.appendChild(el);
  });
  refreshDebugObjectSelectOptions();
}

state.denUrlOverrides = loadDenUrlOverrides();

export {
  isFiniteNumber,
  extractSourceHotspotsFromLegacyRows,
  loadHotspotsFromLegacyServer,
  loadHotspotsFromServer,
  encodeDebugSavePassword,
  hasMatchingDebugSaveCipher,
  ensureDebugSaveAccess,
  readResponseErrorText,
  postHotspotsToLegacyServer,
  postHotspotsToServer,
  setSaveButtonText,
  resetSaveButtonSoon,
  hideSaveModal,
  showSaveFallbackModal,
  saveHotspots,
  addResizeHandles,
  updateHotspotLabel,
  getDebugHotspotElements,
  getDebugHotspotLabel,
  getSelectedDebugHotspotElement,
  getHotspotDefaultUrl,
  loadDenUrlOverrides,
  saveDenUrlOverride,
  getHotspotEffectiveUrl,
  refreshDebugObjectActions,
  refreshDebugObjectSelectOptions,
  setHotspotDebugLockState,
  hydrateNonCriticalSceneData,
  hydrateHotspotsFromServer,
  loadHotspots,
  applyHotspotsToDOM,
  renderHotspots,
  createHotspots,
  getRuntimeHotspotById,
  getOverlayRect,
  syncControlledOverlaysFromHotspots,
  getSavedHotspotsFromDom,
  consumeSaveResultFlash,
  persistSaveResultFlash
};
