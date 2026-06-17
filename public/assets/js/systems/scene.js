import {
  AQUARIUM_DEPTH_OVERLAY_LEFT_ID,
  AQUARIUM_DEPTH_OVERLAY_LEFT_IMAGE_URL,
  AQUARIUM_DEPTH_OVERLAY_RIGHT_ID,
  AQUARIUM_DEPTH_OVERLAY_RIGHT_IMAGE_URL,
  AQUARIUM_FISH_EFFECT_ID,
  AQUARIUM_WALL_GLOW_CLASS,
  ASHTRAY_CIGARETTE_CONTROL_ID,
  ASHTRAY_CIGARETTE_DEFAULT_BOUNDS,
  ASHTRAY_CIGARETTE_EFFECT_ID,
  ASHTRAY_SMOKE_CONTROL_ID,
  ASHTRAY_SMOKE_DEFAULT_WIDTH,
  ASHTRAY_SMOKE_EFFECT_ID,
  ASHTRAY_SMOKE_SOURCE_X,
  ASHTRAY_SMOKE_TAIL_HEIGHT,
  ASHTRAY_SMOKE_Y,
  CAMERA_SETTLE_EPSILON,
  CAMERA_SMOOTHING_FACTOR,
  DESIGN_HEIGHT,
  DESK_CENTER_X,
  DOM_DELTA_LINE,
  DOM_DELTA_PAGE,
  DRAG_START_THRESHOLD_PX,
  HOTSPOT_CLICK_SUPPRESSION_MS,
  LINE_SCROLL_PIXELS,
  MIN_HOTSPOT_SIZE,
  MIN_SMOKE_RISE_DISTANCE,
  MOBILE_DRAG_SCROLL_MULTIPLIER,
  SAVE_RESULT_FLASH_KEY,
  SCENE_OFFSET_X,
  SCENE_TILE_IMAGE_URLS,
  SMOKE_CEILING_Y,
  SMOKE_FADE_TO_CEILING_RATIO,
  SMOKE_SOURCE_VERTICAL_OFFSET,
  TILE_WIDTH,
  TOUCH_MOMENTUM_DECAY,
  TOUCH_MOMENTUM_MIN_VELOCITY,
  WHEEL_SCROLL_MULTIPLIER,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  defaultHotspots
} from '../core/constants.js';
import { state } from '../core/state.js';
import { dom } from '../core/domRefs.js';
import { applyAquariumDepthOverlayLayout, createDefaultAquariumDepthOverlayLayout } from '../core/aquariumDepthOverlayLayout.js';
import { clamp, isTextEntryTarget, measureSyncSection, scheduleNonCriticalTask, sourceHotspotsToRuntime } from '../core/utils.js';
import { createOverlays } from '../ui/overlays.js';
import { consumeDiscordLoginFlowState, syncDiscordAuthBodyClass, syncDiscordButtonUi, syncLoginOverlayUi } from './login.js';
import { loadCommodorePowerState, syncStoredCommodorePowerState, handlePageShow, cancelMonitorPowerTimeouts } from './monitors.js';
import { playWrongAudio, syncCornerScoreServerToLocalMad, unlockCornerScoreScoringAudioFromGesture } from './cornerScore.js';
import { adjustDvdSpeed, stopBigTvDvdAnimation } from './dvd.js';
import { stopRadioTuningLoopPlayback } from './flipClock.js';
import { createHotspots, getRuntimeHotspotById, syncControlledOverlaysFromHotspots, consumeSaveResultFlash, hydrateHotspotsFromServer, hydrateNonCriticalSceneData, refreshDebugObjectActions, refreshDebugObjectSelectOptions, setHotspotDebugLockState, getSelectedDebugHotspotElement, saveDenUrlOverride, saveHotspots, hideSaveModal, encodeDebugSavePassword, hasMatchingDebugSaveCipher, ensureDebugSaveAccess, addResizeHandles, setAquariumDepthOverlayLayout } from './hotspots.js';
import { getAquariumShrimpCount, resolveAquariumHorizontalMotion } from './aquariumEffect.js';

const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
const isIOSDevice =
  /iPad|iPhone|iPod/.test(window.navigator.userAgent) ||
  (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
const useLiteRendering = isIOSDevice || hasCoarsePointer;
let sceneEventsBound = false;
const AQUARIUM_WILDLIFE_OVERRIDES_STORAGE_KEY = 'naimean.aquariumWildlife.overrides';
const AQUARIUM_WILDLIFE_GUI_STYLE_ID = 'aquarium-wildlife-gui-style';
const AQUARIUM_SHRIMP_VERTICAL_SPACE_PERCENT = 23;
const DEFAULT_DISNEY_FISH_COUNT = 1;
const AQUARIUM_WILDLIFE_CREATURE_CLASS_NAMES = Object.freeze([
  'aquarium-disney-fish',
  'aquarium-shrimp',
  'aquarium-snail',
  'aquarium-starfish',
  'aquarium-turtle',
  'aquarium-jellyfish',
  'aquarium-nautilus',
  'aquarium-octopus',
  'aquarium-frog',
  'aquarium-manta-ray',
  'aquarium-shark',
  'aquarium-electric-eel',
  'aquarium-moray-eel',
  'aquarium-bubble-chest',
  'aquarium-coral',
  'aquarium-anemone',
  'aquarium-toy-diver',
  'aquarium-cthulhu-bubbler',
  'aquarium-skull-bubbler'
]);
const aquariumWildlifeGuiState = {
  panelEl: null,
  textareaEl: null,
  promptTextareaEl: null,
  overridesTextareaEl: null,
  statusEl: null
};

function getAquariumWildlifeOverrideBounds(value, min, max, fallback) {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return clamp(Math.round(value), min, max);
}

function readAquariumWildlifeOverrides() {
  try {
    const raw = window.localStorage.getItem(AQUARIUM_WILDLIFE_OVERRIDES_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }
    return parsed;
  } catch {
    return {};
  }
}

function writeAquariumWildlifeOverrides(overrides) {
  try {
    window.localStorage.setItem(AQUARIUM_WILDLIFE_OVERRIDES_STORAGE_KEY, JSON.stringify(overrides ?? {}));
  } catch {
    // Ignore storage write failures.
  }
}

function getPrimaryAquariumCreatureClass(element) {
  if (!(element instanceof HTMLElement)) {
    return '';
  }
  for (const className of AQUARIUM_WILDLIFE_CREATURE_CLASS_NAMES) {
    if (element.classList.contains(className) || element.classList.contains(`${className}-reverse`)) {
      return className;
    }
  }
  return '';
}

function collectAquariumCreatureCssVariables(element) {
  const cssVars = {};
  for (let index = 0; index < element.style.length; index += 1) {
    const name = element.style[index];
    if (!name || !name.startsWith('--')) {
      continue;
    }
    cssVars[name] = element.style.getPropertyValue(name).trim();
  }
  return cssVars;
}

function collectAquariumCreatureAnimationData(computedStyle) {
  const normalizeList = (value) => value.split(',').map((item) => item.trim()).filter((item) => item.length > 0);
  return {
    names: normalizeList(computedStyle.animationName),
    durations: normalizeList(computedStyle.animationDuration),
    delays: normalizeList(computedStyle.animationDelay),
    timingFunctions: normalizeList(computedStyle.animationTimingFunction),
    directions: normalizeList(computedStyle.animationDirection),
    iterationCounts: normalizeList(computedStyle.animationIterationCount)
  };
}

function collectAquariumWildlifeSnapshot() {
  const aquariumEffectEl = state.overlayElementsById.get(AQUARIUM_FISH_EFFECT_ID);
  if (!aquariumEffectEl) {
    return null;
  }
  const creatureElements = Array.from(aquariumEffectEl.querySelectorAll('*'))
    .filter((element) => getPrimaryAquariumCreatureClass(element).length > 0);
  const creatures = creatureElements.map((creatureEl, index) => {
    const computedStyle = window.getComputedStyle(creatureEl);
    const className = getPrimaryAquariumCreatureClass(creatureEl);
    const motionDirection = creatureEl.classList.contains(`${className}-reverse`) ? 'right-to-left' : 'left-to-right';
    return {
      id: `creature-${index + 1}`,
      type: className.replace('aquarium-', ''),
      label: creatureEl.dataset.character || className.replace('aquarium-', '').replaceAll('-', ' '),
      emoji: creatureEl.textContent?.trim() || '',
      motionDirection,
      position: {
        left: creatureEl.style.left || computedStyle.left,
        top: creatureEl.style.top || computedStyle.top,
        bottom: creatureEl.style.bottom || computedStyle.bottom
      },
      size: {
        width: creatureEl.style.width || computedStyle.width,
        height: creatureEl.style.height || computedStyle.height,
        fontSize: creatureEl.style.fontSize || computedStyle.fontSize
      },
      animations: collectAquariumCreatureAnimationData(computedStyle),
      cssVariables: collectAquariumCreatureCssVariables(creatureEl)
    };
  });
  return {
    generatedAt: new Date().toISOString(),
    tank: {
      widthPx: Math.round(aquariumEffectEl.clientWidth),
      heightPx: Math.round(aquariumEffectEl.clientHeight)
    },
    overrides: readAquariumWildlifeOverrides(),
    creatures
  };
}

function buildAquariumWildlifeGeminiPrompt(snapshot = collectAquariumWildlifeSnapshot()) {
  if (!snapshot) {
    return 'No aquarium wildlife snapshot is available yet. Render the scene first.';
  }
  return [
    'Create a visual animation preview storyboard for this aquarium wildlife scene.',
    'Use each creature entry as the source of appearance and movement behavior.',
    'Preserve loop timing, horizontal direction, and bob/drift intent from the CSS variables and animation values.',
    '',
    JSON.stringify(snapshot, null, 2)
  ].join('\n');
}

function syncAquariumWildlifeGuiStatus(message) {
  if (!aquariumWildlifeGuiState.statusEl) {
    return;
  }
  aquariumWildlifeGuiState.statusEl.textContent = message;
}

function syncAquariumWildlifeGuiData() {
  if (!aquariumWildlifeGuiState.panelEl) {
    return;
  }
  const snapshot = collectAquariumWildlifeSnapshot();
  const overrides = readAquariumWildlifeOverrides();
  if (aquariumWildlifeGuiState.textareaEl) {
    aquariumWildlifeGuiState.textareaEl.value = snapshot ? JSON.stringify(snapshot, null, 2) : 'No aquarium snapshot available.';
  }
  if (aquariumWildlifeGuiState.promptTextareaEl) {
    aquariumWildlifeGuiState.promptTextareaEl.value = buildAquariumWildlifeGeminiPrompt(snapshot);
  }
  if (aquariumWildlifeGuiState.overridesTextareaEl) {
    aquariumWildlifeGuiState.overridesTextareaEl.value = JSON.stringify(overrides, null, 2);
  }
  syncAquariumWildlifeGuiStatus(snapshot ? `Loaded ${snapshot.creatures.length} creatures.` : 'Scene not ready yet.');
}

function ensureAquariumWildlifeGuiStyle() {
  if (document.getElementById(AQUARIUM_WILDLIFE_GUI_STYLE_ID)) {
    return;
  }
  const styleEl = document.createElement('style');
  styleEl.id = AQUARIUM_WILDLIFE_GUI_STYLE_ID;
  styleEl.textContent = `
    .aquarium-wildlife-gui { position: fixed; right: 12px; bottom: 12px; width: 360px; max-height: 80vh; z-index: 24000; background: rgba(5, 8, 16, 0.95); color: #dce8ff; border: 1px solid rgba(115, 165, 255, 0.55); border-radius: 8px; box-shadow: 0 12px 30px rgba(0, 0, 0, 0.45); font: 12px/1.4 'JetBrains Mono', Menlo, Consolas, monospace; display: flex; flex-direction: column; }
    .aquarium-wildlife-gui-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 10px; border-bottom: 1px solid rgba(115, 165, 255, 0.35); }
    .aquarium-wildlife-gui-header strong { font-size: 12px; letter-spacing: 0.02em; }
    .aquarium-wildlife-gui-actions { display: flex; flex-wrap: wrap; gap: 6px; padding: 8px 10px; border-bottom: 1px solid rgba(115, 165, 255, 0.24); }
    .aquarium-wildlife-gui button { background: rgba(56, 106, 204, 0.9); color: #fff; border: 1px solid rgba(157, 194, 255, 0.55); border-radius: 4px; padding: 4px 8px; cursor: pointer; font: inherit; }
    .aquarium-wildlife-gui button:hover { background: rgba(78, 130, 231, 0.95); }
    .aquarium-wildlife-gui-label { margin: 8px 10px 4px; font-size: 11px; opacity: 0.88; text-transform: uppercase; letter-spacing: 0.04em; }
    .aquarium-wildlife-gui textarea { width: calc(100% - 20px); min-height: 86px; margin: 0 10px 8px; padding: 7px; background: rgba(7, 15, 29, 0.92); color: #dce8ff; border: 1px solid rgba(115, 165, 255, 0.4); border-radius: 4px; resize: vertical; font: inherit; }
    .aquarium-wildlife-gui-status { margin: 0 10px 10px; font-size: 11px; opacity: 0.85; }
  `;
  document.head.appendChild(styleEl);
}

function copyTextToClipboard(value) {
  const text = typeof value === 'string' ? value : String(value ?? '');
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }
  const fallback = document.createElement('textarea');
  fallback.value = text;
  fallback.setAttribute('readonly', 'readonly');
  fallback.style.position = 'fixed';
  fallback.style.opacity = '0';
  document.body.appendChild(fallback);
  fallback.select();
  const copied = document.execCommand('copy');
  fallback.remove();
  if (!copied) {
    return Promise.reject(new Error('Clipboard copy failed.'));
  }
  return Promise.resolve();
}

