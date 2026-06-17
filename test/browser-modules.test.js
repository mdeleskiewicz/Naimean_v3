import { test } from 'node:test';
import assert from 'node:assert/strict';

test('overlays module imports without syntax errors', async () => {
  await assert.doesNotReject(() => import('../public/assets/js/ui/overlays.js'));
});
