function getAquariumShrimpCount() {
  const roll = Math.random();
  if (roll < 0.4) return 3;
  if (roll < 0.8) return 4;
  if (roll < 0.95) return 5;
  return 6;
}

function getRandomAquariumDepthLayer() {
  return Math.random() < 0.5 ? 'back' : 'front';
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
  let startLeftPx = Math.min(Math.max(requestedStartLeftPx, minLeftPx), boundedMaxLeftPx);

  const getRooms = (leftPx) => ({
    leftRoomPx: Math.max(0, leftPx - edgePadding),
    rightRoomPx: Math.max(0, tankWidth - edgePadding - creatureWidth - leftPx),
  });

  let { leftRoomPx, rightRoomPx } = getRooms(startLeftPx);
  let directionRight = swimsRight !== false;
  let availableRoomPx = directionRight ? rightRoomPx : leftRoomPx;
  const oppositeRoomPx = directionRight ? leftRoomPx : rightRoomPx;

  if (allowDirectionFlip && requestedSwimDistPx > availableRoomPx && oppositeRoomPx > availableRoomPx) {
    directionRight = !directionRight;
  }

  if (directionRight) {
    const maxStartForRequestedTravelPx = tankWidth - edgePadding - creatureWidth - requestedSwimDistPx;
    startLeftPx = Math.max(minLeftPx, Math.min(startLeftPx, Math.min(boundedMaxLeftPx, maxStartForRequestedTravelPx)));
  } else {
    const minStartForRequestedTravelPx = edgePadding + requestedSwimDistPx;
    startLeftPx = Math.min(boundedMaxLeftPx, Math.max(startLeftPx, Math.max(minLeftPx, minStartForRequestedTravelPx)));
  }

  ({ leftRoomPx, rightRoomPx } = getRooms(startLeftPx));
  availableRoomPx = directionRight ? rightRoomPx : leftRoomPx;

  return {
    startLeftPct: tankWidth > 0 ? Number(((startLeftPx / tankWidth) * 100).toFixed(2)) : 0,
    swimDistPx: Math.max(0, Math.round(Math.min(requestedSwimDistPx, availableRoomPx))),
    swimsRight: directionRight,
    depthLayer: getRandomAquariumDepthLayer(),
  };
}

export {
  getAquariumShrimpCount,
  getRandomAquariumDepthLayer,
  resolveAquariumHorizontalMotion,
};