function ensureAquariumWildlifeGuiPanel() {
  if (aquariumWildlifeGuiState.panelEl) {
    return aquariumWildlifeGuiState.panelEl;
  }
  ensureAquariumWildlifeGuiStyle();
  const panelEl = document.createElement('section');
  panelEl.className = 'aquarium-wildlife-gui';
  panelEl.innerHTML = `
    <div class="aquarium-wildlife-gui-header">
      <strong>Aquarium Wildlife GUI</strong>
      <button type="button" data-action="close">Close</button>
    </div>
    <div class="aquarium-wildlife-gui-actions">
      <button type="button" data-action="refresh">Refresh</button>
      <button type="button" data-action="copy-json">Copy JSON</button>
      <button type="button" data-action="copy-prompt">Copy Gemini Prompt</button>
      <button type="button" data-action="apply-overrides">Apply Overrides</button>
      <button type="button" data-action="clear-overrides">Clear Overrides</button>
    </div>
    <div class="aquarium-wildlife-gui-label">Overrides JSON</div>
    <textarea data-role="overrides"></textarea>
    <div class="aquarium-wildlife-gui-label">Creature Snapshot JSON</div>
    <textarea data-role="snapshot" readonly></textarea>
    <div class="aquarium-wildlife-gui-label">Gemini Prompt</div>
    <textarea data-role="prompt" readonly></textarea>
    <div class="aquarium-wildlife-gui-status" data-role="status"></div>
  `;
  panelEl.querySelector('[data-action="close"]')?.addEventListener('click', () => {
    panelEl.remove();
    aquariumWildlifeGuiState.panelEl = null;
    aquariumWildlifeGuiState.textareaEl = null;
    aquariumWildlifeGuiState.promptTextareaEl = null;
    aquariumWildlifeGuiState.overridesTextareaEl = null;
    aquariumWildlifeGuiState.statusEl = null;
  });
  panelEl.querySelector('[data-action="refresh"]')?.addEventListener('click', () => {
    syncAquariumWildlifeGuiData();
  });
  panelEl.querySelector('[data-action="copy-json"]')?.addEventListener('click', () => {
    void copyTextToClipboard(aquariumWildlifeGuiState.textareaEl?.value || '')
      .then(() => syncAquariumWildlifeGuiStatus('Snapshot JSON copied.'));
  });
  panelEl.querySelector('[data-action="copy-prompt"]')?.addEventListener('click', () => {
    void copyTextToClipboard(aquariumWildlifeGuiState.promptTextareaEl?.value || '')
      .then(() => syncAquariumWildlifeGuiStatus('Gemini prompt copied.'));
  });
  panelEl.querySelector('[data-action="apply-overrides"]')?.addEventListener('click', () => {
    try {
      const raw = aquariumWildlifeGuiState.overridesTextareaEl?.value || '{}';
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        const receivedType = Array.isArray(parsed) ? 'array' : typeof parsed;
        throw new Error(`Overrides must be a JSON object, received: ${receivedType}.`);
      }
      writeAquariumWildlifeOverrides(parsed);
      rerenderAquariumFishEffectPreservingDepthOverlays();
      syncAquariumWildlifeGuiData();
      syncAquariumWildlifeGuiStatus('Overrides applied.');
    } catch (error) {
      syncAquariumWildlifeGuiStatus(error instanceof Error ? error.message : 'Unable to parse overrides JSON.');
    }
  });
  panelEl.querySelector('[data-action="clear-overrides"]')?.addEventListener('click', () => {
    writeAquariumWildlifeOverrides({});
    rerenderAquariumFishEffectPreservingDepthOverlays();
    syncAquariumWildlifeGuiData();
    syncAquariumWildlifeGuiStatus('Overrides cleared.');
  });
  aquariumWildlifeGuiState.panelEl = panelEl;
  aquariumWildlifeGuiState.textareaEl = panelEl.querySelector('[data-role="snapshot"]');
  aquariumWildlifeGuiState.promptTextareaEl = panelEl.querySelector('[data-role="prompt"]');
  aquariumWildlifeGuiState.overridesTextareaEl = panelEl.querySelector('[data-role="overrides"]');
  aquariumWildlifeGuiState.statusEl = panelEl.querySelector('[data-role="status"]');
  document.body.appendChild(panelEl);
  syncAquariumWildlifeGuiData();
  return panelEl;
}

function installAquariumWildlifeApi() {
  const api = {
    getSnapshot: () => collectAquariumWildlifeSnapshot(),
    getGeminiPrompt: () => buildAquariumWildlifeGeminiPrompt(),
    getOverrides: () => readAquariumWildlifeOverrides(),
    setOverrides: (overrides = {}) => {
      writeAquariumWildlifeOverrides(overrides);
      rerenderAquariumFishEffectPreservingDepthOverlays();
      return readAquariumWildlifeOverrides();
    },
    clearOverrides: () => {
      writeAquariumWildlifeOverrides({});
      rerenderAquariumFishEffectPreservingDepthOverlays();
    },
    openGui: () => ensureAquariumWildlifeGuiPanel(),
    refreshGui: () => syncAquariumWildlifeGuiData()
  };
  window.naimeanAquariumWildlife = api;
}

const AQUARIUM_DISNEY_CHARACTER_SPECS = Object.freeze([
  {
  name: 'Nemo & Marlin Cousin',
  palette: Object.freeze({
    k: '#161616', // Outline
    o: '#e66b00', // Slightly darker, less saturated orange
    w: '#fffcf0'  // Creamier white
  }),
  pixels: Object.freeze([
    '....oo....',
    '..ooook...',
    '.oowooook.', // Slightly wider mid-section
    '..oookoo..', // Distinctive fin shape
    '....oo....'
  ]),
  leftPct: 5,
  topPct: 19,
  widthPx: 58,
  swimDistPx: 170,
  durationSec: 12.4,
  delaySec: -1.8,
  bobA: -4, // Reduced bobbing for a calmer "cousin" vibe
  bobB: 3,
  bobC: -2
},
{
    name: 'Doreee',
    palette: Object.freeze({
      k: '#1a2e5c', // Deepened navy for a more natural look
      b: '#3b82f6', // More vibrant, electric blue
      y: '#facc15'  // Warmer, golden yellow
    }),
    pixels: Object.freeze([
      '................',
      '....kbbbbbyy....',
      '..kbbbbbbbyyyy..',
      '.kbbkbbbbyyyyy..', // Refined edge
      'kbbkbbbbbyyyyyy.', // Slightly more tapered
      '.kbbkbbbbyyyyy..',
      '..kbbbbbbbyyyy..',
      '....kbbbbbyy....'
    ]),
    leftPct: 8,
    topPct: 34,
    widthPx: 45, // Slightly larger to match the new proportions
    swimDistPx: 215,
    durationSec: 16.5, // A bit slower, more graceful
    delaySec: -6.5,
    bobA: -4, // Calmed down to match the cousin's smooth movement
    bobB: 3,
    bobC: -2
  },
{
    name: 'Stammer',
    palette: Object.freeze({
      y: '#ffd700', // A bit more golden than Flounder
      b: '#1e40af', // A deeper, sharper blue
      w: '#ffffff'  // Added white for a nervous "eye" detail
    }),
    pixels: Object.freeze([
      '................',
      '....yyyyyy......',
      '..yybbbyyyy.....',
      '.yybbyyybbbyy...',
      'yybbbyyyyybbbyy.', // Staggered profile
      '.yybbyyybbbyy...',
      '..yybbbyyyy.....',
      '....yyyyyy......'
    ]),
    leftPct: 15,
    topPct: 45,
    widthPx: 42,
    swimDistPx: 180,
    durationSec: 10.2, // Faster, "jittery" swim speed
    delaySec: -2.5,
    bobA: -8, // Wider bob range...
    bobB: 6,  // ...with more force...
    bobC: -5  // ...to simulate a "stuttering" swimming style
  },
  {
    name: 'Cleo',
    palette: Object.freeze({
      g: '#ffab32',
      h: '#ffd877',
      f: 'rgba(238, 247, 255, 0.85)'
    }),
    pixels: Object.freeze([
      '................',
      '.....gggg.......',
      '...ggghggff.....',
      '..ggghggggfff...',
      '.ggghggggggffff.',
      '..ggggggggfff...',
      '...ggggggff.....',
      '.....ff.........'
    ]),
    leftPct: 24,
    topPct: 70,
    widthPx: 38,
    swimDistPx: 148,
    durationSec: 18.8,
    delaySec: -9.4,
    bobA: -3,
    bobB: 2,
    bobC: -2
  },
  {
    name: 'Bubbles',
    palette: Object.freeze({
      d: '#d2b300',
      y: '#fff22d'
    }),
    pixels: Object.freeze([
      '.................',
      '.......d.........',
      '.....dyyyd.......',
      '...dyyyyyyyd.....',
      '.dyyyyyyyyyyyd...',
      '...dyyyyyyyd.....',
      '.....dyyyd.......',
      '.......d.........'
    ]),
    leftPct: 10,
    topPct: 44,
    widthPx: 34,
    swimDistPx: 132,
    durationSec: 16.1,
    delaySec: -8.3,
    bobA: -4,
    bobB: 3,
    bobC: -2
  },
  {
    name: 'Gurgle',
    palette: Object.freeze({
      p: '#6e3bdb',
      y: '#ffd24a'
    }),
    pixels: Object.freeze([
      '................',
      '....ppppyy......',
      '..ppppppyyyy....',
      '.pppppppyyyyyy..',
      'pppppppyyyyyyyy.',
      '.pppppppyyyyyy..',
      '..ppppppyyyy....',
      '....ppppyy......'
    ]),
    leftPct: 6,
    topPct: 27,
    widthPx: 45,
    swimDistPx: 176,
    durationSec: 14.8,
    delaySec: -4.7,
    bobA: -5,
    bobB: 4,
    bobC: -3
  },
  {
    name: 'Gill',
    palette: Object.freeze({
      k: '#151515',
      w: '#f8f8f3',
      y: '#ffcd38'
    }),
    pixels: Object.freeze([
      '..................',
      '......yy..........',
      '....kkwwkk..yy....',
      '..kkwwwkkwyyyyy...',
      '.kwwwkkwwwyyyyyy..',
      '..kkwwwkkwyyyyy...',
      '....kkwwkk..yy....',
      '......yy..........'
    ]),
    leftPct: 7,
    topPct: 61,
    widthPx: 48,
    swimDistPx: 188,
    durationSec: 17.2,
    delaySec: -11.1,
    bobA: -5,
    bobB: 4,
    bobC: -3
  }
]);

function createPixelSpriteDataUrl({ pixels, palette }) {
  const rowCount = pixels.length;
  const columnCount = pixels.reduce((max, row) => Math.max(max, row.length), 0);
  const rects = [];

  pixels.forEach((row, rowIndex) => {
    for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
      const token = row[columnIndex] ?? '.';
      const fill = palette[token];
      if (!fill) {
        continue;
      }
      rects.push(`<rect x="${columnIndex}" y="${rowIndex}" width="1" height="1" fill="${fill}"/>`);
    }
  });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${columnCount} ${rowCount}" shape-rendering="crispEdges">${rects.join('')}</svg>`;
  return {
    columnCount,
    rowCount,
    dataUrl: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
  };
}

