import {
  AQUARIUM_DEPTH_OVERLAY_HEIGHT_RATIO,
  AQUARIUM_DEPTH_OVERLAY_LEFT_ID,
  AQUARIUM_DEPTH_OVERLAY_LEFT_OFFSET_RATIO,
  AQUARIUM_DEPTH_OVERLAY_RIGHT_ID,
  AQUARIUM_DEPTH_OVERLAY_RIGHT_OFFSET_RATIO,
  AQUARIUM_DEPTH_OVERLAY_TOP_RATIO,
} from './constants.js';

const MIN_AQUARIUM_DEPTH_OVERLAY_SIZE = 20;

export function getAquariumDepthOverlayId(side) {
  return side === 'left' ? AQUARIUM_DEPTH_OVERLAY_LEFT_ID : AQUARIUM_DEPTH_OVERLAY_RIGHT_ID;
}

export function createDefaultAquariumDepthOverlayLayout(side, width, height) {
  const horizontalOffsetRatio = side === 'left'
    ? AQUARIUM_DEPTH_OVERLAY_LEFT_OFFSET_RATIO
    : AQUARIUM_DEPTH_OVERLAY_RIGHT_OFFSET_RATIO;
  return {
    id: getAquariumDepthOverlayId(side),
    x: Math.round(width * horizontalOffsetRatio),
    y: Math.round(height * AQUARIUM_DEPTH_OVERLAY_TOP_RATIO),
    w: Math.max(MIN_AQUARIUM_DEPTH_OVERLAY_SIZE, Math.round(width)),
    h: Math.max(MIN_AQUARIUM_DEPTH_OVERLAY_SIZE, Math.round(height * AQUARIUM_DEPTH_OVERLAY_HEIGHT_RATIO))
  };
}

export function normalizeAquariumDepthOverlayLayout(layout, side, width, height) {
  const fallback = createDefaultAquariumDepthOverlayLayout(side, width, height);
  const x = typeof layout?.x === 'number' && Number.isFinite(layout.x) ? Math.round(layout.x) : fallback.x;
  const y = typeof layout?.y === 'number' && Number.isFinite(layout.y) ? Math.round(layout.y) : fallback.y;
  const w = typeof layout?.w === 'number' && Number.isFinite(layout.w)
    ? Math.max(MIN_AQUARIUM_DEPTH_OVERLAY_SIZE, Math.round(layout.w))
    : fallback.w;
  const h = typeof layout?.h === 'number' && Number.isFinite(layout.h)
    ? Math.max(MIN_AQUARIUM_DEPTH_OVERLAY_SIZE, Math.round(layout.h))
    : fallback.h;
  return { id: fallback.id, x, y, w, h };
}

export function applyAquariumDepthOverlayLayout(depthOverlayEl, layout) {
  depthOverlayEl.style.left = `${Math.round(layout.x)}px`;
  depthOverlayEl.style.top = `${Math.round(layout.y)}px`;
  depthOverlayEl.style.width = `${Math.round(layout.w)}px`;
  depthOverlayEl.style.height = `${Math.round(layout.h)}px`;
}
