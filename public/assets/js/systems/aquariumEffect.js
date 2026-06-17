function getAquariumShrimpCount() {
  const roll = Math.random();
  if (roll < 0.4) return 3;
  if (roll < 0.8) return 4;
  if (roll < 0.95) return 5;
  return 6;
}

function resolveAquariumHorizontalMotion({
  tankWidthPx,
  startLeftPct,
  creatureWidthPx = 0,
  swimDistPx = 0,
  swimsRight = true,
  edgePaddingPx = 8,
  allowDirectionFlip = true,
} = {}) {
  const tankWidth = Number.isFinite(tankWidthPx) ? Math.max(0, tankWidthPx) : 0;
  const creatureWidth = Number.isFinite(creatureWidthPx) ? Math.max(0, creatureWidthPx) : 0;
  const edgePadding = Number.isFinite(edgePaddingPx) ? Math.max(0, edgePaddingPx) : 0;
  const requestedStartLeftPx = Number.isFinite(startLeftPct) ? (startLeftPct / 100) * tankWidth : 0;
  const requestedSwimDistPx = Number.isFinite(swimDistPx) ? Math.max(0, swimDistPx) : 0;
  const maxLeftPx = Math.max(0, tankWidth - creatureWidth);
  const minLeftPx = Math.min(edgePadding, maxLeftPx);
  const boundedMaxLeftPx = Math.max(minLeftPx, maxLeftPx - edgePadding);
  const startLeftPx = Math.min(Math.max(requestedStartLeftPx, minLeftPx), boundedMaxLeftPx);
  const leftRoomPx = Math.max(0, startLeftPx - edgePadding);
  const rightRoomPx = Math.max(0, tankWidth - edgePadding - creatureWidth - startLeftPx);

  let directionRight = swimsRight !== false;
  let availableRoomPx = directionRight ? rightRoomPx : leftRoomPx;
  const oppositeRoomPx = directionRight ? leftRoomPx : rightRoomPx;

  if (allowDirectionFlip && requestedSwimDistPx > availableRoomPx && oppositeRoomPx > availableRoomPx) {
    directionRight = !directionRight;
    availableRoomPx = oppositeRoomPx;
  }

  return {
    startLeftPct: tankWidth > 0 ? Number(((startLeftPx / tankWidth) * 100).toFixed(2)) : 0,
    swimDistPx: Math.max(0, Math.round(Math.min(requestedSwimDistPx, availableRoomPx))),
    swimsRight: directionRight,
  };
}

export { getAquariumShrimpCount, resolveAquariumHorizontalMotion };