function createShuffledCopy(items) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function takeAquariumDisneyFishSpec(specPool) {
  if (specPool.length === 0) {
    specPool.push(...createShuffledCopy(AQUARIUM_DISNEY_CHARACTER_SPECS));
  }
  return specPool.pop();
}

function appendAquariumDisneyFish(el, specPool, overrides = {}) {
  const spec = takeAquariumDisneyFishSpec(specPool);
  const spriteData = createPixelSpriteDataUrl(spec);
  const widthPx = overrides.widthPx ?? spec.widthPx;
  const fish = document.createElement('span');
  fish.className = 'aquarium-disney-fish';
  fish.dataset.character = spec.name;
  fish.setAttribute('aria-hidden', 'true');
  fish.style.left = `${overrides.leftPct ?? spec.leftPct}%`;
  fish.style.top = `${overrides.topPct ?? spec.topPct}%`;
  fish.style.width = `${widthPx}px`;
  fish.style.height = `${Math.round((spriteData.rowCount / spriteData.columnCount) * widthPx)}px`;
  fish.style.backgroundImage = spriteData.dataUrl;
  fish.style.setProperty('--fish-swim-dist', `${overrides.swimDistPx ?? spec.swimDistPx}px`);
  fish.style.setProperty('--fish-duration', `${(overrides.durationSec ?? spec.durationSec).toFixed(2)}s`);
  fish.style.setProperty('--fish-delay', `${(overrides.delaySec ?? spec.delaySec).toFixed(2)}s`);
  fish.style.setProperty('--fish-bob-a', `${overrides.bobA ?? spec.bobA}px`);
  fish.style.setProperty('--fish-bob-b', `${overrides.bobB ?? spec.bobB}px`);
  fish.style.setProperty('--fish-bob-c', `${overrides.bobC ?? spec.bobC}px`);
  el.appendChild(fish);
  return fish;
}

function getRandomAquariumCreatureLayer(backLayerEl, frontLayerEl) {
  return Math.random() < 0.5 ? backLayerEl : frontLayerEl;
}

function appendAquariumBubblerStream(el, { leftPct, bottomPct, bubbleCount = 5, riseMin = 230, riseMax = 370 }) {
  for (let index = 0; index < bubbleCount; index += 1) {
    const bubble = document.createElement('span');
    bubble.className = 'aquarium-bubble';
    const size = 2 + Math.floor(Math.random() * 4);
    const horizontalJitter = (Math.random() * 5) - 2.5;
    const rise = riseMin + Math.floor(Math.random() * Math.max(1, riseMax - riseMin));
    const wobble = -8 + Math.floor(Math.random() * 17);
    const duration = 3.8 + (Math.random() * 3.2);
    const delay = (index * 0.45) + (Math.random() * 0.5);
    bubble.style.width = `${size}px`;
    bubble.style.height = `${size}px`;
    bubble.style.left = `${leftPct + horizontalJitter}%`;
    bubble.style.bottom = `${bottomPct}%`;
    bubble.style.setProperty('--bubble-rise', `${rise}px`);
    bubble.style.setProperty('--bubble-wobble', `${wobble}px`);
    bubble.style.setProperty('--bubble-duration', `${duration.toFixed(2)}s`);
    bubble.style.setProperty('--bubble-delay', `${delay.toFixed(2)}s`);
    el.appendChild(bubble);
  }
}

function createSceneTiles() {
  dom.sceneLayer.textContent = '';
  SCENE_TILE_IMAGE_URLS.forEach((sources, index) => {
    const tile = document.createElement('picture');
    tile.className = 'scene-tile';
    tile.style.left = `${index * TILE_WIDTH}px`;
    const image = document.createElement('img');
    image.src = sources.png;
    image.alt = '';
    // Tile 1 (den_computer) is the initial camera position on all devices.
    // Tile 0 (den_arcade) is also visible on wide desktop viewports.
    // On iOS, skip tile 0 eager-loading to avoid fetching the large PNG off-screen.
    // On iOS, skip AVIF/WebP <source> elements: large AVIF tiles can partially
    // decode on iOS Safari, leaving black regions in the scene.
    const isEager = isIOSDevice ? index === 1 : index <= 1;
    image.loading = isEager ? 'eager' : 'lazy';
    if (!isIOSDevice) {
      const avifSource = document.createElement('source');
      avifSource.type = 'image/avif';
      avifSource.srcset = sources.avif;
      const webpSource = document.createElement('source');
      webpSource.type = 'image/webp';
      webpSource.srcset = sources.webp;
      tile.append(avifSource, webpSource, image);
    } else {
      tile.append(image);
    }
    dom.sceneLayer.appendChild(tile);
  });
}

function createAshtraySmokeEffect() {
  if (!dom.effectsLayer) return;
  dom.effectsLayer.querySelector(`#${ASHTRAY_SMOKE_EFFECT_ID}`)?.remove();
  state.overlayElementsById.delete(ASHTRAY_SMOKE_EFFECT_ID);
  const smokeControlSpot = getRuntimeHotspotById(ASHTRAY_SMOKE_CONTROL_ID);
  const defaultSmokeRiseDistance = Math.max(MIN_SMOKE_RISE_DISTANCE, Math.round((ASHTRAY_SMOKE_Y - SMOKE_CEILING_Y) * SMOKE_FADE_TO_CEILING_RATIO));
  const smokeHeight = Math.max(ASHTRAY_SMOKE_TAIL_HEIGHT + MIN_HOTSPOT_SIZE, Math.round(smokeControlSpot?.h ?? (defaultSmokeRiseDistance + ASHTRAY_SMOKE_TAIL_HEIGHT)));
  const smokeRiseDistance = Math.max(MIN_SMOKE_RISE_DISTANCE, Math.round(smokeHeight - ASHTRAY_SMOKE_TAIL_HEIGHT));
  const el = document.createElement('div');
  el.id = ASHTRAY_SMOKE_EFFECT_ID;
  el.className = 'ashtray-smoke-effect';
  el.style.left = `${Math.round(smokeControlSpot?.x ?? (SCENE_OFFSET_X + ASHTRAY_SMOKE_SOURCE_X - Math.round(ASHTRAY_SMOKE_DEFAULT_WIDTH / 2)))}px`;
  el.style.top = `${Math.round(smokeControlSpot?.y ?? (ASHTRAY_SMOKE_Y - smokeRiseDistance + SMOKE_SOURCE_VERTICAL_OFFSET))}px`;
  el.style.width = `${Math.max(MIN_HOTSPOT_SIZE, Math.round(smokeControlSpot?.w ?? ASHTRAY_SMOKE_DEFAULT_WIDTH))}px`;
  el.style.height = `${smokeHeight}px`;
  el.style.setProperty('--smoke-rise-distance', `${smokeRiseDistance}px`);
  el.style.setProperty('--smoke-tail-height', `${ASHTRAY_SMOKE_TAIL_HEIGHT}px`);

  const wisps = [
    {
      className: 'ashtray-smoke-wisp',
      vars: {
        '--smoke-start-x': '-8px',
        '--smoke-curl-a': '16px',
        '--smoke-curl-b': '-22px',
        '--smoke-drift-x': '34px',
        '--smoke-curl-angle': '24deg',
        '--smoke-duration': '10.6s',
        '--smoke-delay': '0s'
      }
    },
    {
      className: 'ashtray-smoke-wisp ashtray-smoke-wisp-swirl',
      vars: {
        '--smoke-start-x': '4px',
        '--smoke-curl-a': '-18px',
        '--smoke-curl-b': '24px',
        '--smoke-drift-x': '-28px',
        '--smoke-curl-angle': '-28deg',
        '--smoke-duration': '11.4s',
        '--smoke-delay': '1.3s'
      }
    },
    {
      className: 'ashtray-smoke-wisp ashtray-smoke-wisp-depth',
      vars: {
        '--smoke-start-x': '14px',
        '--smoke-curl-a': '22px',
        '--smoke-curl-b': '-18px',
        '--smoke-drift-x': '18px',
        '--smoke-curl-angle': '20deg',
        '--smoke-duration': '12.8s',
        '--smoke-delay': '2.2s'
      }
    }
  ];
  wisps.forEach(({ className, vars }) => {
    const wisp = document.createElement('span');
    wisp.className = className;
    Object.entries(vars).forEach(([name, value]) => {
      wisp.style.setProperty(name, value);
    });
    el.appendChild(wisp);
  });
  dom.effectsLayer.appendChild(el);
  state.overlayElementsById.set(ASHTRAY_SMOKE_EFFECT_ID, el);
}

function createAshtrayCigaretteEffect() {
  if (!dom.effectsLayer) return;
  dom.effectsLayer.querySelector(`#${ASHTRAY_CIGARETTE_EFFECT_ID}`)?.remove();
  state.overlayElementsById.delete(ASHTRAY_CIGARETTE_EFFECT_ID);
  const spot = getRuntimeHotspotById(ASHTRAY_CIGARETTE_CONTROL_ID);
  const el = document.createElement('div');
  el.id = ASHTRAY_CIGARETTE_EFFECT_ID;
  el.className = 'ashtray-cigarette-effect';
  el.style.left = `${Math.round(spot?.x ?? (SCENE_OFFSET_X + ASHTRAY_CIGARETTE_DEFAULT_BOUNDS.x))}px`;
  el.style.top = `${Math.round(spot?.y ?? ASHTRAY_CIGARETTE_DEFAULT_BOUNDS.y)}px`;
  el.style.width = `${Math.max(MIN_HOTSPOT_SIZE, Math.round(spot?.w ?? ASHTRAY_CIGARETTE_DEFAULT_BOUNDS.w))}px`;
  el.style.height = `${Math.max(MIN_HOTSPOT_SIZE, Math.round(spot?.h ?? ASHTRAY_CIGARETTE_DEFAULT_BOUNDS.h))}px`;
  const cigarette = document.createElement('span');
  cigarette.className = 'ashtray-cigarette';
  const ember = document.createElement('span');
  ember.className = 'ashtray-cigarette-ember';
  cigarette.appendChild(ember);
  el.appendChild(cigarette);
  dom.effectsLayer.appendChild(el);
  state.overlayElementsById.set(ASHTRAY_CIGARETTE_EFFECT_ID, el);
}

