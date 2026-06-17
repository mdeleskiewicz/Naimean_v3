import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

test('overlays module parses without syntax errors', async () => {
  const execFileAsync = promisify(execFile);
  await assert.doesNotReject(
    execFileAsync(process.execPath, ['--check', new URL('../public/assets/js/ui/overlays.js', import.meta.url).pathname])
  );
});
