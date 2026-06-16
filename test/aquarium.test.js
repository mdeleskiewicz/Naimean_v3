import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { state } from '../public/assets/js/core/state.js';
import { getRandomShrimpClipUrl } from '../public/assets/js/systems/aquarium.js';
import { getAquariumShrimpCount } from '../public/assets/js/systems/aquariumEffect.js';

const repoRoot = path.resolve(import.meta.dirname, '..');
const sceneJsPath = path.join(repoRoot, 'public', 'assets', 'js', 'systems', 'scene.js');
const indexCssPath = path.join(repoRoot, 'public', 'assets', 'css', 'index.css');

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

test('aquarium uses fixed right-side filter bubbles and bubble-rock streams', () => {
  const source = fs.readFileSync(sceneJsPath, 'utf8');
  const aquariumBlock = getBlock(
    source,
    'function createAquariumFishEffect() {',
    'function renderHotspotLayers() {',
  );

  assert.match(
    aquariumBlock,
    /Original filter bubbles: 8 fixed bubbles from the right-side filter/,
    'Expected original 8 fixed right-side filter bubbles to be present',
  );
  assert.match(
    aquariumBlock,
    /Bubble rocks: 3 spots on the floor with intermittent bubble streams/,
    'Expected 3 bubble rock streams across the tank floor',
  );
  assert.match(
    aquariumBlock,
    /aquarium-bubble-rock/,
    'Expected bubble rock visual elements to be created',
  );
  assert.match(
    aquariumBlock,
    /aquarium-water-line/,
    'Expected animated water line element to be created',
  );
  assert.match(
    aquariumBlock,
    /aquarium-caustic/,
    'Expected caustic light elements to be created',
  );
  assert.match(
    aquariumBlock,
    /aquarium-filter/,
    'Expected filter element to be created',
  );
});

test('aquarium shrimp count favors 3 and 4, with 5 uncommon and 6 rare', () => {
  const originalRandom = Math.random;

  try {
    Math.random = () => 0;
    assert.equal(getAquariumShrimpCount(), 3);
    Math.random = () => 0.39;
    assert.equal(getAquariumShrimpCount(), 3);
    Math.random = () => 0.4;
    assert.equal(getAquariumShrimpCount(), 4);
    Math.random = () => 0.79;
    assert.equal(getAquariumShrimpCount(), 4);
    Math.random = () => 0.8;
    assert.equal(getAquariumShrimpCount(), 5);
    Math.random = () => 0.94;
    assert.equal(getAquariumShrimpCount(), 5);
    Math.random = () => 0.95;
    assert.equal(getAquariumShrimpCount(), 6);
    Math.random = () => 0.999;
    assert.equal(getAquariumShrimpCount(), 6);
  } finally {
    Math.random = originalRandom;
  }
});

test('lite rendering keeps aquarium bubbles and animals animating', () => {
  const cssSource = fs.readFileSync(indexCssPath, 'utf8');
  const pausedInLiteRenderingSelectors = [
    '.aquarium-bubble',
    '.aquarium-shrimp',
    '.aquarium-betta',
    '.aquarium-snail',
    '.aquarium-starfish',
    '.aquarium-turtle',
    '.aquarium-jellyfish',
    '.aquarium-nautilus',
    '.aquarium-octopus',
  ];

  pausedInLiteRenderingSelectors.forEach((selector) => {
    assert.doesNotMatch(
      cssSource,
      new RegExp(`body\\.lite-rendering\\s+${selector.replace('.', '\\.')}`),
      `Expected ${selector} to keep animating on lite rendering (mobile)`,
    );
  });
});