function createAquariumFishEffect() {
  if (!dom.effectsLayer) return;
  dom.effectsLayer.querySelector(`#${AQUARIUM_FISH_EFFECT_ID}`)?.remove();
  state.overlayElementsById.delete(AQUARIUM_FISH_EFFECT_ID);
  for (const old of dom.effectsLayer.querySelectorAll(`.${AQUARIUM_WALL_GLOW_CLASS}`)) {
    old.remove();
  }
  const spot = getRuntimeHotspotById('aquarium');
  if (!spot) return;
  const wildlifeOverrides = readAquariumWildlifeOverrides();
  const el = document.createElement('div');
  el.id = AQUARIUM_FISH_EFFECT_ID;
  el.className = 'aquarium-fish-effect';
  el.style.left = `${Math.round(spot.x)}px`;
  el.style.top = `${Math.round(spot.y)}px`;
  el.style.width = `${Math.round(spot.w)}px`;
  el.style.height = `${Math.round(spot.h)}px`;
  const backCreatureLayerEl = document.createElement('div');
  backCreatureLayerEl.className = 'aquarium-creature-layer aquarium-creature-layer-back';
  const depthOverlayLeftEl = document.createElement('div');
  depthOverlayLeftEl.className = 'aquarium-depth-overlay aquarium-depth-overlay-left';
  depthOverlayLeftEl.dataset.debugObjectId = AQUARIUM_DEPTH_OVERLAY_LEFT_ID;
  depthOverlayLeftEl.dataset.label = 'Aquarium Left Depth Overlay';
  depthOverlayLeftEl.setAttribute('aria-hidden', 'true');
  depthOverlayLeftEl.title = depthOverlayLeftEl.dataset.label;
  const depthOverlayLeftImageEl = document.createElement('img');
  depthOverlayLeftImageEl.className = 'aquarium-depth-overlay-image';
  depthOverlayLeftImageEl.src = AQUARIUM_DEPTH_OVERLAY_LEFT_IMAGE_URL;
  depthOverlayLeftImageEl.alt = '';
  depthOverlayLeftImageEl.decoding = 'async';
  depthOverlayLeftImageEl.loading = 'eager';
  depthOverlayLeftImageEl.draggable = false;
  depthOverlayLeftImageEl.setAttribute('aria-hidden', 'true');
  depthOverlayLeftEl.appendChild(depthOverlayLeftImageEl);
  applyAquariumDepthOverlayLayout(depthOverlayLeftEl, createDefaultAquariumDepthOverlayLayout('left', spot.w, spot.h));
  const depthOverlayLeftLabel = document.createElement('span');
  depthOverlayLeftLabel.className = 'hotspot-label';
  depthOverlayLeftLabel.textContent = `${depthOverlayLeftEl.dataset.label} (${Math.round(parseFloat(depthOverlayLeftEl.style.left))}, ${Math.round(parseFloat(depthOverlayLeftEl.style.top))}) ${Math.round(parseFloat(depthOverlayLeftEl.style.width))}×${Math.round(parseFloat(depthOverlayLeftEl.style.height))}`;
  depthOverlayLeftEl.appendChild(depthOverlayLeftLabel);
  addResizeHandles(depthOverlayLeftEl);
  const depthOverlayRightEl = document.createElement('div');
  depthOverlayRightEl.className = 'aquarium-depth-overlay aquarium-depth-overlay-right';
  depthOverlayRightEl.dataset.debugObjectId = AQUARIUM_DEPTH_OVERLAY_RIGHT_ID;
  depthOverlayRightEl.dataset.label = 'Aquarium Right Depth Overlay';
  depthOverlayRightEl.setAttribute('aria-hidden', 'true');
  depthOverlayRightEl.title = depthOverlayRightEl.dataset.label;
  const depthOverlayRightImageEl = document.createElement('img');
  depthOverlayRightImageEl.className = 'aquarium-depth-overlay-image';
  depthOverlayRightImageEl.src = AQUARIUM_DEPTH_OVERLAY_RIGHT_IMAGE_URL;
  depthOverlayRightImageEl.alt = '';
  depthOverlayRightImageEl.decoding = 'async';
  depthOverlayRightImageEl.loading = 'eager';
  depthOverlayRightImageEl.draggable = false;
  depthOverlayRightImageEl.setAttribute('aria-hidden', 'true');
  depthOverlayRightEl.appendChild(depthOverlayRightImageEl);
  applyAquariumDepthOverlayLayout(depthOverlayRightEl, createDefaultAquariumDepthOverlayLayout('right', spot.w, spot.h));
  const depthOverlayRightLabel = document.createElement('span');
  depthOverlayRightLabel.className = 'hotspot-label';
  depthOverlayRightLabel.textContent = `${depthOverlayRightEl.dataset.label} (${Math.round(parseFloat(depthOverlayRightEl.style.left))}, ${Math.round(parseFloat(depthOverlayRightEl.style.top))}) ${Math.round(parseFloat(depthOverlayRightEl.style.width))}×${Math.round(parseFloat(depthOverlayRightEl.style.height))}`;
  depthOverlayRightEl.appendChild(depthOverlayRightLabel);
  addResizeHandles(depthOverlayRightEl);
  const frontCreatureLayerEl = document.createElement('div');
  frontCreatureLayerEl.className = 'aquarium-creature-layer aquarium-creature-layer-front';
  const appendAquariumCreature = (creatureEl) => {
    getRandomAquariumCreatureLayer(backCreatureLayerEl, frontCreatureLayerEl).appendChild(creatureEl);
    return creatureEl;
  };
  const estimateAquariumEmojiWidthPx = (sizePx, textContent = '') => {
    const glyphCount = Math.max(1, Array.from(textContent).length);
    const widthFactor = glyphCount > 1 ? 1.35 : 0.95;
    return Math.max(12, Math.round(sizePx * widthFactor));
  };
  const applyAquariumHorizontalMotion = ({
    creatureEl,
    startLeftPct,
    creatureWidthPx,
    swimDistPx,
    distancePropertyName,
    swimsRight = true,
    reverseClassName = '',
    allowDirectionFlip = true,
  }) => {
    const motion = resolveAquariumHorizontalMotion({
      tankWidthPx: spot.w,
      startLeftPct,
      creatureWidthPx,
      swimDistPx,
      swimsRight,
      allowDirectionFlip,
    });
    creatureEl.style.left = `${motion.startLeftPct}%`;
    creatureEl.style.setProperty(distancePropertyName, `${motion.swimDistPx}px`);
    if (reverseClassName) {
      creatureEl.classList.toggle(reverseClassName, !motion.swimsRight);
    }
    return motion;
  };

  // ── Animated water line (subtle surface movement at the top of the tank) ──
  const waterLine = document.createElement('div');
  waterLine.className = 'aquarium-water-line';
  el.appendChild(waterLine);

  // ── Caustic light effects (ambient light from above playing on the back wall) ──
  const causticDefs = [
    { leftPct: 11, width: 30, opacity: 0.22, drift: 20,  duration: 7.4,  delay: 0.0  },
    { leftPct: 29, width: 20, opacity: 0.16, drift: -14, duration: 9.8,  delay: 2.3  },
    { leftPct: 50, width: 38, opacity: 0.20, drift: 24,  duration: 8.3,  delay: 4.5  },
    { leftPct: 71, width: 24, opacity: 0.14, drift: -18, duration: 11.0, delay: 1.7  },
  ];
  for (const { leftPct, width, opacity, drift, duration, delay } of causticDefs) {
    const caustic = document.createElement('div');
    caustic.className = 'aquarium-caustic';
    caustic.style.left = `${leftPct}%`;
    caustic.style.width = `${width}px`;
    caustic.style.setProperty('--caustic-drift', `${drift}px`);
    caustic.style.setProperty('--caustic-opacity', String(opacity));
    caustic.style.setProperty('--caustic-duration', `${duration.toFixed(2)}s`);
    caustic.style.setProperty('--caustic-delay', `${delay.toFixed(2)}s`);
    el.appendChild(caustic);
  }

  // ── Filter intake tube (hang-on-back style, upper-right of tank) ──────────
  const filterEl = document.createElement('div');
  filterEl.className = 'aquarium-filter';
  el.appendChild(filterEl);

  // Filter output bubbles: small & quick-rising from the outflow near the surface
  const filterOutputBubbles = [
    { size: 2, left: '86%', bottom: '88%', rise: 55, wobble:  2, duration: 1.6, delay: 0.0 },
    { size: 3, left: '84%', bottom: '90%', rise: 45, wobble: -3, duration: 1.9, delay: 0.7 },
    { size: 2, left: '87%', bottom: '87%', rise: 60, wobble:  4, duration: 1.5, delay: 1.4 },
    { size: 3, left: '85%', bottom: '89%', rise: 50, wobble: -2, duration: 1.8, delay: 2.2 },
  ];
  for (const { size, left, bottom, rise, wobble, duration, delay } of filterOutputBubbles) {
    const bubble = document.createElement('span');
    bubble.className = 'aquarium-bubble aquarium-filter-bubble';
    bubble.style.width = `${size}px`;
    bubble.style.height = `${size}px`;
    bubble.style.left = left;
    bubble.style.bottom = bottom;
    bubble.style.setProperty('--bubble-rise', `${rise}px`);
    bubble.style.setProperty('--bubble-wobble', `${wobble}px`);
    bubble.style.setProperty('--bubble-duration', `${duration}s`);
    bubble.style.setProperty('--bubble-delay', `${delay}s`);
    el.appendChild(bubble);
  }

  // ── Original filter bubbles: 8 fixed bubbles from the right-side filter ───
  const filterBubbles = [
    { size: 5, left: '79%', bottom: '5%', rise: 590, wobble: -6, duration: 5.0, delay: 0.0 },
    { size: 7, left: '84%', bottom: '3%', rise: 630, wobble:  8, duration: 6.4, delay: 1.3 },
    { size: 4, left: '76%', bottom: '6%', rise: 550, wobble: -4, duration: 5.6, delay: 2.7 },
    { size: 8, left: '87%', bottom: '4%', rise: 610, wobble:  6, duration: 7.2, delay: 0.6 },
    { size: 5, left: '81%', bottom: '3%', rise: 565, wobble: -8, duration: 5.9, delay: 3.4 },
    { size: 6, left: '78%', bottom: '5%', rise: 600, wobble:  5, duration: 6.7, delay: 1.8 },
    { size: 4, left: '83%', bottom: '4%', rise: 525, wobble: -5, duration: 4.6, delay: 4.1 },
    { size: 9, left: '89%', bottom: '3%', rise: 645, wobble:  7, duration: 7.6, delay: 2.0 },
  ];
  for (const { size, left, bottom, rise, wobble, duration, delay } of filterBubbles) {
    const bubble = document.createElement('span');
    bubble.className = 'aquarium-bubble';
    bubble.style.width = `${size}px`;
    bubble.style.height = `${size}px`;
    bubble.style.left = left;
    bubble.style.bottom = bottom;
    bubble.style.setProperty('--bubble-rise', `${rise}px`);
    bubble.style.setProperty('--bubble-wobble', `${wobble}px`);
    bubble.style.setProperty('--bubble-duration', `${duration}s`);
    bubble.style.setProperty('--bubble-delay', `${delay}s`);
    el.appendChild(bubble);
  }

  // ── Bubble rocks: 3 spots on the floor with intermittent bubble streams ───
  const rockDefs = [
    { leftPct: 20, bubbles: [
      { size: 4, offset: -1, rise: 480, wobble: -5, duration: 6.2, delay: 0.0 },
      { size: 3, offset:  1, rise: 510, wobble:  4, duration: 6.8, delay: 0.5 },
      { size: 5, offset:  0, rise: 465, wobble: -3, duration: 5.9, delay: 1.0 },
      { size: 4, offset: -1, rise: 495, wobble:  6, duration: 6.5, delay: 3.8 },
      { size: 3, offset:  1, rise: 520, wobble: -4, duration: 7.1, delay: 4.3 },
    ]},
    { leftPct: 46, bubbles: [
      { size: 5, offset:  0, rise: 500, wobble:  5, duration: 6.0, delay: 0.0 },
      { size: 3, offset: -1, rise: 475, wobble: -6, duration: 6.4, delay: 0.6 },
      { size: 4, offset:  1, rise: 530, wobble:  4, duration: 7.0, delay: 1.1 },
      { size: 6, offset:  0, rise: 490, wobble: -5, duration: 5.8, delay: 3.5 },
      { size: 3, offset: -1, rise: 515, wobble:  3, duration: 6.7, delay: 4.0 },
    ]},
    { leftPct: 66, bubbles: [
      { size: 4, offset:  1, rise: 545, wobble: -4, duration: 6.3, delay: 0.0 },
      { size: 6, offset:  0, rise: 510, wobble:  7, duration: 7.2, delay: 0.4 },
      { size: 3, offset: -1, rise: 480, wobble: -5, duration: 5.7, delay: 0.9 },
      { size: 5, offset:  0, rise: 525, wobble:  4, duration: 6.6, delay: 3.6 },
      { size: 4, offset:  1, rise: 500, wobble: -6, duration: 6.9, delay: 4.1 },
    ]},
  ];
  for (const rock of rockDefs) {
    const rockEl = document.createElement('span');
    rockEl.className = 'aquarium-bubble-rock';
    rockEl.style.left = `${rock.leftPct - 1}%`;
    el.appendChild(rockEl);
    for (const { size, offset, rise, wobble, duration, delay } of rock.bubbles) {
      const bubble = document.createElement('span');
      bubble.className = 'aquarium-bubble';
      bubble.style.width = `${size}px`;
      bubble.style.height = `${size}px`;
      bubble.style.left = `${rock.leftPct + offset}%`;
      bubble.style.bottom = '3%';
      bubble.style.setProperty('--bubble-rise', `${rise}px`);
      bubble.style.setProperty('--bubble-wobble', `${wobble}px`);
      bubble.style.setProperty('--bubble-duration', `${duration}s`);
      bubble.style.setProperty('--bubble-delay', `${delay}s`);
      el.appendChild(bubble);
    }
  }

  // Shrimp: weighted random count favoring 3–4 (3–6 possible), distributed evenly across the bottom third of the tank with jitter.
  // Color palette blends warm and cool shrimp morph-inspired hues for variety.
  // Now spawns across full tank width with bidirectional movement for diversity.
  const shrimpHues = [0, 22, 55, 115, 200, 260, 330];
  const shrimpHuePool = createShuffledCopy(shrimpHues);
  const shrimpCount = getAquariumWildlifeOverrideBounds(wildlifeOverrides.shrimpCount, 0, 12, getAquariumShrimpCount());
  const slotHeight = shrimpCount > 0 ? AQUARIUM_SHRIMP_VERTICAL_SPACE_PERCENT / shrimpCount : 0;
  const shrimpSizeTiers = [10, 14, 20, 26, 31];
  if (shrimpCount > 0) {
    for (let i = 0; i < shrimpCount; i++) {
      const slotStart = 67 + i * slotHeight;
      const top = Math.floor(slotStart + Math.random() * (slotHeight * 0.7));
      const size = shrimpSizeTiers[Math.floor(Math.random() * shrimpSizeTiers.length)] + Math.floor(Math.random() * 3);
      const swimDist = 85 + Math.floor(Math.random() * 65);
      const duration = 30 + Math.random() * 24;
      const delay = -(Math.random() * duration);
      const hue = shrimpHuePool[i % shrimpHuePool.length];
      const startLeft = 5 + Math.floor(Math.random() * 85); // Randomize across tank width
      const swimsRight = Math.random() < 0.5; // 50% chance to swim in each direction
      const shrimp = document.createElement('span');
      shrimp.className = 'aquarium-shrimp';
      shrimp.textContent = '🦐';
      shrimp.style.fontSize = `${size}px`;
      shrimp.style.top = `${top}%`;
      shrimp.style.filter = `hue-rotate(${hue}deg)`;
      applyAquariumHorizontalMotion({
        creatureEl: shrimp,
        startLeftPct: startLeft,
        creatureWidthPx: estimateAquariumEmojiWidthPx(size, shrimp.textContent),
        swimDistPx: swimDist,
        distancePropertyName: '--shrimp-swim-dist',
        swimsRight,
        reverseClassName: 'aquarium-shrimp-reverse',
      });
      shrimp.style.setProperty('--shrimp-duration', `${duration.toFixed(2)}s`);
      shrimp.style.setProperty('--shrimp-delay', `${delay.toFixed(2)}s`);
      appendAquariumCreature(shrimp);
    }
  }

  const disneyFishPool = createShuffledCopy(AQUARIUM_DISNEY_CHARACTER_SPECS);

  // Special guest: one random sea creature/item per load.
  const guests = [
    'snail',
    'starfish',
    'turtle',
    'jellyfish',
    'nautilus',
    'octopus',
    'frog',
    'manta-ray',
    'shark',
    'electric-eel',
    'moray-eel',
    'anchor',
    'mario-jellyfish',
    'anglerfish',
    'snapping-turtle',
    'vampire-octopus',
    'baby-barracuda',
    'little-crocodile',
    'bubble-chest',
    'coral',
    'anemone',
    'toy-diver',
    'cthulhu-bubbler',
    'skull-bubbler'
  ];
  const guestType = typeof wildlifeOverrides.guestType === 'string' && guests.includes(wildlifeOverrides.guestType)
    ? wildlifeOverrides.guestType
    : guests[Math.floor(Math.random() * guests.length)];

  if (guestType === 'snail') {
    const size = 20 + Math.floor(Math.random() * 10);
    const left = 5 + Math.floor(Math.random() * 30);
    const crawlDist = 120 + Math.floor(Math.random() * 100);
    const duration = 22 + Math.random() * 14;
    const delay = -(Math.random() * duration);
    const snail = document.createElement('span');
    snail.className = 'aquarium-snail';
    snail.textContent = '🐌';
    snail.style.fontSize = `${size}px`;
    snail.style.bottom = '4%';
    applyAquariumHorizontalMotion({
      creatureEl: snail,
      startLeftPct: left,
      creatureWidthPx: estimateAquariumEmojiWidthPx(size, snail.textContent),
      swimDistPx: crawlDist,
      distancePropertyName: '--snail-crawl-dist',
      allowDirectionFlip: false,
    });
    snail.style.setProperty('--snail-duration', `${duration.toFixed(2)}s`);
    snail.style.setProperty('--snail-delay', `${delay.toFixed(2)}s`);
    appendAquariumCreature(snail);
  } else if (guestType === 'starfish' || guestType === 'anchor') {
    const size = 22 + Math.floor(Math.random() * 12);
    const left = 20 + Math.floor(Math.random() * 55);
    const duration = 18 + Math.random() * 10;
    const delay = Math.random() * 7;
    const star = document.createElement('span');
    star.className = 'aquarium-starfish';
    star.textContent = guestType === 'anchor' ? '⚓' : '⭐';
    star.style.fontSize = `${size}px`;
    star.style.bottom = '6%';
    star.style.left = `${left}%`;
    star.style.setProperty('--starfish-duration', `${duration.toFixed(2)}s`);
    star.style.setProperty('--starfish-delay', `${delay.toFixed(2)}s`);
    appendAquariumCreature(star);
  } else if (guestType === 'turtle' || guestType === 'snapping-turtle' || guestType === 'little-crocodile') {
    const size = 30 + Math.floor(Math.random() * 12);
    const top = 30 + Math.floor(Math.random() * 35);
    const startLeft = 5 + Math.floor(Math.random() * 85); // Randomize starting position
    const swimDist = 150 + Math.floor(Math.random() * 100);
    const duration = 20 + Math.random() * 14;
    const delay = -(Math.random() * duration);
    const swimsRight = Math.random() < 0.5; // 50% chance to swim in each direction
    const turtle = document.createElement('span');
    turtle.className = 'aquarium-turtle';
    turtle.textContent = guestType === 'little-crocodile' ? '🐊' : '🐢';
    turtle.style.fontSize = `${size}px`;
    turtle.style.top = `${top}%`;
    applyAquariumHorizontalMotion({
      creatureEl: turtle,
      startLeftPct: startLeft,
      creatureWidthPx: estimateAquariumEmojiWidthPx(size, turtle.textContent),
      swimDistPx: swimDist,
      distancePropertyName: '--turtle-swim-dist',
      swimsRight,
      reverseClassName: 'aquarium-turtle-reverse',
    });
    turtle.style.setProperty('--turtle-duration', `${duration.toFixed(2)}s`);
    turtle.style.setProperty('--turtle-delay', `${delay.toFixed(2)}s`);
    appendAquariumCreature(turtle);
  } else if (guestType === 'jellyfish' || guestType === 'mario-jellyfish') {
    const size = 24 + Math.floor(Math.random() * 14);
    const left = 15 + Math.floor(Math.random() * 65);
    const driftAmt = 30 + Math.floor(Math.random() * 30);
    const duration = 6 + Math.random() * 5;
    const delay = Math.random() * 4;
    const jelly = document.createElement('span');
    jelly.className = 'aquarium-jellyfish';
    jelly.textContent = guestType === 'mario-jellyfish' ? '🪼🍄' : '🪼';
    jelly.style.fontSize = `${size}px`;
    jelly.style.top = `${15 + Math.floor(Math.random() * 50)}%`;
    jelly.style.left = `${left}%`;
    jelly.style.setProperty('--jelly-drift', `${driftAmt}px`);
    jelly.style.setProperty('--jelly-duration', `${duration.toFixed(2)}s`);
    jelly.style.setProperty('--jelly-delay', `${delay.toFixed(2)}s`);
    appendAquariumCreature(jelly);
  } else if (guestType === 'nautilus') {
    const size = 26 + Math.floor(Math.random() * 12);
    const top = 25 + Math.floor(Math.random() * 40);
    const startLeft = 5 + Math.floor(Math.random() * 85); // Randomize starting position
    const swimDist = 160 + Math.floor(Math.random() * 100);
    const duration = 18 + Math.random() * 12;
    const delay = -(Math.random() * duration);
    const swimsRight = Math.random() < 0.5; // 50% chance to swim in each direction
    const nautilus = document.createElement('span');
    nautilus.className = 'aquarium-nautilus';
    nautilus.textContent = '🐚';
    nautilus.style.fontSize = `${size}px`;
    nautilus.style.top = `${top}%`;
    applyAquariumHorizontalMotion({
      creatureEl: nautilus,
      startLeftPct: startLeft,
      creatureWidthPx: estimateAquariumEmojiWidthPx(size, nautilus.textContent),
      swimDistPx: swimDist,
      distancePropertyName: '--nautilus-swim-dist',
      swimsRight,
      reverseClassName: 'aquarium-nautilus-reverse',
    });
    nautilus.style.setProperty('--nautilus-duration', `${duration.toFixed(2)}s`);
    nautilus.style.setProperty('--nautilus-delay', `${delay.toFixed(2)}s`);
    appendAquariumCreature(nautilus);
  } else if (guestType === 'octopus' || guestType === 'vampire-octopus') {
    const size = 28 + Math.floor(Math.random() * 14);
    const top = 20 + Math.floor(Math.random() * 50);
    const startLeft = 5 + Math.floor(Math.random() * 85); // Randomize starting position
    const swimDist = 180 + Math.floor(Math.random() * 110);
    const duration = 14 + Math.random() * 10;
    const delay = -(Math.random() * duration);
    const swimsRight = Math.random() < 0.5; // 50% chance to swim in each direction
    const octopus = document.createElement('span');
    octopus.className = 'aquarium-octopus';
    octopus.textContent = guestType === 'vampire-octopus' ? '🐙🧛' : '🐙';
    octopus.style.fontSize = `${size}px`;
    octopus.style.top = `${top}%`;
    applyAquariumHorizontalMotion({
      creatureEl: octopus,
      startLeftPct: startLeft,
      creatureWidthPx: estimateAquariumEmojiWidthPx(size, octopus.textContent),
      swimDistPx: swimDist,
      distancePropertyName: '--octopus-swim-dist',
      swimsRight,
      reverseClassName: 'aquarium-octopus-reverse',
    });
    octopus.style.setProperty('--octopus-duration', `${duration.toFixed(2)}s`);
    octopus.style.setProperty('--octopus-delay', `${delay.toFixed(2)}s`);
    appendAquariumCreature(octopus);
  } else if (guestType === 'frog') {
    const size = 18 + Math.floor(Math.random() * 8);
    const left = 10 + Math.floor(Math.random() * 60);
    const hopDist = 40 + Math.floor(Math.random() * 40);
    const duration = 10 + Math.random() * 8;
    const delay = -(Math.random() * duration);
    const frog = document.createElement('span');
    frog.className = 'aquarium-frog';
    frog.textContent = '🐸';
    frog.style.fontSize = `${size}px`;
    frog.style.bottom = '4%';
    applyAquariumHorizontalMotion({
      creatureEl: frog,
      startLeftPct: left,
      creatureWidthPx: estimateAquariumEmojiWidthPx(size, frog.textContent),
      swimDistPx: hopDist,
      distancePropertyName: '--frog-hop-dist',
      allowDirectionFlip: false,
    });
    frog.style.setProperty('--frog-duration', `${duration.toFixed(2)}s`);
    frog.style.setProperty('--frog-delay', `${delay.toFixed(2)}s`);
    appendAquariumCreature(frog);
  } else if (guestType === 'manta-ray') {
    const size = 22 + Math.floor(Math.random() * 10);
    const top = 20 + Math.floor(Math.random() * 45);
    const startLeft = 5 + Math.floor(Math.random() * 85); // Randomize starting position
    const swimDist = 200 + Math.floor(Math.random() * 120);
    const duration = 22 + Math.random() * 14;
    const delay = -(Math.random() * duration);
    const swimsRight = Math.random() < 0.5; // 50% chance to swim in each direction
    const manta = document.createElement('span');
    manta.className = 'aquarium-manta-ray';
    manta.textContent = '🐡';
    manta.style.fontSize = `${size}px`;
    manta.style.top = `${top}%`;
    applyAquariumHorizontalMotion({
      creatureEl: manta,
      startLeftPct: startLeft,
      creatureWidthPx: estimateAquariumEmojiWidthPx(size, manta.textContent),
      swimDistPx: swimDist,
      distancePropertyName: '--manta-swim-dist',
      swimsRight,
      reverseClassName: 'aquarium-manta-ray-reverse',
    });
    manta.style.setProperty('--manta-duration', `${duration.toFixed(2)}s`);
    manta.style.setProperty('--manta-delay', `${delay.toFixed(2)}s`);
    appendAquariumCreature(manta);
  } else if (guestType === 'shark' || guestType === 'anglerfish' || guestType === 'baby-barracuda') {
    const size = 20 + Math.floor(Math.random() * 8);
    const top = 15 + Math.floor(Math.random() * 50);
    const startLeft = 5 + Math.floor(Math.random() * 85); // Randomize starting position
    const swimDist = 220 + Math.floor(Math.random() * 130);
    const duration = 12 + Math.random() * 8;
    const delay = -(Math.random() * duration);
    const swimsRight = Math.random() < 0.5; // 50% chance to swim in each direction
    const shark = document.createElement('span');
    shark.className = 'aquarium-shark';
    if (guestType === 'anglerfish') {
      shark.textContent = '🐟💡';
    } else if (guestType === 'baby-barracuda') {
      shark.textContent = '🐟';
    } else {
      shark.textContent = '🦈';
    }
    shark.style.fontSize = `${size}px`;
    shark.style.top = `${top}%`;
    applyAquariumHorizontalMotion({
      creatureEl: shark,
      startLeftPct: startLeft,
      creatureWidthPx: estimateAquariumEmojiWidthPx(size, shark.textContent),
      swimDistPx: swimDist,
      distancePropertyName: '--shark-swim-dist',
      swimsRight,
      reverseClassName: 'aquarium-shark-reverse',
    });
    shark.style.setProperty('--shark-duration', `${duration.toFixed(2)}s`);
    shark.style.setProperty('--shark-delay', `${delay.toFixed(2)}s`);
    appendAquariumCreature(shark);
  } else if (guestType === 'electric-eel') {
    const size = 22 + Math.floor(Math.random() * 10);
    const top = 30 + Math.floor(Math.random() * 40);
    const startLeft = 5 + Math.floor(Math.random() * 85); // Randomize starting position
    const swimDist = 190 + Math.floor(Math.random() * 100);
    const duration = 16 + Math.random() * 10;
    const delay = -(Math.random() * duration);
    const swimsRight = Math.random() < 0.5; // 50% chance to swim in each direction
    const eel = document.createElement('span');
    eel.className = 'aquarium-electric-eel';
    eel.textContent = '🐍';
    eel.style.fontSize = `${size}px`;
    eel.style.top = `${top}%`;
    applyAquariumHorizontalMotion({
      creatureEl: eel,
      startLeftPct: startLeft,
      creatureWidthPx: estimateAquariumEmojiWidthPx(size, eel.textContent),
      swimDistPx: swimDist,
      distancePropertyName: '--electric-eel-swim-dist',
      swimsRight,
      reverseClassName: 'aquarium-electric-eel-reverse',
    });
    eel.style.setProperty('--electric-eel-duration', `${duration.toFixed(2)}s`);
    eel.style.setProperty('--electric-eel-delay', `${delay.toFixed(2)}s`);
    appendAquariumCreature(eel);
  } else if (guestType === 'moray-eel') {
    const size = 24 + Math.floor(Math.random() * 10);
    const top = 35 + Math.floor(Math.random() * 35);
    const startLeft = 5 + Math.floor(Math.random() * 85); // Randomize starting position
    const swimDist = 170 + Math.floor(Math.random() * 90);
    const duration = 18 + Math.random() * 10;
    const delay = -(Math.random() * duration);
    const swimsRight = Math.random() < 0.5; // 50% chance to swim in each direction
    const moray = document.createElement('span');
    moray.className = 'aquarium-moray-eel';
    moray.textContent = '🐍';
    moray.style.fontSize = `${size}px`;
    moray.style.top = `${top}%`;
    applyAquariumHorizontalMotion({
      creatureEl: moray,
      startLeftPct: startLeft,
      creatureWidthPx: estimateAquariumEmojiWidthPx(size, moray.textContent),
      swimDistPx: swimDist,
      distancePropertyName: '--moray-swim-dist',
      swimsRight,
      reverseClassName: 'aquarium-moray-eel-reverse',
    });
    moray.style.setProperty('--moray-duration', `${duration.toFixed(2)}s`);
    moray.style.setProperty('--moray-delay', `${delay.toFixed(2)}s`);
    appendAquariumCreature(moray);
  } else if (guestType === 'bubble-chest') {
    const chest = document.createElement('span');
    chest.className = 'aquarium-bubble-chest';
    chest.textContent = '📦';
    chest.style.fontSize = `${22 + Math.floor(Math.random() * 8)}px`;
    const leftPct = 18 + Math.floor(Math.random() * 55);
    chest.style.left = `${leftPct}%`;
    chest.style.bottom = '4%';
    chest.style.setProperty('--chest-delay', `${(Math.random() * 3.5).toFixed(2)}s`);
    el.appendChild(chest);
    appendAquariumBubblerStream(el, { leftPct: leftPct + 1.4, bottomPct: 11, bubbleCount: 6, riseMin: 250, riseMax: 390 });
  } else if (guestType === 'coral') {
    const coral = document.createElement('span');
    coral.className = 'aquarium-coral';
    coral.textContent = '🪸';
    coral.style.fontSize = `${26 + Math.floor(Math.random() * 10)}px`;
    coral.style.left = `${12 + Math.floor(Math.random() * 66)}%`;
    coral.style.bottom = '3%';
    coral.style.setProperty('--coral-delay', `${(Math.random() * 4).toFixed(2)}s`);
    el.appendChild(coral);
  } else if (guestType === 'anemone') {
    const anemone = document.createElement('span');
    anemone.className = 'aquarium-anemone';
    anemone.textContent = '🌺';
    anemone.style.fontSize = `${24 + Math.floor(Math.random() * 9)}px`;
    anemone.style.left = `${16 + Math.floor(Math.random() * 62)}%`;
    anemone.style.bottom = '4%';
    anemone.style.setProperty('--anemone-delay', `${(Math.random() * 3.4).toFixed(2)}s`);
    el.appendChild(anemone);
  } else if (guestType === 'toy-diver') {
    const size = 26 + Math.floor(Math.random() * 10);
    const top = 28 + Math.floor(Math.random() * 40);
    const startLeft = 5 + Math.floor(Math.random() * 85); // Randomize starting position
    const swimDist = 150 + Math.floor(Math.random() * 90);
    const duration = 15 + Math.random() * 10;
    const delay = -(Math.random() * duration);
    const swimsRight = Math.random() < 0.5; // 50% chance to swim in each direction
    const diver = document.createElement('span');
    diver.className = 'aquarium-toy-diver';
    diver.textContent = '🤿';
    diver.style.fontSize = `${size}px`;
    diver.style.top = `${top}%`;
    applyAquariumHorizontalMotion({
      creatureEl: diver,
      startLeftPct: startLeft,
      creatureWidthPx: estimateAquariumEmojiWidthPx(size, diver.textContent),
      swimDistPx: swimDist,
      distancePropertyName: '--toy-diver-swim-dist',
      swimsRight,
      reverseClassName: 'aquarium-toy-diver-reverse',
    });
    diver.style.setProperty('--toy-diver-duration', `${duration.toFixed(2)}s`);
    diver.style.setProperty('--toy-diver-delay', `${delay.toFixed(2)}s`);
    appendAquariumCreature(diver);
  } else if (guestType === 'cthulhu-bubbler') {
    const cthulhu = document.createElement('span');
    cthulhu.className = 'aquarium-cthulhu-bubbler';
    cthulhu.textContent = '🐙';
    cthulhu.style.fontSize = `${30 + Math.floor(Math.random() * 8)}px`;
    const leftPct = 14 + Math.floor(Math.random() * 62);
    cthulhu.style.left = `${leftPct}%`;
    cthulhu.style.bottom = '3%';
    cthulhu.style.setProperty('--cthulhu-delay', `${(Math.random() * 4.2).toFixed(2)}s`);
    el.appendChild(cthulhu);
    appendAquariumBubblerStream(el, { leftPct: leftPct + 2, bottomPct: 13, bubbleCount: 7, riseMin: 260, riseMax: 410 });
  } else if (guestType === 'skull-bubbler') {
    const skull = document.createElement('span');
    skull.className = 'aquarium-skull-bubbler';
    skull.textContent = '💀';
    skull.style.fontSize = `${24 + Math.floor(Math.random() * 8)}px`;
    const leftPct = 20 + Math.floor(Math.random() * 58);
    skull.style.left = `${leftPct}%`;
    skull.style.bottom = '4%';
    skull.style.setProperty('--skull-delay', `${(Math.random() * 4).toFixed(2)}s`);
    el.appendChild(skull);
    appendAquariumBubblerStream(el, { leftPct: leftPct + 1.2, bottomPct: 10, bubbleCount: 6, riseMin: 240, riseMax: 370 });
  }

  // Generic fish slots: 1 or 2 fish drawn from the Disney sprite roster.
  // Now spawns with randomized positions across tank width for diversity.
  const allFishConfigs = [
    {
      widthPx: 40 + Math.floor(Math.random() * 8),
      topPct: 22 + Math.floor(Math.random() * 28),
      leftPct: 5 + Math.floor(Math.random() * 85),
      swimDistPx: 180 + Math.floor(Math.random() * 100),
      durationSec: 9 + Math.random() * 6,
      delaySec: 0
    },
    {
      widthPx: 38 + Math.floor(Math.random() * 8),
      topPct: 30 + Math.floor(Math.random() * 30),
      leftPct: 5 + Math.floor(Math.random() * 85),
      swimDistPx: 170 + Math.floor(Math.random() * 110),
      durationSec: 10 + Math.random() * 7,
      delaySec: 0
    }
  ];
  const disneyFishCount = getAquariumWildlifeOverrideBounds(
    wildlifeOverrides.disneyFishCount,
    0,
    allFishConfigs.length,
    DEFAULT_DISNEY_FISH_COUNT,
  );
  const leadingFishConfigs = allFishConfigs.slice(0, disneyFishCount);
  for (const fishConfig of leadingFishConfigs) {
    fishConfig.delaySec = -(Math.random() * fishConfig.durationSec);
    const fishMotion = resolveAquariumHorizontalMotion({
      tankWidthPx: spot.w,
      startLeftPct: fishConfig.leftPct,
      creatureWidthPx: fishConfig.widthPx,
      swimDistPx: fishConfig.swimDistPx,
      allowDirectionFlip: false,
    });
    appendAquariumDisneyFish(getRandomAquariumCreatureLayer(backCreatureLayerEl, frontCreatureLayerEl), disneyFishPool, {
      ...fishConfig,
      leftPct: fishMotion.startLeftPct,
      swimDistPx: fishMotion.swimDistPx,
    });
  }

  // ── Left-side filter (hang-on-back style, upper-left of tank) ────────────
  const leftFilterEl = document.createElement('div');
  leftFilterEl.className = 'aquarium-filter aquarium-filter-left';
  el.appendChild(leftFilterEl);

  // Current-pushed bubbles from left filter outflow — drift rightward
  const leftFilterCurrentBubbles = [
    { size: 2, left: '8%',  bottom: '90%', rise: 50,  current:  38, duration: 1.8, delay: 0.0 },
    { size: 3, left: '6%',  bottom: '88%', rise: 55,  current:  52, duration: 2.2, delay: 0.6 },
    { size: 2, left: '9%',  bottom: '91%', rise: 45,  current:  44, duration: 1.6, delay: 1.2 },
    { size: 3, left: '7%',  bottom: '89%', rise: 58,  current:  48, duration: 2.0, delay: 1.9 },
  ];
  for (const { size, left, bottom, rise, current, duration, delay } of leftFilterCurrentBubbles) {
    const bubble = document.createElement('span');
    bubble.className = 'aquarium-bubble aquarium-current-bubble';
    bubble.style.width = `${size}px`;
    bubble.style.height = `${size}px`;
    bubble.style.left = left;
    bubble.style.bottom = bottom;
    bubble.style.setProperty('--bubble-rise', `${rise}px`);
    bubble.style.setProperty('--bubble-current', `${current}px`);
    bubble.style.setProperty('--bubble-duration', `${duration}s`);
    bubble.style.setProperty('--bubble-delay', `${delay}s`);
    el.appendChild(bubble);
  }

  // ── Constant bubble streams — left side and right side of tank ───────────
  const leftStreamBubbles = [
    { size: 4, left: '3%',  rise: 520, wobble: -4, duration: 6.1, delay: 0.0 },
    { size: 6, left: '5%',  rise: 560, wobble:  5, duration: 7.0, delay: 0.9 },
    { size: 3, left: '2%',  rise: 490, wobble: -3, duration: 5.5, delay: 1.8 },
    { size: 5, left: '4%',  rise: 540, wobble:  4, duration: 6.6, delay: 2.6 },
    { size: 4, left: '3%',  rise: 505, wobble: -5, duration: 5.9, delay: 3.5 },
    { size: 6, left: '5%',  rise: 575, wobble:  3, duration: 7.3, delay: 4.4 },
  ];
  for (const { size, left, rise, wobble, duration, delay } of leftStreamBubbles) {
    const bubble = document.createElement('span');
    bubble.className = 'aquarium-bubble';
    bubble.style.width = `${size}px`;
    bubble.style.height = `${size}px`;
    bubble.style.left = left;
    bubble.style.bottom = '3%';
    bubble.style.setProperty('--bubble-rise', `${rise}px`);
    bubble.style.setProperty('--bubble-wobble', `${wobble}px`);
    bubble.style.setProperty('--bubble-duration', `${duration}s`);
    bubble.style.setProperty('--bubble-delay', `${delay}s`);
    el.appendChild(bubble);
  }

  const rightStreamBubbles = [
    { size: 5, left: '93%', rise: 535, wobble: -5, duration: 6.3, delay: 0.0 },
    { size: 4, left: '96%', rise: 510, wobble:  4, duration: 5.8, delay: 1.1 },
    { size: 6, left: '94%', rise: 570, wobble: -3, duration: 7.1, delay: 2.0 },
    { size: 3, left: '95%', rise: 490, wobble:  5, duration: 5.4, delay: 2.9 },
    { size: 5, left: '93%', rise: 550, wobble: -4, duration: 6.8, delay: 3.8 },
    { size: 4, left: '96%', rise: 520, wobble:  3, duration: 6.0, delay: 4.7 },
  ];
  for (const { size, left, rise, wobble, duration, delay } of rightStreamBubbles) {
    const bubble = document.createElement('span');
    bubble.className = 'aquarium-bubble';
    bubble.style.width = `${size}px`;
    bubble.style.height = `${size}px`;
    bubble.style.left = left;
    bubble.style.bottom = '3%';
    bubble.style.setProperty('--bubble-rise', `${rise}px`);
    bubble.style.setProperty('--bubble-wobble', `${wobble}px`);
    bubble.style.setProperty('--bubble-duration', `${duration}s`);
    bubble.style.setProperty('--bubble-delay', `${delay}s`);
    el.appendChild(bubble);
  }

  el.append(backCreatureLayerEl, depthOverlayLeftEl, depthOverlayRightEl, frontCreatureLayerEl);

  dom.effectsLayer.appendChild(el);

  state.overlayElementsById.set(AQUARIUM_FISH_EFFECT_ID, el);
  syncAquariumWildlifeGuiData();
}

