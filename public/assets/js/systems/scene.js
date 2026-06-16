import {
  AQUARIUM_FISH_EFFECT_ID,
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
import { playWrongAudio, unlockCornerScoreScoringAudioFromGesture } from './cornerScore.js';
import { adjustDvdSpeed, stopBigTvDvdAnimation } from './dvd.js';
import { stopRadioTuningLoopPlayback } from './flipClock.js';
import { createHotspots, getRuntimeHotspotById, syncControlledOverlaysFromHotspots, consumeSaveResultFlash, hydrateHotspotsFromServer, hydrateNonCriticalSceneData, refreshDebugObjectActions, refreshDebugObjectSelectOptions, setHotspotDebugLockState, getSelectedDebugHotspotElement, saveDenUrlOverride, saveHotspots, hideSaveModal, encodeDebugSavePassword, hasMatchingDebugSaveCipher } from './hotspots.js';

const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
const isIOSDevice =
  /iPad|iPhone|iPod/.test(window.navigator.userAgent) ||
  (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
const useLiteRendering = isIOSDevice || hasCoarsePointer;
let sceneEventsBound = false;

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
  const spot = getRuntimeHotspotById('aquarium');
  if (!spot) return;
  const el = document.createElement('div');
  el.id = AQUARIUM_FISH_EFFECT_ID;
  el.className = 'aquarium-fish-effect';
  el.style.left = `${Math.round(spot.x)}px`;
  el.style.top = `${Math.round(spot.y)}px`;
  el.style.width = `${Math.round(spot.w)}px`;
  el.style.height = `${Math.round(spot.h)}px`;

  const rng = () => Math.random();

  // Filter bubbles: main cluster in the lower-right (filter), plus a few scattered bubbles
  const bubbleCount = 10 + Math.floor(rng() * 9); // 10–18 bubbles
  for (let i = 0; i < bubbleCount; i++) {
    // Most bubbles stay in the right-side filter cluster, a few scatter elsewhere
    const inCluster = i < 8 || rng() < 0.55;
    const leftPct = inCluster
      ? 74 + rng() * 17           // 74–91 %
      : 15 + rng() * 55;          // 15–70 % (scattered)
    const bottomPct = 2 + rng() * 6;
    const size = 3 + Math.floor(rng() * 7);  // 3–9 px
    const rise = 510 + Math.floor(rng() * 160);
    const wobble = (rng() < 0.5 ? -1 : 1) * (3 + Math.floor(rng() * 8));
    const duration = 4.4 + rng() * 3.6;
    const delay = rng() * 5.5;
    const bubble = document.createElement('span');
    bubble.className = 'aquarium-bubble';
    bubble.style.width = `${size}px`;
    bubble.style.height = `${size}px`;
    bubble.style.left = `${leftPct.toFixed(1)}%`;
    bubble.style.bottom = `${bottomPct.toFixed(1)}%`;
    bubble.style.setProperty('--bubble-rise', `${rise}px`);
    bubble.style.setProperty('--bubble-wobble', `${wobble}px`);
    bubble.style.setProperty('--bubble-duration', `${duration.toFixed(2)}s`);
    bubble.style.setProperty('--bubble-delay', `${delay.toFixed(2)}s`);
    el.appendChild(bubble);
  }

  // Shrimp: random count (2–5) at varied vertical depths
  const shrimpCount = 2 + Math.floor(rng() * 4); // 2–5
  const usedTops = [];
  for (let i = 0; i < shrimpCount; i++) {
    // Spread tops evenly with some jitter, avoiding collisions
    let top;
    let tries = 0;
    do {
      top = 15 + Math.floor(rng() * 68); // 15–82 %
      tries++;
    } while (tries < 20 && usedTops.some((t) => Math.abs(t - top) < 14));
    usedTops.push(top);
    const size = 18 + Math.floor(rng() * 14);   // 18–31 px
    const swimDist = 170 + Math.floor(rng() * 130); // 170–299 px
    const duration = 10 + rng() * 8;
    const delay = rng() * 8;
    const shrimp = document.createElement('span');
    shrimp.className = 'aquarium-shrimp';
    shrimp.textContent = '🦐';
    shrimp.style.fontSize = `${size}px`;
    shrimp.style.top = `${top}%`;
    shrimp.style.left = '4%';
    shrimp.style.setProperty('--shrimp-swim-dist', `${swimDist}px`);
    shrimp.style.setProperty('--shrimp-duration', `${duration.toFixed(2)}s`);
    shrimp.style.setProperty('--shrimp-delay', `${delay.toFixed(2)}s`);
    el.appendChild(shrimp);
  }

  // Special guest: one random creature per load
  const guests = ['snail', 'starfish', 'betta', 'turtle', 'jellyfish'];
  const guestType = guests[Math.floor(rng() * guests.length)];

  if (guestType === 'snail') {
    // Crawls slowly along the bottom
    const size = 20 + Math.floor(rng() * 10);
    const left = 5 + Math.floor(rng() * 30);
    const crawlDist = 120 + Math.floor(rng() * 100);
    const duration = 22 + rng() * 14;
    const delay = rng() * 6;
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
    // Gently drifts near the sandy bottom
    const size = 22 + Math.floor(rng() * 12);
    const left = 20 + Math.floor(rng() * 55);
    const duration = 18 + rng() * 10;
    const delay = rng() * 7;
    const star = document.createElement('span');
    star.className = 'aquarium-starfish';
    star.textContent = '⭐';
    star.style.fontSize = `${size}px`;
    star.style.bottom = '6%';
    star.style.left = `${left}%`;
    star.style.setProperty('--starfish-duration', `${duration.toFixed(2)}s`);
    star.style.setProperty('--starfish-delay', `${delay.toFixed(2)}s`);
    el.appendChild(star);

  } else if (guestType === 'betta') {
    // Swims like a shrimp but with a random hue-rotate for color variety
    const size = 26 + Math.floor(rng() * 12);
    const top = 20 + Math.floor(rng() * 45);
    const swimDist = 190 + Math.floor(rng() * 110);
    const duration = 9 + rng() * 7;
    const delay = rng() * 5;
    const hue = Math.floor(rng() * 360);
    const betta = document.createElement('span');
    betta.className = 'aquarium-betta';
    betta.textContent = '🐠';
    betta.style.fontSize = `${size}px`;
    betta.style.top = `${top}%`;
    betta.style.left = '6%';
    betta.style.filter = `hue-rotate(${hue}deg)`;
    betta.style.setProperty('--betta-swim-dist', `${swimDist}px`);
    betta.style.setProperty('--betta-duration', `${duration.toFixed(2)}s`);
    betta.style.setProperty('--betta-delay', `${delay.toFixed(2)}s`);
    el.appendChild(betta);

  } else if (guestType === 'turtle') {
    // Plods slowly across the mid-tank
    const size = 30 + Math.floor(rng() * 12);
    const top = 30 + Math.floor(rng() * 35);
    const swimDist = 150 + Math.floor(rng() * 100);
    const duration = 20 + rng() * 14;
    const delay = rng() * 8;
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

  } else {
    // Jellyfish: pulses gently and drifts up and down
    const size = 24 + Math.floor(rng() * 14);
    const left = 15 + Math.floor(rng() * 65);
    const driftAmt = 30 + Math.floor(rng() * 30);
    const duration = 6 + rng() * 5;
    const delay = rng() * 4;
    const jelly = document.createElement('span');
    jelly.className = 'aquarium-jellyfish';
    jelly.textContent = '🪼';
    jelly.style.fontSize = `${size}px`;
    jelly.style.top = `${15 + Math.floor(rng() * 50)}%`;
    jelly.style.left = `${left}%`;
    jelly.style.setProperty('--jelly-drift', `${driftAmt}px`);
    jelly.style.setProperty('--jelly-duration', `${duration.toFixed(2)}s`);
    jelly.style.setProperty('--jelly-delay', `${delay.toFixed(2)}s`);
    el.appendChild(jelly);
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
  if (document.body.classList.contains('debug')) {
    setDebugMode(false);
    return;
  }
  const attempt = window.prompt('Password required.');
  if (attempt === null) {
    if (dom.debugStatus) dom.debugStatus.textContent = 'Debug cancelled.';
    return;
  }
  const isValid = hasMatchingDebugSaveCipher(encodeDebugSavePassword(attempt.trim()));
  if (!isValid) {
    if (dom.debugStatus) dom.debugStatus.textContent = 'Incorrect password.';
    playWrongAudio();
    return;
  }
  state.hasDebugSaveAccess = true;
  setDebugMode(true);
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
