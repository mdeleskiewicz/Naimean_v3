import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { CAMERA_MOTION_PERFORMANCE_MODE_ENABLED } from '../public/assets/js/core/constants.js';

const repoRoot = path.resolve(import.meta.dirname, '..');
const sceneJsPath = path.join(repoRoot, 'public', 'assets', 'js', 'systems', 'scene.js');

test('den camera-motion performance mode is paused', () => {
  assert.equal(
    CAMERA_MOTION_PERFORMANCE_MODE_ENABLED,
    false,
    'Expected den camera-motion performance mode to stay disabled while evaluating rebuilt scroll performance',
  );

  const source = fs.readFileSync(sceneJsPath, 'utf8');
  assert.match(
    source,
    /if \(!CAMERA_MOTION_PERFORMANCE_MODE_ENABLED\) \{\s*document\.body\.classList\.remove\('camera-motion-active'\);\s*return;\s*\}/,
    'Expected scene performance mode toggling to short-circuit while paused',
  );
});