function rerenderAquariumFishEffectPreservingDepthOverlays() {
  const existingAquariumEffectEl = state.overlayElementsById.get(AQUARIUM_FISH_EFFECT_ID);
  const preservedDepthOverlaysById = new Map(
    Array.from(existingAquariumEffectEl?.querySelectorAll('.aquarium-depth-overlay[data-debug-object-id]') || [])
      .map((overlayEl) => [overlayEl.dataset.debugObjectId, overlayEl])
      .filter(([debugObjectId]) => typeof debugObjectId === 'string' && debugObjectId.length > 0)
  );
  createAquariumFishEffect();
  if (preservedDepthOverlaysById.size === 0) {
    return;
  }
  const aquariumEffectEl = state.overlayElementsById.get(AQUARIUM_FISH_EFFECT_ID);
  if (!aquariumEffectEl) {
    return;
  }
  preservedDepthOverlaysById.forEach((overlayEl, debugObjectId) => {
    aquariumEffectEl
      .querySelector(`.aquarium-depth-overlay[data-debug-object-id="${debugObjectId}"]`)
      ?.replaceWith(overlayEl);
  });
  syncAquariumWildlifeGuiData();
}

function renderHotspotLayers() {
  createAshtraySmokeEffect();
  createAshtrayCigaretteEffect();
  createAquariumFishEffect();
  createHotspots(state.hotspots);
  syncControlledOverlaysFromHotspots();
}

