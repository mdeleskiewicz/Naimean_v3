import {
  AQUARIUM_DEPTH_OVERLAY_HEIGHT_RATIO,
  AQUARIUM_DEPTH_OVERLAY_LEFT_OFFSET_RATIO,
  AQUARIUM_DEPTH_OVERLAY_RIGHT_OFFSET_RATIO,
  AQUARIUM_DEPTH_OVERLAY_TOP_RATIO,
} from './constants.js';

export function applyAquariumDepthOverlayLayout(depthOverlayEl, side, width, height) {
  const horizontalOffsetRatio = side === 'left'
    ? AQUARIUM_DEPTH_OVERLAY_LEFT_OFFSET_RATIO
    : AQUARIUM_DEPTH_OVERLAY_RIGHT_OFFSET_RATIO;
  depthOverlayEl.style.left = `${Math.round(width * horizontalOffsetRatio)}px`;
  depthOverlayEl.style.top = `${Math.round(height * AQUARIUM_DEPTH_OVERLAY_TOP_RATIO)}px`;
  depthOverlayEl.style.width = `${Math.round(width)}px`;
  depthOverlayEl.style.height = `${Math.round(height * AQUARIUM_DEPTH_OVERLAY_HEIGHT_RATIO)}px`;
}
