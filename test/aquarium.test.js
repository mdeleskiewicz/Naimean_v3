import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { state } from '../public/assets/js/core/state.js';
import { getRandomShrimpClipUrl, repopulateAquariumShrimp } from '../public/assets/js/systems/aquarium.js';
import { getAquariumShrimpCount, resolveAquariumHorizontalMotion } from '../public/assets/js/systems/aquariumEffect.js';

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

test('repopulateAquariumShrimp refreshes clip queue and rerenders aquarium townsfolk', () => {
  const originalClips = state.aquariumShrimpClips;
  const originalQueue = state.aquariumShrimpClipQueue;
  const originalRenderAquariumFishEffect = state._cb.renderAquariumFishEffect;
  let renderCalls = 0;

  try {
    state.aquariumShrimpClips = ['clip-a.mp4', 'clip-b.mp4', 'clip-c.mp4'];
    state.aquariumShrimpClipQueue = ['stale-clip.mp4'];
    state._cb.renderAquariumFishEffect = () => {
      renderCalls += 1;
    };

    repopulateAquariumShrimp();

    assert.equal(state.aquariumShrimpClipQueue.length, state.aquariumShrimpClips.length);
    assert.deepEqual(new Set(state.aquariumShrimpClipQueue), new Set(state.aquariumShrimpClips));
    assert.equal(renderCalls, 1);
  } finally {
    state.aquariumShrimpClips = originalClips;
    state.aquariumShrimpClipQueue = originalQueue;
    state._cb.renderAquariumFishEffect = originalRenderAquariumFishEffect;
  }
});