function applyTransforms() {
  dom.world.style.transform = `translate3d(${-state.cameraX}px, 0, 0)`;
}

function setCameraX(nextCameraX) {
  const previousCameraX = state.cameraX;
  state.cameraX = clamp(nextCameraX, 0, state.maxCameraX);
  if (state.cameraX === previousCameraX) return;
  applyTransforms();
}

function setTargetCameraX(nextCameraX) {
  const nextTarget = clamp(nextCameraX, 0, state.maxCameraX);
  if (state.targetCameraX === nextTarget) return;
  state.targetCameraX = nextTarget;
  startCameraAnimation();
}

function startCameraAnimation() {
  if (state.cameraAnimationFrameId !== null) return;
  state.cameraAnimationFrameId = window.requestAnimationFrame(tickCamera);
}

function tickCamera() {
  state.cameraAnimationFrameId = null;
  const delta = state.targetCameraX - state.cameraX;
  if (Math.abs(delta) < CAMERA_SETTLE_EPSILON) {
    setCameraX(state.targetCameraX);
    return;
  }
  setCameraX(state.cameraX + delta * CAMERA_SMOOTHING_FACTOR);
  startCameraAnimation();
}

function stopMomentum() {
  if (state.momentumAnimationFrameId !== null) {
    window.cancelAnimationFrame(state.momentumAnimationFrameId);
    state.momentumAnimationFrameId = null;
  }
  state.momentumVelocityX = 0;
  state.lastMomentumTimestamp = 0;
}

