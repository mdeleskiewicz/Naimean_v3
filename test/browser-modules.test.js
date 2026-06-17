import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

test('overlays module parses without syntax errors', async () => {
  const source = await readFile(new URL('../public/assets/js/ui/overlays.js', import.meta.url), 'utf8');
  assert.doesNotThrow(() => new vm.SourceTextModule(source, { identifier: 'ui/overlays.js' }));
});
