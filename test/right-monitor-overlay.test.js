import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '..');
const overlaysJsPath = path.join(repoRoot, 'public', 'assets', 'js', 'ui', 'overlays.js');
const indexCssPath = path.join(repoRoot, 'public', 'assets', 'css', 'index.css');

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

test('right monitor content bleeds 1px past the frame transparency', () => {
  const source = fs.readFileSync(indexCssPath, 'utf8');

  assert.match(
    source,
    /\.right-monitor-screen-window\s*\{[^}]*--monitor-content-bleed:\s*1px;/s,
    'Expected right monitor screen window to define a 1px content bleed',
  );
  assert.match(
    source,
    /\.right-monitor-screen-window\s*>\s*\.join-discord-button\s*\{[^}]*top:\s*calc\(0px - var\(--monitor-content-bleed\)\);[^}]*right:\s*calc\(0px - var\(--monitor-content-bleed\)\);[^}]*bottom:\s*calc\(0px - var\(--monitor-content-bleed\)\);[^}]*left:\s*calc\(0px - var\(--monitor-content-bleed\)\);/s,
    'Expected the Discord button to extend 1px past the frame transparency on every side',
  );
  assert.match(
    source,
    /\.right-monitor-screen-window\s*>\s*\.overlay-static-layer,\s*\.right-monitor-screen-window\s*>\s*\.right-monitor-shrimp-logo-overlay,\s*\.right-monitor-screen-window\s*>\s*\.right-monitor-corner-score-overlay\s*\{[^}]*top:\s*calc\(0px - var\(--monitor-content-bleed\)\);[^}]*bottom:\s*calc\(0px - var\(--monitor-content-bleed\)\);[^}]*left:\s*calc\(0px - var\(--monitor-content-bleed\)\);[^}]*right:\s*calc\(0px - var\(--monitor-content-bleed\)\);/s,
    'Expected right monitor overlays to extend 1px past the frame transparency on every side',
  );
});

test('right monitor frame is vertically corrected and uses flipped screen bounds', () => {
  const source = fs.readFileSync(indexCssPath, 'utf8');

  assert.match(
    source,
    /\.right-monitor-screen-window\s*\{[^}]*inset:\s*29\.297%\s+25\.26%\s+17\.09%\s+24\.414%;/s,
    'Expected right monitor screen bounds to align with the vertically flipped right frame hole',
  );
  assert.match(
    source,
    /\.monitor-group-right\s*>\s*\.monitor-shadow-layer\s*\{[^}]*inset:\s*29\.297%\s+25\.26%\s+17\.09%\s+24\.414%;/s,
    'Expected right monitor shadow bounds to align with the vertically flipped right frame hole',
  );
  assert.match(
    source,
    /\.monitor-group-right\s+\.monitor-frame-image\s*\{[^}]*transform:\s*scaleY\(-1\);[^}]*transform-origin:\s*center;/s,
    'Expected the right monitor frame art to be vertically flipped into the correct orientation',
  );
});

test('middle monitor shadow uses full Commodore screen bounds', () => {
  const source = fs.readFileSync(indexCssPath, 'utf8');

  assert.match(
    source,
    /\.monitor-group-middle\s*>\s*\.monitor-shadow-layer\s*\{[^}]*inset:\s*0;/s,
    'Expected middle monitor shadow bounds to cover the full Commodore screen overlay',
  );
});