test('neon sign hotspot repopulates aquarium townsfolk and triggers the shrimp card', () => {
  const source = fs.readFileSync(path.join(repoRoot, 'public', 'assets', 'js', 'systems', 'hotspots.js'), 'utf8');

  assert.match(
    source,
    /if \(spot\.id === NEON_SIGN_HOTSPOT_ID\) \{\s*state\._cb\.repopulateAquariumShrimp\?\.\(\);\s*return void state\._cb\.triggerShrimpCard\?\.\(\);\s*\}/,
  );
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


test('resolveAquariumHorizontalMotion keeps aquarium creatures inside the tank bounds', () => {
  assert.deepEqual(
    resolveAquariumHorizontalMotion({
      tankWidthPx: 400,
      startLeftPct: 90,
      creatureWidthPx: 42,
      swimDistPx: 120,
      allowDirectionFlip: false,
    }),
    {
      startLeftPct: 57.5,
      swimDistPx: 120,
      swimsRight: true,
    },
  );

  assert.deepEqual(
    resolveAquariumHorizontalMotion({
      tankWidthPx: 400,
      startLeftPct: 5,
      creatureWidthPx: 36,
      swimDistPx: 150,
      swimsRight: false,
    }),
    {
      startLeftPct: 5,
      swimDistPx: 150,
      swimsRight: true,
    },
  );
});


test('aquarium keeps shrimp/random creature flow while generic fish use Disney sprites', () => {
  const source = fs.readFileSync(sceneJsPath, 'utf8');
  const disneySpecBlock = getBlock(
    source,
    'const AQUARIUM_DISNEY_CHARACTER_SPECS = Object.freeze([',
    'function createPixelSpriteDataUrl({ pixels, palette }) {',
  );
  const aquariumBlock = getBlock(
    source,
    'function createAquariumFishEffect() {',
    'function renderHotspotLayers() {',
  );

  [
    'Nemo & Marlin',
    'Dory',
    'Flounder',
    'Cleo',
    'Bubbles',
    'Gurgle',
    'Gill'
  ].forEach((name) => {
    assert.match(disneySpecBlock, new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  });
  assert.match(source, /import \{ getAquariumShrimpCount, resolveAquariumHorizontalMotion \} from '\.\/aquariumEffect\.js';/);
  assert.match(aquariumBlock, /applyAquariumHorizontalMotion\(\{/, 'Expected aquarium swimmers to use bounded horizontal motion');
  assert.match(aquariumBlock, /resolveAquariumHorizontalMotion\(\{\s*tankWidthPx: spot\.w,/, 'Expected generic fish to clamp travel inside the aquarium width');
  assert.match(aquariumBlock, /const shrimpCount = getAquariumShrimpCount\(\);/, 'Expected aquarium to keep the shrimp population flow');
  [
    'snail',
    'starfish',
    'turtle',
    'jellyfish',
    'nautilus',
    'octopus',
    'frog',
    'manta-ray',
    'shark',
    'electric-eel',
    'moray-eel',
    'anchor',
    'mario-jellyfish',
    'anglerfish',
    'snapping-turtle',
    'vampire-octopus',
    'baby-barracuda',
    'little-crocodile',
    'bubble-chest',
    'coral',
    'anemone',
    'toy-diver',
    'cthulhu-bubbler',
    'skull-bubbler',
  ].forEach((guest) => {
    const escapedGuest = guest.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    assert.match(aquariumBlock, new RegExp(`'${escapedGuest}'`), `Expected random guest roster to include ${guest}`);
  });
  assert.match(
    aquariumBlock,
    /appendAquariumDisneyFish\(getRandomAquariumCreatureLayer\(backCreatureLayerEl, frontCreatureLayerEl\), disneyFishPool, /,
    'Expected generic fish slots to render Disney sprites through the randomized front/back depth layers',
  );
  assert.match(
    aquariumBlock,
    /depthOverlayLeftEl\.className = 'aquarium-depth-overlay aquarium-depth-overlay-left';/,
    'Expected the aquarium depth image to be inserted between the back and front creature layers',
  );
  assert.match(
    aquariumBlock,
    /depthOverlayRightEl\.className = 'aquarium-depth-overlay aquarium-depth-overlay-right';/,
    'Expected the aquarium right depth image to be inserted between the back and front creature layers',
  );
  assert.match(
    aquariumBlock,
    /appendAquariumCreature\(shrimp\);/,
    'Expected shrimp to be assigned to randomized depth layers',
  );
  assert.doesNotMatch(aquariumBlock, /for \(const spec of AQUARIUM_DISNEY_CHARACTER_SPECS\)/, 'Expected aquarium not to render the entire Disney roster at once');
  assert.match(source, /aquarium-disney-fish/, 'Expected aquarium fish to render as Disney pixel sprites');
  assert.match(source, /createPixelSpriteDataUrl/, 'Expected aquarium fish sprites to be generated from pixel art data');
});

test('lite rendering keeps aquarium bubbles and animals animating', () => {
  const cssSource = fs.readFileSync(indexCssPath, 'utf8');
  const pausedInLiteRenderingSelectors = [
    '.aquarium-bubble',
    '.aquarium-shrimp',
    '.aquarium-disney-fish',
  ];

  pausedInLiteRenderingSelectors.forEach((selector) => {
    assert.doesNotMatch(
      cssSource,
      new RegExp(`body\\.lite-rendering\\s+${selector.replace('.', '\\.')}`),
      `Expected ${selector} to keep animating on lite rendering (mobile)`,
    );
  });
});

test('aquarium restored creature swim loops return to their starting orientation', () => {
  const cssSource = fs.readFileSync(indexCssPath, 'utf8');

  assert.match(
    cssSource,
    /98%\s+\{\s+transform: translate3d\(0, 0, 0\) scaleX\(-1\);\s+\}/,
    'Expected nautilus glide loop to hold its return orientation before resetting',
  );
  assert.match(
    cssSource,
    /100%\s+\{\s+transform: translate3d\(0, 0, 0\) scaleX\(1\);\s+\}/,
    'Expected nautilus glide loop to end facing its starting direction',
  );
  assert.match(
    cssSource,
    /98%\s+\{\s+transform: translate3d\(0, 0, 0\) scaleX\(-1\) scale\(1\);\s+\}/,
    'Expected octopus swim loop to hold its return orientation before resetting',
  );
  assert.match(
    cssSource,
    /100%\s+\{\s+transform: translate3d\(0, 0, 0\) scaleX\(1\) scale\(1\);\s+\}/,
    'Expected octopus swim loop to end facing its starting direction',
  );
});
