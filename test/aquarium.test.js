import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { state } from '../public/assets/js/core/state.js';
import { getRandomShrimpClipUrl } from '../public/assets/js/systems/aquarium.js';
import { getAquariumShrimpCount } from '../public/assets/js/systems/aquariumEffect.js';

const repoRoot = path.resolve(import.meta.dirname, '..');
const sceneJsPath = path.join(repoRoot, 'public', 'assets', 'js', 'systems', 'scene.js');

function getBlock(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `Expected to find start marker: ${startMarker}`);
  const end = source.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Expected to find end marker: ${endMarker}`);
  return source.slice(start, end);
}

test('getRandomShrimpClipUrl selects from state clip catalog and refills queue', () => {
  const originalClips = state.aquariumShrimpClips;
  const originalQueue = state.aquariumShrimpClipQueue;

  try {
    state.aquariumShrimpClips = ['clip-a.mp4', 'clip-b.mp4', 'clip-c.mp4'];
    state.aquariumShrimpClipQueue = [];

    const seen = new Set();
    for (let index = 0; index < 6; index += 1) {
      const clipUrl = getRandomShrimpClipUrl();
      assert.ok(state.aquariumShrimpClips.includes(clipUrl));
      seen.add(clipUrl);
    }

    assert.ok(seen.size >= 2, 'Expected random selection to include multiple clips over repeated picks');
  } finally {
    state.aquariumShrimpClips = originalClips;
    state.aquariumShrimpClipQueue = originalQueue;
  }
});

test('aquarium bubbles are biased toward the left side', () => {
  const source = fs.readFileSync(sceneJsPath, 'utf8');
  const aquariumBlock = getBlock(
    source,
    'function createAquariumFishEffect() {',
    'function renderHotspotLayers() {',
  );

  assert.match(
    aquariumBlock,
    /const inCluster = i < 9 \|\| Math\.random\(\) < 0\.6;/,
    'Expected aquarium bubbles to force most early bubbles into the left-side cluster',
  );
  assert.match(
    aquariumBlock,
    /\? 9 \+ Math\.random\(\) \* 22\s+\/\/ 9–31 %/,
    'Expected left-side bubble cluster to stay within the left third of the tank',
  );
  assert.match(
    aquariumBlock,
    /: 34 \+ Math\.random\(\) \* 54;\s+\/\/ 34–88 % \(scattered\)/,
    'Expected non-cluster bubbles to remain scattered outside the left cluster',
  );
});

test('aquarium shrimp count favors 2 and 3, with 4 uncommon and 5 rare', () => {
  const originalRandom = Math.random;

  try {
    Math.random = () => 0;
    assert.equal(getAquariumShrimpCount(), 2);
    Math.random = () => 0.39;
    assert.equal(getAquariumShrimpCount(), 2);
    Math.random = () => 0.4;
    assert.equal(getAquariumShrimpCount(), 3);
    Math.random = () => 0.79;
    assert.equal(getAquariumShrimpCount(), 3);
    Math.random = () => 0.8;
    assert.equal(getAquariumShrimpCount(), 4);
    Math.random = () => 0.94;
    assert.equal(getAquariumShrimpCount(), 4);
    Math.random = () => 0.95;
    assert.equal(getAquariumShrimpCount(), 5);
    Math.random = () => 0.999;
    assert.equal(getAquariumShrimpCount(), 5);
  } finally {
    Math.random = originalRandom;
  }
});
