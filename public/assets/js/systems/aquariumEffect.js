function getAquariumShrimpCount() {
  const roll = Math.random();
  if (roll < 0.4) return 5;
  if (roll < 0.8) return 6;
  if (roll < 0.95) return 7;
  return 8;
}

export { getAquariumShrimpCount };