function shouldUseMomentum(pointerType) {
  return pointerType === 'touch' || (pointerType === 'pen' && hasCoarsePointer);
}

function startMomentum(initialVelocityX) {
  stopMomentum();
  if (!shouldUseMomentum(state.activePointerType) || Math.abs(initialVelocityX) < TOUCH_MOMENTUM_MIN_VELOCITY) return;
  setCameraX(state.targetCameraX);
  state.targetCameraX = state.cameraX;
  state.momentumVelocityX = initialVelocityX;
  state.momentumAnimationFrameId = window.requestAnimationFrame(function tickMomentum(timestamp) {
    if (state.lastMomentumTimestamp === 0) state.lastMomentumTimestamp = timestamp;
    const elapsed = Math.max(1, timestamp - state.lastMomentumTimestamp);
    state.lastMomentumTimestamp = timestamp;
    state.momentumVelocityX *= Math.exp(-TOUCH_MOMENTUM_DECAY * elapsed);
    if (Math.abs(state.momentumVelocityX) < TOUCH_MOMENTUM_MIN_VELOCITY) {
      stopMomentum();
      return;
    }
    const previousCameraX = state.cameraX;
    setCameraX(state.cameraX + state.momentumVelocityX * elapsed);
    state.targetCameraX = state.cameraX;
    if (state.cameraX === previousCameraX) {
      stopMomentum();
      return;
    }
    state.momentumAnimationFrameId = window.requestAnimationFrame(tickMomentum);
  });
}

function resize() {
  state.scale = window.innerHeight / DESIGN_HEIGHT;
  state.visibleWidth = window.innerWidth / state.scale;
  state.maxCameraX = Math.max(0, WORLD_WIDTH - state.visibleWidth);
  dom.stage.style.width = `${WORLD_WIDTH}px`;
  dom.stage.style.transform = `scale(${state.scale}) translate3d(0, -50%, 0)`;
  dom.world.style.width = `${WORLD_WIDTH}px`;
  dom.world.style.height = `${WORLD_HEIGHT}px`;
  if (!state.hasInitializedCamera) {
    setCameraX(DESK_CENTER_X - state.visibleWidth / 2);
    state.targetCameraX = state.cameraX;
    state.hasInitializedCamera = true;
  } else {
    setCameraX(state.cameraX);
    state.targetCameraX = state.cameraX;
  }
  state._cb.updateBigTvDebugWatermarkPlacement?.();
}

function onWheel(event) {
  event.preventDefault();
  stopMomentum();
  let unitScale = 1;
  if (event.deltaMode === DOM_DELTA_LINE) unitScale = LINE_SCROLL_PIXELS;
  else if (event.deltaMode === DOM_DELTA_PAGE) unitScale = window.innerHeight;
  const useHorizontalAxis = Math.abs(event.deltaX) > Math.abs(event.deltaY);
  const primaryAxisDelta = useHorizontalAxis ? event.deltaX : event.deltaY;
  setTargetCameraX(state.targetCameraX + primaryAxisDelta * unitScale * WHEEL_SCROLL_MULTIPLIER);
}

function startDebugEdit(event, el, type, dir) {
  if (el.classList.contains('locked-debug-hotspot')) return;
  state.activePointerId = event.pointerId;
  state.debugEditType = type;
  state.debugEditEl = el;
  state.debugEditDir = dir;
  state.debugEditStartX = event.clientX;
  state.debugEditStartY = event.clientY;
  state.debugEditOrigRect = {
    left: parseFloat(el.style.left),
    top: parseFloat(el.style.top),
    w: parseFloat(el.style.width),
    h: parseFloat(el.style.height)
  };
  dom.viewport.setPointerCapture(event.pointerId);
}

function applyDebugEdit(event) {
  const dx = (event.clientX - state.debugEditStartX) / state.scale;
  const dy = (event.clientY - state.debugEditStartY) / state.scale;
  const { left, top, w, h } = state.debugEditOrigRect;
  const el = state.debugEditEl;
  const debugObjectId = el?.dataset?.debugObjectId;
  const MIN_SIZE = 20;
  if (state.debugEditType === 'move') {
    if (debugObjectId) {
      setAquariumDepthOverlayLayout(debugObjectId, { x: left + dx, y: top + dy, w, h });
      return;
    }
    el.style.left = `${left + dx}px`;
    el.style.top = `${top + dy}px`;
  } else {
    const dir = state.debugEditDir;
    let newLeft = left; let newTop = top; let newW = w; let newH = h;
    if (dir.includes('e')) newW = Math.max(MIN_SIZE, w + dx);
    if (dir.includes('w')) { const clampedW = Math.max(MIN_SIZE, w - dx); newLeft = left + (w - clampedW); newW = clampedW; }
    if (dir.includes('s')) newH = Math.max(MIN_SIZE, h + dy);
    if (dir.includes('n')) { const clampedH = Math.max(MIN_SIZE, h - dy); newTop = top + (h - clampedH); newH = clampedH; }
    if (debugObjectId) {
      setAquariumDepthOverlayLayout(debugObjectId, { x: newLeft, y: newTop, w: newW, h: newH });
      return;
    }
    el.style.left = `${newLeft}px`; el.style.top = `${newTop}px`; el.style.width = `${newW}px`; el.style.height = `${newH}px`;
  }
  const label = el.querySelector('.hotspot-label');
  if (label) label.textContent = `${el.dataset.label || el.id} (${Math.round(parseFloat(el.style.left))}, ${Math.round(parseFloat(el.style.top))}) ${Math.round(parseFloat(el.style.width))}×${Math.round(parseFloat(el.style.height))}`;
  syncControlledOverlaysFromHotspots();
}

function onPointerDown(event) {
  unlockCornerScoreScoringAudioFromGesture();
  if (state.activePointerId !== null) return;
  stopMomentum();
  if (document.body.classList.contains('debug')) {
    const handle = event.target.closest('.resize-handle');
    if (handle) {
      const hotspotEl = handle.closest('.hotspot');
      if (hotspotEl && !hotspotEl.classList.contains('locked-debug-hotspot')) {
        startDebugEdit(event, hotspotEl, 'resize', handle.dataset.dir);
        return;
      }
      const depthOverlayEl = handle.closest('.aquarium-depth-overlay');
      if (depthOverlayEl) {
        startDebugEdit(event, depthOverlayEl, 'resize', handle.dataset.dir);
        return;
      }
    }
    const hotspotEl = event.target.closest('.hotspot');
    if (hotspotEl && !hotspotEl.classList.contains('locked-debug-hotspot')) {
      startDebugEdit(event, hotspotEl, 'move', null);
      return;
    }
    const depthOverlayEl = event.target.closest('.aquarium-depth-overlay');
    if (depthOverlayEl) {
      startDebugEdit(event, depthOverlayEl, 'move', null);
      return;
    }
  }
  state.isPointerDown = true;
  state.activePointerId = event.pointerId;
  state.activePointerType = event.pointerType || '';
  state.pointerStartX = event.clientX;
  state.lastPointerX = event.clientX;
  state.lastPointerMoveTime = event.timeStamp;
  state.dragVelocityX = 0;
  state.dragStartedOnHotspot = Boolean(event.target.closest('.hotspot'));
  state.suppressHotspotClickUntil = 0;
}

