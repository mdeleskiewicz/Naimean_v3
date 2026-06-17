import {
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
import { clamp, isTextEntryTarget, measureSyncSection, scheduleNonCriticalTask, sourceHotspotsToRuntime } from '../core/utils.js';
import { createOverlays } from '../ui/overlays.js';
import { consumeDiscordLoginFlowState, syncDiscordAuthBodyClass, syncDiscordButtonUi, syncLoginOverlayUi } from './login.js';
import { loadCommodorePowerState, syncStoredCommodorePowerState, handlePageShow, cancelMonitorPowerTimeouts } from './monitors.js';
import { playWrongAudio, syncCornerScoreServerToLocalMad, unlockCornerScoreScoringAudioFromGesture } from './cornerScore.js';
import { adjustDvdSpeed, stopBigTvDvdAnimation } from './dvd.js';
import { stopRadioTuningLoopPlayback } from './flipClock.js';
import { createHotspots, getRuntimeHotspotById, syncControlledOverlaysFromHotspots, consumeSaveResultFlash, hydrateHotspotsFromServer, hydrateNonCriticalSceneData, refreshDebugObjectActions, refreshDebugObjectSelectOptions, setHotspotDebugLockState, getSelectedDebugHotspotElement, saveDenUrlOverride, saveHotspots, hideSaveModal, encodeDebugSavePassword, hasMatchingDebugSaveCipher, ensureDebugSaveAccess } from './hotspots.js';
import { getAquariumShrimpCount } from './aquariumEffect.js';

const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
const isIOSDevice =
  /iPad|iPhone|iPod/.test(window.navigator.userAgent) ||
  (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
const useLiteRendering = isIOSDevice || hasCoarsePointer;
let sceneEventsBound = false;

const AQUARIUM_DISNEY_CHARACTER_SPECS = Object.freeze([
  {
    name: 'Nemo & Marlin',
    palette: Object.freeze({
      k: '#161616',
      o: '#ff7a00',
      w: '#fff4e0'
    }),
    pixels: Object.freeze([
      '....................',
      '..koook.....koook...',
      '.koowook...koowook..',
      'koowwoook.koowwoook.',
      'koowwoook.koowwoook.',
      '.koowook...koowook..',
      '..koook.....koook...',
      '....kk.......kk.....'
    ]),
    leftPct: 5,
    topPct: 19,
    widthPx: 58,
    swimDistPx: 170,
    durationSec: 12.4,
    delaySec: -1.8,
    bobA: -5,
    bobB: 4,
    bobC: -3
  },
  {
    name: 'Dory',
    palette: Object.freeze({
      k: '#162748',
      b: '#2f7cff',
      y: '#ffd54a'
    }),
    pixels: Object.freeze([
      '................',
      '....kbbbbbyy....',
      '..kbbbbbbbyyyy..',
      '.kbbbkbbbbyyyyy.',
      'kbbbbkbbbbyyyyyy',
      '.kbbbkbbbbyyyyy.',
      '..kbbbbbbbyyyy..',
      '....kbbbbbyy....'
    ]),
    leftPct: 8,
    topPct: 34,
    widthPx: 42,
    swimDistPx: 212,
    durationSec: 15.6,
    delaySec: -6.2,
    bobA: -6,
    bobB: 5,
    bobC: -4
  },
  {
    name: 'Flounder',
    palette: Object.freeze({
      y: '#ffe347',
      b: '#2b71ff'
    }),
    pixels: Object.freeze([
      '................',
      '....yyyyyyyy....',
      '..yybbyyyybbyy..',
      '.yybbbyyybbbbyy.',
      'yybbbbyyyybbbbby',
      '.yybbbyyybbbbyy.',
      '..yybbyyyybbyy..',
      '....yyyyyyyy....'
    ]),
    leftPct: 11,
    topPct: 55,
    widthPx: 46,
    swimDistPx: 194,
    durationSec: 13.7,
    delaySec: -3.1,
    bobA: -4,
    bobB: 3,
    bobC: -3
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
    const avifSource = document.createElement('source');
    avifSource.type = 'image/avif';
    avifSource.srcset = sources.avif;
    const webpSource = document.createElement('source');
    webpSource.type = 'image/webp';
    webpSource.srcset = sources.webp;
    const image = document.createElement('img');
    image.src = sources.png;
    image.alt = '';
    image.loading = index === 0 ? 'eager' : 'lazy';
    tile.append(avifSource, webpSource, image);
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
  const el = document.createElement('div');
  el.id = AQUARIUM_FISH_EFFECT_ID;
  el.className = 'aquarium-fish-effect';
  el.style.left = `${Math.round(spot.x)}px`;
  el.style.top = `${Math.round(spot.y)}px`;
  el.style.width = `${Math.round(spot.w)}px`;
  el.style.height = `${Math.round(spot.h)}px`;

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
  const shrimpHues = [0, 22, 55, 115, 200, 260, 330];
  const shrimpHuePool = createShuffledCopy(shrimpHues);
  const shrimpCount = getAquariumShrimpCount();
  const slotHeight = 23 / shrimpCount;
  const shrimpSizeTiers = [10, 14, 20, 26, 31];
  for (let i = 0; i < shrimpCount; i++) {
    const slotStart = 67 + i * slotHeight;
    const top = Math.floor(slotStart + Math.random() * (slotHeight * 0.7));
    const size = shrimpSizeTiers[Math.floor(Math.random() * shrimpSizeTiers.length)] + Math.floor(Math.random() * 3);
    const swimDist = 85 + Math.floor(Math.random() * 65);
    const duration = 30 + Math.random() * 24;
    const delay = -(Math.random() * duration);
    const hue = shrimpHuePool[i % shrimpHuePool.length];
    const shrimp = document.createElement('span');
    shrimp.className = 'aquarium-shrimp';
    shrimp.textContent = '🦐';
    shrimp.style.fontSize = `${size}px`;
    shrimp.style.top = `${top}%`;
    shrimp.style.left = '4%';
    shrimp.style.filter = `hue-rotate(${hue}deg)`;
    shrimp.style.setProperty('--shrimp-swim-dist', `${swimDist}px`);
    shrimp.style.setProperty('--shrimp-duration', `${duration.toFixed(2)}s`);
    shrimp.style.setProperty('--shrimp-delay', `${delay.toFixed(2)}s`);
    el.appendChild(shrimp);
  }

  const disneyFishPool = createShuffledCopy(AQUARIUM_DISNEY_CHARACTER_SPECS);

  // Special guest: one random sea creature/item per load.
  const guests = ['snail', 'starfish', 'turtle', 'jellyfish', 'nautilus', 'octopus', 'frog', 'manta-ray', 'shark', 'electric-eel', 'moray-eel', 'bubble-chest', 'coral', 'anemone', 'toy-diver', 'cthulhu-bubbler', 'skull-bubbler'];
  const guestType = guests[Math.floor(Math.random() * guests.length)];

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
    snail.style.left = `${left}%`;
    snail.style.setProperty('--snail-crawl-dist', `${crawlDist}px`);
    snail.style.setProperty('--snail-duration', `${duration.toFixed(2)}s`);
    snail.style.setProperty('--snail-delay', `${delay.toFixed(2)}s`);
    el.appendChild(snail);
  } else if (guestType === 'starfish') {
    const size = 22 + Math.floor(Math.random() * 12);
    const left = 20 + Math.floor(Math.random() * 55);
    const duration = 18 + Math.random() * 10;
    const delay = Math.random() * 7;
    const star = document.createElement('span');
    star.className = 'aquarium-starfish';
    star.textContent = '⭐';
    star.style.fontSize = `${size}px`;
    star.style.bottom = '6%';
    star.style.left = `${left}%`;
    star.style.setProperty('--starfish-duration', `${duration.toFixed(2)}s`);
    star.style.setProperty('--starfish-delay', `${delay.toFixed(2)}s`);
    el.appendChild(star);
  } else if (guestType === 'turtle') {
    const size = 30 + Math.floor(Math.random() * 12);
    const top = 30 + Math.floor(Math.random() * 35);
    const swimDist = 150 + Math.floor(Math.random() * 100);
    const duration = 20 + Math.random() * 14;
    const delay = -(Math.random() * duration);
    const turtle = document.createElement('span');
    turtle.className = 'aquarium-turtle';
    turtle.textContent = '🐢';
    turtle.style.fontSize = `${size}px`;
    turtle.style.top = `${top}%`;
    turtle.style.left = '5%';
    turtle.style.setProperty('--turtle-swim-dist', `${swimDist}px`);
    turtle.style.setProperty('--turtle-duration', `${duration.toFixed(2)}s`);
    turtle.style.setProperty('--turtle-delay', `${delay.toFixed(2)}s`);
    el.appendChild(turtle);
  } else if (guestType === 'jellyfish') {
    const size = 24 + Math.floor(Math.random() * 14);
    const left = 15 + Math.floor(Math.random() * 65);
    const driftAmt = 30 + Math.floor(Math.random() * 30);
    const duration = 6 + Math.random() * 5;
    const delay = Math.random() * 4;
    const jelly = document.createElement('span');
    jelly.className = 'aquarium-jellyfish';
    jelly.textContent = '🪼';
    jelly.style.fontSize = `${size}px`;
    jelly.style.top = `${15 + Math.floor(Math.random() * 50)}%`;
    jelly.style.left = `${left}%`;
    jelly.style.setProperty('--jelly-drift', `${driftAmt}px`);
    jelly.style.setProperty('--jelly-duration', `${duration.toFixed(2)}s`);
    jelly.style.setProperty('--jelly-delay', `${delay.toFixed(2)}s`);
    el.appendChild(jelly);
  } else if (guestType === 'nautilus') {
    const size = 26 + Math.floor(Math.random() * 12);
    const top = 25 + Math.floor(Math.random() * 40);
    const swimDist = 160 + Math.floor(Math.random() * 100);
    const duration = 18 + Math.random() * 12;
    const delay = -(Math.random() * duration);
    const nautilus = document.createElement('span');
    nautilus.className = 'aquarium-nautilus';
    nautilus.textContent = '🐚';
    nautilus.style.fontSize = `${size}px`;
    nautilus.style.top = `${top}%`;
    nautilus.style.left = '8%';
    nautilus.style.setProperty('--nautilus-swim-dist', `${swimDist}px`);
    nautilus.style.setProperty('--nautilus-duration', `${duration.toFixed(2)}s`);
    nautilus.style.setProperty('--nautilus-delay', `${delay.toFixed(2)}s`);
    el.appendChild(nautilus);
  } else if (guestType === 'octopus') {
    const size = 28 + Math.floor(Math.random() * 14);
    const top = 20 + Math.floor(Math.random() * 50);
    const swimDist = 180 + Math.floor(Math.random() * 110);
    const duration = 14 + Math.random() * 10;
    const delay = -(Math.random() * duration);
    const octopus = document.createElement('span');
    octopus.className = 'aquarium-octopus';
    octopus.textContent = '🐙';
    octopus.style.fontSize = `${size}px`;
    octopus.style.top = `${top}%`;
    octopus.style.left = '5%';
    octopus.style.setProperty('--octopus-swim-dist', `${swimDist}px`);
    octopus.style.setProperty('--octopus-duration', `${duration.toFixed(2)}s`);
    octopus.style.setProperty('--octopus-delay', `${delay.toFixed(2)}s`);
    el.appendChild(octopus);
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
    frog.style.left = `${left}%`;
    frog.style.setProperty('--frog-hop-dist', `${hopDist}px`);
    frog.style.setProperty('--frog-duration', `${duration.toFixed(2)}s`);
    frog.style.setProperty('--frog-delay', `${delay.toFixed(2)}s`);
    el.appendChild(frog);
  } else if (guestType === 'manta-ray') {
    const size = 22 + Math.floor(Math.random() * 10);
    const top = 20 + Math.floor(Math.random() * 45);
    const swimDist = 200 + Math.floor(Math.random() * 120);
    const duration = 22 + Math.random() * 14;
    const delay = -(Math.random() * duration);
    const manta = document.createElement('span');
    manta.className = 'aquarium-manta-ray';
    manta.textContent = '🐡';
    manta.style.fontSize = `${size}px`;
    manta.style.top = `${top}%`;
    manta.style.left = '3%';
    manta.style.setProperty('--manta-swim-dist', `${swimDist}px`);
    manta.style.setProperty('--manta-duration', `${duration.toFixed(2)}s`);
    manta.style.setProperty('--manta-delay', `${delay.toFixed(2)}s`);
    el.appendChild(manta);
  } else if (guestType === 'shark') {
    const size = 20 + Math.floor(Math.random() * 8);
    const top = 15 + Math.floor(Math.random() * 50);
    const swimDist = 220 + Math.floor(Math.random() * 130);
    const duration = 12 + Math.random() * 8;
    const delay = -(Math.random() * duration);
    const shark = document.createElement('span');
    shark.className = 'aquarium-shark';
    shark.textContent = '🦈';
    shark.style.fontSize = `${size}px`;
    shark.style.top = `${top}%`;
    shark.style.left = '2%';
    shark.style.setProperty('--shark-swim-dist', `${swimDist}px`);
    shark.style.setProperty('--shark-duration', `${duration.toFixed(2)}s`);
    shark.style.setProperty('--shark-delay', `${delay.toFixed(2)}s`);
    el.appendChild(shark);
  } else if (guestType === 'electric-eel') {
    const size = 22 + Math.floor(Math.random() * 10);
    const top = 30 + Math.floor(Math.random() * 40);
    const swimDist = 190 + Math.floor(Math.random() * 100);
    const duration = 16 + Math.random() * 10;
    const delay = -(Math.random() * duration);
    const eel = document.createElement('span');
    eel.className = 'aquarium-electric-eel';
    eel.textContent = '🐍';
    eel.style.fontSize = `${size}px`;
    eel.style.top = `${top}%`;
    eel.style.left = '4%';
    eel.style.setProperty('--electric-eel-swim-dist', `${swimDist}px`);
    eel.style.setProperty('--electric-eel-duration', `${duration.toFixed(2)}s`);
    eel.style.setProperty('--electric-eel-delay', `${delay.toFixed(2)}s`);
    el.appendChild(eel);
  } else if (guestType === 'moray-eel') {
    const size = 24 + Math.floor(Math.random() * 10);
    const top = 35 + Math.floor(Math.random() * 35);
    const swimDist = 170 + Math.floor(Math.random() * 90);
    const duration = 18 + Math.random() * 10;
    const delay = -(Math.random() * duration);
    const moray = document.createElement('span');
    moray.className = 'aquarium-moray-eel';
    moray.textContent = '🐍';
    moray.style.fontSize = `${size}px`;
    moray.style.top = `${top}%`;
    moray.style.left = '6%';
    moray.style.setProperty('--moray-swim-dist', `${swimDist}px`);
    moray.style.setProperty('--moray-duration', `${duration.toFixed(2)}s`);
    moray.style.setProperty('--moray-delay', `${delay.toFixed(2)}s`);
    el.appendChild(moray);
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
    const swimDist = 150 + Math.floor(Math.random() * 90);
    const duration = 15 + Math.random() * 10;
    const delay = -(Math.random() * duration);
    const diver = document.createElement('span');
    diver.className = 'aquarium-toy-diver';
    diver.textContent = '🤿';
    diver.style.fontSize = `${size}px`;
    diver.style.top = `${top}%`;
    diver.style.left = '6%';
    diver.style.setProperty('--toy-diver-swim-dist', `${swimDist}px`);
    diver.style.setProperty('--toy-diver-duration', `${duration.toFixed(2)}s`);
    diver.style.setProperty('--toy-diver-delay', `${delay.toFixed(2)}s`);
    el.appendChild(diver);
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
  const allFishConfigs = [
    {
      widthPx: 40 + Math.floor(Math.random() * 8),
      topPct: 22 + Math.floor(Math.random() * 28),
      leftPct: 5,
      swimDistPx: 180 + Math.floor(Math.random() * 100),
      durationSec: 9 + Math.random() * 6,
      delaySec: 0
    },
    {
      widthPx: 38 + Math.floor(Math.random() * 8),
      topPct: 30 + Math.floor(Math.random() * 30),
      leftPct: 7,
      swimDistPx: 170 + Math.floor(Math.random() * 110),
      durationSec: 10 + Math.random() * 7,
      delaySec: 0
    }
  ];
  const leadingFishConfigs = allFishConfigs.slice(0, 1);
  for (const fishConfig of leadingFishConfigs) {
    fishConfig.delaySec = -(Math.random() * fishConfig.durationSec);
    appendAquariumDisneyFish(el, disneyFishPool, fishConfig);
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

  dom.effectsLayer.appendChild(el);

  state.overlayElementsById.set(AQUARIUM_FISH_EFFECT_ID, el);
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
  const MIN_SIZE = 20;
  if (state.debugEditType === 'move') {
    el.style.left = `${left + dx}px`;
    el.style.top = `${top + dy}px`;
  } else {
    const dir = state.debugEditDir;
    let newLeft = left; let newTop = top; let newW = w; let newH = h;
    if (dir.includes('e')) newW = Math.max(MIN_SIZE, w + dx);
    if (dir.includes('w')) { const clampedW = Math.max(MIN_SIZE, w - dx); newLeft = left + (w - clampedW); newW = clampedW; }
    if (dir.includes('s')) newH = Math.max(MIN_SIZE, h + dy);
    if (dir.includes('n')) { const clampedH = Math.max(MIN_SIZE, h - dy); newTop = top + (h - clampedH); newH = clampedH; }
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
    }
    const hotspotEl = event.target.closest('.hotspot');
    if (hotspotEl && !hotspotEl.classList.contains('locked-debug-hotspot')) {
      startDebugEdit(event, hotspotEl, 'move', null);
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
  window.requestAnimationFrame(() => {
    document.body.classList.remove('scene-loading');
    document.body.classList.add('scene-ready');
  });
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
state._cb.resize = resize;

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
  initializeScene,
  cleanup,
  initScene,
  markSceneReady,
  bootstrapScene
};
