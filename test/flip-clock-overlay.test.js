import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '..');
const overlaysPath = path.join(repoRoot, 'public', 'assets', 'js', 'ui', 'overlays.js');

test('flip clock overlay gets flip-clock-overlay class', () => {
  const source = fs.readFileSync(overlaysPath, 'utf8');
  const flipClockBlockStart = source.indexOf('if (overlay.id === FLIP_CLOCK_OVERLAY_ID) {');
  assert.notEqual(flipClockBlockStart, -1, 'Expected FLIP_CLOCK_OVERLAY_ID block in overlays.js');

  const flipClockBlockEnd = source.indexOf('if (BIG_TV_FULLSCREEN_OVERLAY_IDS.has(overlay.id)) {', flipClockBlockStart);
  assert.notEqual(flipClockBlockEnd, -1, 'Expected end marker after FLIP_CLOCK_OVERLAY_ID block');

  const flipClockBlock = source.slice(flipClockBlockStart, flipClockBlockEnd);
  assert.match(
    flipClockBlock,
    /el\.classList\.add\('flip-clock-overlay'\);/,
    'Expected flip clock overlay to receive the flip-clock-overlay CSS class',
  );
});