function onPointerMove(event) {
  if (event.pointerId !== state.activePointerId) return;
  if (state.debugEditType !== null) {
    applyDebugEdit(event);
    return;
  }
  if (!state.isPointerDown) return;
  if (!state.isDragging) {
    if (Math.abs(event.clientX - state.pointerStartX) < DRAG_START_THRESHOLD_PX) return;
    state.isDragging = true;
    dom.viewport.classList.add('dragging');
    dom.viewport.setPointerCapture(event.pointerId);
    if (state.dragStartedOnHotspot) state.suppressHotspotClickUntil = Date.now() + HOTSPOT_CLICK_SUPPRESSION_MS;
  }
  event.preventDefault();
  const dx = event.clientX - state.lastPointerX;
  const elapsed = Math.max(1, event.timeStamp - state.lastPointerMoveTime);
  state.lastPointerX = event.clientX;
  state.lastPointerMoveTime = event.timeStamp;
  const dragScrollMultiplier = shouldUseMomentum(state.activePointerType) ? MOBILE_DRAG_SCROLL_MULTIPLIER : 1;
  const worldDelta = (-dx / state.scale) * dragScrollMultiplier;
  state.dragVelocityX = state.dragVelocityX * 0.75 + (worldDelta / elapsed) * 0.25;
  setTargetCameraX(state.targetCameraX + worldDelta);
}

function onPointerUp(event) {
  if (event.pointerId !== state.activePointerId) return;
  if (state.debugEditType !== null) {
    state.suppressHotspotClickUntil = Date.now() + HOTSPOT_CLICK_SUPPRESSION_MS;
    state.debugEditType = null; state.debugEditEl = null; state.debugEditDir = null; state.debugEditOrigRect = null;
    state.activePointerId = null; state.activePointerType = '';
    if (dom.viewport.hasPointerCapture(event.pointerId)) dom.viewport.releasePointerCapture(event.pointerId);
    return;
  }
  const shouldStart = state.isDragging && shouldUseMomentum(state.activePointerType);
  const releasedVelocityX = state.dragVelocityX;
  state.isPointerDown = false; state.activePointerId = null; state.activePointerType = ''; state.dragStartedOnHotspot = false; state.isDragging = false; state.dragVelocityX = 0;
  dom.viewport.classList.remove('dragging');
  if (dom.viewport.hasPointerCapture(event.pointerId)) dom.viewport.releasePointerCapture(event.pointerId);
  if (shouldStart) startMomentum(releasedVelocityX);
}

function onKeyDown(event) {
  unlockCornerScoreScoringAudioFromGesture();
  const debugComboPressed = event.code === 'KeyD' && (event.ctrlKey || event.metaKey) && event.shiftKey;
  if (event.code === 'Backquote' || debugComboPressed) toggleDebugMode();
  const isIncreaseDvdSpeedKey = event.key === '+' || event.code === 'NumpadAdd';
  const isDecreaseDvdSpeedKey = event.key === '-' || event.code === 'NumpadSubtract';
  if ((isIncreaseDvdSpeedKey || isDecreaseDvdSpeedKey) && !event.ctrlKey && !event.metaKey && !event.altKey && !isTextEntryTarget(event.target)) {
    event.preventDefault();
    adjustDvdSpeed(isIncreaseDvdSpeedKey ? 1 : -1);
  }
}

function setDebugMode(enabled) {
  document.body.classList.toggle('debug', enabled);
  if (enabled) refreshDebugObjectSelectOptions();
  refreshDebugObjectActions();
  if (dom.debugStatus) dom.debugStatus.textContent = enabled ? 'Debug mode enabled' : 'Debug mode disabled';
}

function toggleDebugMode() {
  setDebugMode(!document.body.classList.contains('debug'));
}

function onDebugButtonClick() {
  setDebugMode(!document.body.classList.contains('debug'));
}

function cleanup() {
  state._cb.hideBigTvPromptOverlay?.();
  stopBigTvDvdAnimation();
  if (state.cameraAnimationFrameId !== null) {
    window.cancelAnimationFrame(state.cameraAnimationFrameId);
    state.cameraAnimationFrameId = null;
  }
  cancelMonitorPowerTimeouts();
  stopMomentum();
  if (state.flipClockRadioTuningAudioEl) {
    stopRadioTuningLoopPlayback(state.flipClockRadioTuningAudioEl);
    state.flipClockRadioTuningAudioEl.currentTime = 0;
  }
}

function bindSceneEvents() {
  if (sceneEventsBound) return;
  sceneEventsBound = true;
  dom.viewport.addEventListener('wheel', onWheel, { passive: false });
  dom.viewport.addEventListener('pointerdown', onPointerDown);
  dom.viewport.addEventListener('pointermove', onPointerMove);
  dom.viewport.addEventListener('pointerup', onPointerUp);
  dom.viewport.addEventListener('pointercancel', onPointerUp);
  dom.hotspotLayer.addEventListener('click', (event) => {
    if (Date.now() < state.suppressHotspotClickUntil) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keydown', (event) => state._cb.handleBigTvPromptTyping?.(event));
  window.addEventListener('pageshow', handlePageShow);
  document.addEventListener('fullscreenchange', () => state._cb.syncBigTvFullscreenUi?.());
  window.addEventListener('resize', resize);
  window.addEventListener('beforeunload', cleanup, { once: true });
  dom.debugToggleButton?.addEventListener('click', onDebugButtonClick);
  dom.debugObjectSelect?.addEventListener('change', refreshDebugObjectActions);
  dom.debugObjectLockButton?.addEventListener('click', () => {
    const selectedEl = getSelectedDebugHotspotElement();
    if (selectedEl) setHotspotDebugLockState(selectedEl.id, true);
  });
  dom.debugObjectUnlockButton?.addEventListener('click', () => {
    const selectedEl = getSelectedDebugHotspotElement();
    if (selectedEl) setHotspotDebugLockState(selectedEl.id, false);
  });
  if (dom.debugUrlSaveButton && dom.debugUrlInput) {
    const saveDebugUrl = () => {
      const selectedEl = getSelectedDebugHotspotElement();
      if (!selectedEl) return;
      if (!saveDenUrlOverride(selectedEl.id, dom.debugUrlInput.value)) return;
      dom.debugUrlSaveButton.textContent = 'Saved!';
      setTimeout(() => { dom.debugUrlSaveButton.textContent = 'Save URL'; }, 2000);
    };
    dom.debugUrlSaveButton.addEventListener('click', saveDebugUrl);
    dom.debugUrlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveDebugUrl();
      }
    });
  }
  if (dom.debugCornerScoreSyncButton) {
    const syncDebugCornerScore = async () => {
      if (!ensureDebugSaveAccess()) return;
      const buttonLabel = 'Set CornerScore server = local (MAD)';
      dom.debugCornerScoreSyncButton.disabled = true;
      dom.debugCornerScoreSyncButton.textContent = 'Syncing...';
      const result = await syncCornerScoreServerToLocalMad();
      if (result.ok) {
        dom.debugCornerScoreSyncButton.textContent = 'Synced!';
        if (dom.debugStatus) dom.debugStatus.textContent = `CornerScore server set to ${result.score} (${result.initials}).`;
      } else {
        dom.debugCornerScoreSyncButton.textContent = 'Sync failed';
        if (dom.debugStatus) dom.debugStatus.textContent = result.error || 'CornerScore server sync failed.';
      }
      window.setTimeout(() => {
        if (dom.debugCornerScoreSyncButton) {
          dom.debugCornerScoreSyncButton.textContent = buttonLabel;
          dom.debugCornerScoreSyncButton.disabled = false;
        }
      }, 2000);
    };
    dom.debugCornerScoreSyncButton.addEventListener('click', () => {
      void syncDebugCornerScore();
    });
  }
  dom.saveBtn?.addEventListener('click', saveHotspots);
  dom.saveModalCloseBtn?.addEventListener('click', hideSaveModal);
  dom.saveModal?.addEventListener('click', (event) => {
    if (event.target === event.currentTarget) hideSaveModal();
  });
}

function initializeScene() {
  const restoredDiscordLoginFlowState = consumeDiscordLoginFlowState();
  const saveResultFlash = consumeSaveResultFlash();
  state.hotspots = sourceHotspotsToRuntime(defaultHotspots);
  measureSyncSection('naimean-create-scene-tiles', createSceneTiles);
  measureSyncSection('naimean-create-overlays', createOverlays);
  syncStoredCommodorePowerState();
  syncDiscordAuthBodyClass();
  syncDiscordButtonUi();
  syncLoginOverlayUi();
  if (restoredDiscordLoginFlowState?.showLogin) {
    state._cb.setLeftMonitorState?.('login');
    if (restoredDiscordLoginFlowState.restorePowerOn && !state.isCommodorePoweringOn) {
      state._cb.triggerCommodorePowerOnSequence?.();
    }
  }
  measureSyncSection('naimean-render-hotspots', renderHotspotLayers);
  if (useLiteRendering) document.body.classList.add('lite-rendering');
  measureSyncSection('naimean-initial-resize', resize);
  if (saveResultFlash && dom.debugStatus) dom.debugStatus.textContent = saveResultFlash;
  hydrateHotspotsFromServer({ hasSaveResultFlash: Boolean(saveResultFlash) });
  scheduleNonCriticalTask(hydrateNonCriticalSceneData);
}

function markSceneReady() {
  const TILE_LOAD_TIMEOUT_MS = 3000;

  const revealScene = () => {
    window.requestAnimationFrame(() => {
      document.body.classList.remove('scene-loading');
      document.body.classList.add('scene-ready');
      window.dispatchEvent(new Event('naimean-scene-ready'));
    });
  };

  // Wait for the initially-visible tile to finish loading before revealing the
  // scene. DESK_CENTER_X falls in tile index 1 (den_computer) on all devices.
  const initialTileIndex = Math.floor(DESK_CENTER_X / TILE_WIDTH);
  const tileImgs = dom.sceneLayer?.querySelectorAll('.scene-tile img');
  const initialTileImg = tileImgs?.[initialTileIndex];

  if (!initialTileImg || initialTileImg.complete) {
    revealScene();
    return;
  }

  let revealed = false;
  const timeoutId = window.setTimeout(() => {
    if (!revealed) {
      revealed = true;
      revealScene();
    }
  }, TILE_LOAD_TIMEOUT_MS);

  const onSettled = () => {
    if (!revealed) {
      revealed = true;
      window.clearTimeout(timeoutId);
      revealScene();
    }
  };

  initialTileImg.addEventListener('load', onSettled, { once: true });
  initialTileImg.addEventListener('error', onSettled, { once: true });
}

function initScene() {
  bindSceneEvents();
  initializeScene();
}

function bootstrapScene() {
  state.isCommodorePoweringOn = loadCommodorePowerState();
  state.saveBadge = dom.saveBtn && window.makeSyncBadge ? window.makeSyncBadge(dom.saveBtn) : null;
  initScene();
  markSceneReady();
}

state._cb.renderHotspotLayers = renderHotspotLayers;
state._cb.renderAquariumFishEffect = createAquariumFishEffect;
state._cb.rerenderAquariumFishEffectPreservingDepthOverlays = rerenderAquariumFishEffectPreservingDepthOverlays;
state._cb.resize = resize;
installAquariumWildlifeApi();

export {
  applyTransforms,
  setCameraX,
  setTargetCameraX,
  startCameraAnimation,
  tickCamera,
  stopMomentum,
  shouldUseMomentum,
  startMomentum,
  resize,
  onWheel,
  startDebugEdit,
  applyDebugEdit,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onKeyDown,
  setDebugMode,
  toggleDebugMode,
  onDebugButtonClick,
  renderHotspotLayers,
  rerenderAquariumFishEffectPreservingDepthOverlays,
  initializeScene,
  cleanup,
  initScene,
  markSceneReady,
  bootstrapScene
};
