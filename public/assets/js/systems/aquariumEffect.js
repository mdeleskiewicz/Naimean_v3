function getAquariumShrimpCount() {
  const roll = Math.random();
  if (roll < 0.33) return 2;
  if (roll < 0.67) return 3;
  return 4;
}

export { getAquariumShrimpCount };
