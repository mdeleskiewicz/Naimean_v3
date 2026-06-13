import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  NEDRY_GATE_TRIGGER_HOTSPOT_IDS,
  RIGHT_MONITOR_OVERLAY_CONTROL_ID,
} from '../public/assets/js/core/constants.js';

const repoRoot = path.resolve(import.meta.dirname, '..');
const indexJsPath = path.join(repoRoot, 'public', 'assets', 'js', 'index.js');

function getOverlayBlock(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `Expected to find start marker: ${startMarker}`);

  const end = source.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Expected to find end marker: ${endMarker}`);

  return source.slice(start, end);
}

test('aquarium overlay owns the big-screen video overlay', () => {
  const source = fs.readFileSync(indexJsPath, 'utf8');
  const discordBlock = getOverlayBlock(
    source,
    "if (overlay.id === DISCORD_OVERLAY_ID) {",
    "if (overlay.id === AQUARIUM_OVERLAY_ID) {",
  );
  const aquariumBlock = getOverlayBlock(
    source,
    "if (overlay.id === AQUARIUM_OVERLAY_ID) {",
    "if (BIG_TV_FULLSCREEN_OVERLAY_IDS.has(overlay.id)) {",
  );

  assert.doesNotMatch(
    discordBlock,
    /nedryGateOverlayEl = document\.createElement\('div'\);/,
    'Expected the shrimp video overlay to no longer be created inside the Discord overlay',
  );
  assert.match(
    aquariumBlock,
    /nedryGateOverlayEl = document\.createElement\('div'\);[\s\S]*el\.appendChild\(nedryGateOverlayEl\);/,
    'Expected the shrimp video overlay to be created inside the aquarium overlay',
  );
});

test('Nedry gate triggers include the right monitor overlay control hotspot id', () => {
  assert.ok(
    NEDRY_GATE_TRIGGER_HOTSPOT_IDS.has(RIGHT_MONITOR_OVERLAY_CONTROL_ID),
    `Expected NEDRY gate trigger hotspot set to include ${RIGHT_MONITOR_OVERLAY_CONTROL_ID}`,
  );
  assert.equal(
    NEDRY_GATE_TRIGGER_HOTSPOT_IDS.has('right-monitor'),
    false,
    'Expected legacy right-monitor hotspot id to be absent from Nedry gate trigger hotspot set',
  );
});
