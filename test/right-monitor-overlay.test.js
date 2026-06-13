import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '..');
const overlaysJsPath = path.join(repoRoot, 'public', 'assets', 'js', 'ui', 'overlays.js');

test('right monitor overlay applies sizing classes for monitor images', () => {
  const source = fs.readFileSync(overlaysJsPath, 'utf8');

  assert.match(
    source,
    /state\.discordJoinButtonEl\.className\s*=\s*'join-discord-button';/,
    'Expected right monitor discord button class to be applied',
  );
  assert.match(
    source,
    /state\.discordButtonImgEl\.className\s*=\s*'join-discord-button-image';/,
    'Expected right monitor discord image class to be applied',
  );
  assert.match(
    source,
    /shrimpLogoImg\.className\s*=\s*'right-monitor-shrimp-logo-image';/,
    'Expected right monitor shrimp logo image class to be applied',
  );
});
