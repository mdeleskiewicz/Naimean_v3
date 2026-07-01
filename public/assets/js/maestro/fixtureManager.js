/**
 * Fixture registry for MAESTRO v1.
 * These are outputs/subscribers, not primary navigation items.
 */
const fixtures = new Map();

const defaultFixtures = [
  { id: 'overhead_lights', name: 'Overhead Lights', type: 'lighting', enabled: true },
  { id: 'front_underfoot_lights', name: 'Front Underfoot Lights', type: 'lighting', enabled: true },
  { id: 'aquarium_lighting', name: 'Aquarium Lighting', type: 'lighting', enabled: true },
  { id: 'clock_lighting', name: 'Clock Lighting', type: 'lighting', enabled: true },
  { id: 'monitor_vertical_edges', name: 'Monitor Vertical Edge Lights', type: 'lighting', enabled: true },
  { id: 'monitor_horizontal_edges', name: 'Monitor Horizontal Edge Lights', type: 'lighting', enabled: true },
];

export function registerFixture(fixture) {
  fixtures.set(fixture.id, {
    status: 'ready',
    currentState: {},
    capabilities: [],
    ...fixture,
  });
  return fixtures.get(fixture.id);
}

export function commandFixture(fixtureId, command = {}) {
  const fixture = fixtures.get(fixtureId);
  if (!fixture) return null;
  fixture.lastCommand = { ...command, timestamp: Date.now() };
  fixture.currentState = { ...fixture.currentState, ...command.state };
  fixtures.set(fixtureId, fixture);
  return fixture;
}

export function getFixtures() {
  return Array.from(fixtures.values()).map((fixture) => ({ ...fixture }));
}

export function initializeDefaultFixtures() {
  defaultFixtures.forEach(registerFixture);
  return getFixtures();
}

export const fixtureManager = {
  registerFixture,
  commandFixture,
  getFixtures,
  initializeDefaultFixtures,
};
