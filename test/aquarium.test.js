import test from 'node:test';
import assert from 'node:assert/strict';

import { state } from '../public/assets/js/core/state.js';
import { getRandomShrimpClipUrl } from '../public/assets/js/systems/aquarium.js';

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
