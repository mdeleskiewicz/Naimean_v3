import {
  COMMODORE_HITBOX_HORIZONTAL_INSET,
  COMMODORE_HITBOX_VERTICAL_INSET,
  COMMODORE_MIN_SOURCE_HITBOX_HEIGHT,
  COMMODORE_MIN_SOURCE_HITBOX_WIDTH,
  FIRST_TILE_HOTSPOT_IDS,
  MIN_HOTSPOT_SIZE,
  MIN_MONITOR_RATIO_DENOMINATOR,
  SCENE_OFFSET_X
} from './constants.js';

export function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
}

export function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export function scheduleNonCriticalTask(callback, { timeout = 1500 } = {}) {
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(callback, { timeout });
    return;
  }
  window.requestAnimationFrame(() => {
    window.setTimeout(callback, 0);
  });
}

export function shuffleArrayInPlace(values) {
  for (let index = values.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [values[index], values[randomIndex]] = [values[randomIndex], values[index]];
  }
}

export function isTextEntryTarget(target) {
  if (!(target instanceof Element)) {
    return false;
  }
  return Boolean(target.closest('input, textarea, [contenteditable]'));
}

export function sourceHotspotXToRuntime(id, x) {
  return FIRST_TILE_HOTSPOT_IDS.has(id) ? x : x + SCENE_OFFSET_X;
}

export function runtimeHotspotXToSource(id, x) {
  return FIRST_TILE_HOTSPOT_IDS.has(id) ? x : x - SCENE_OFFSET_X;
}

export function sourceHotspotsToRuntime(sourceHotspots) {
  return sourceHotspots.map((spot) => {
    const runtimeSpot = {
      ...spot,
      x: sourceHotspotXToRuntime(spot.id, spot.x)
    };
    if (spot.id === 'overlay-commodore-screen-control') {
      runtimeSpot.w = Math.max(COMMODORE_MIN_SOURCE_HITBOX_WIDTH, runtimeSpot.w);
      runtimeSpot.x += COMMODORE_HITBOX_HORIZONTAL_INSET;
      runtimeSpot.w -= COMMODORE_HITBOX_HORIZONTAL_INSET * 2;
      runtimeSpot.h = Math.max(COMMODORE_MIN_SOURCE_HITBOX_HEIGHT, runtimeSpot.h);
      runtimeSpot.y += COMMODORE_HITBOX_VERTICAL_INSET;
      runtimeSpot.h -= COMMODORE_HITBOX_VERTICAL_INSET * 2;
    }
    runtimeSpot.w = Math.max(MIN_HOTSPOT_SIZE, runtimeSpot.w);
    runtimeSpot.h = Math.max(MIN_HOTSPOT_SIZE, runtimeSpot.h);
    return runtimeSpot;
  });
}

export function frameBoundsToScreenBounds(frameBounds, insets) {
  const usableWidthRatio = Math.max(MIN_MONITOR_RATIO_DENOMINATOR, 1 - insets.left - insets.right);
  const usableHeightRatio = Math.max(MIN_MONITOR_RATIO_DENOMINATOR, 1 - insets.top - insets.bottom);
  const x = frameBounds.x + (frameBounds.w * insets.left);
  const y = frameBounds.y + (frameBounds.h * insets.top);
  const w = frameBounds.w * usableWidthRatio;
  const h = frameBounds.h * usableHeightRatio;
  return {
    x: Math.round(x),
    y: Math.round(y),
    w: Math.round(w),
    h: Math.round(h)
  };
}

let performanceMeasureToken = 0;

export function measureSyncSection(name, callback) {
  const perfApi = window.performance;
  if (!perfApi?.mark || !perfApi?.measure) {
    return callback();
  }
  performanceMeasureToken += 1;
  const token = performanceMeasureToken;
  const startMark = `${name}-start-${token}`;
  const endMark = `${name}-end-${token}`;
  perfApi.mark(startMark);
  try {
    return callback();
  } finally {
    perfApi.mark(endMark);
    perfApi.measure(name, startMark, endMark);
  }
}
