function getAquariumShrimpCount() {
  const roll = Math.random();
  if (roll < 0.4) return 3;
  if (roll < 0.8) return 4;
  if (roll < 0.95) return 5;
  return 6;
}

export { getAquariumShrimpCount };
