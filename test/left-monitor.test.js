import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '..');
const indexCssPath = path.join(repoRoot, 'public', 'assets', 'css', 'index.css');
const overlaysJsPath = path.join(repoRoot, 'public', 'assets', 'js', 'ui', 'overlays.js');

function getLeftMonitorSelectorBlock(source) {
  const startMarker = '.left-monitor-selector {';
  const endMarker = '.left-monitor-content-image {';
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `Expected to find start marker: ${startMarker}`);
  const end = source.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Expected to find end marker: ${endMarker}`);
  return source.slice(start, end);
}

test('left monitor selector uses equal-width columns for quadrant boundaries', () => {
  const source = fs.readFileSync(indexCssPath, 'utf8');
  const selectorBlock = getLeftMonitorSelectorBlock(source);

  assert.match(
    selectorBlock,
    /grid-template-columns:\s*1fr\s+1fr;/,
    'Expected equal-width grid columns so quadrant boundaries do not overlap adjacent zones',
  );
  assert.doesNotMatch(
    selectorBlock,
    /grid-template-columns:\s*calc\(\s*50%\s*\+\s*2px\s*\)\s*1fr;/,
    'Expected no rightward-biased column width in left monitor selector',
  );
});

test('left monitor selector is not vertically shifted from center axis', () => {
  const source = fs.readFileSync(indexCssPath, 'utf8');

  assert.doesNotMatch(
    source,
    /\.left-monitor-screen-window\s*>\s*\.left-monitor-selector\s*\{[^}]*transform:\s*translate\(\s*0\s*,\s*8px\s*\)/,
    'Expected no fixed vertical translate offset on left monitor selector',
  );
});

test('left monitor github quadrant overlay is centered and uses larger label font size', () => {
  const source = fs.readFileSync(indexCssPath, 'utf8');

  assert.match(
    source,
    /\.left-monitor-github-quadrant-overlay\s*\{[^}]*transform:\s*none;/,
    'Expected left monitor GitHub quadrant overlay to avoid vertical offset transforms',
  );
  assert.match(
    source,
    /\.left-monitor-github-quadrant-overlay\s+\.github-quadrant-btn\s*\{[^}]*font:\s*700\s+clamp\(9\.6px,\s*min\(6\.912cqw,\s*8\.064cqh\),\s*21\.12px\)\s*\/\s*1/,
    'Expected left monitor GitHub quadrant labels to be increased by 20%',
  );
});

test('left monitor content bleeds 1px past the frame transparency', () => {
  const source = fs.readFileSync(indexCssPath, 'utf8');

  assert.match(
    source,
    /\.left-monitor-screen-window\s*\{[^}]*--monitor-content-bleed:\s*1px;/s,
    'Expected left monitor screen window to define a 1px content bleed',
  );
  assert.match(
    source,
    /\.left-monitor-screen-window\s*>\s*\.left-monitor-selector,\s*\.left-monitor-screen-window\s*>\s*\.left-monitor-github-quadrant-overlay,\s*\.left-monitor-screen-window\s*>\s*\.overlay-static-layer,\s*\.left-monitor-screen-window\s*>\s*\.left-monitor-corner-score-overlay\s*\{[^}]*top:\s*calc\(var\(--left-monitor-inner-boundary-top\) - var\(--monitor-content-bleed\)\);[^}]*right:\s*calc\(var\(--left-monitor-inner-boundary-right\) - var\(--monitor-content-bleed\)\);[^}]*bottom:\s*calc\(var\(--left-monitor-inner-boundary-bottom\) - var\(--monitor-content-bleed\)\);[^}]*left:\s*calc\(var\(--left-monitor-inner-boundary-left\) - var\(--monitor-content-bleed\)\);/s,
    'Expected left monitor overlays to extend 1px past the frame transparency on every side',
  );
  assert.match(
    source,
    /\.left-monitor-screen-window\s*>\s*\.left-monitor-content-image\s*\{[^}]*top:\s*calc\(var\(--left-monitor-inner-boundary-top\) - var\(--monitor-content-bleed\)\);[^}]*left:\s*calc\(var\(--left-monitor-inner-boundary-left\) - var\(--monitor-content-bleed\)\);[^}]*width:\s*calc\(100% - var\(--left-monitor-inner-boundary-left\) - var\(--left-monitor-inner-boundary-right\) \+ \(var\(--monitor-content-bleed\) \* 2\)\);[^}]*height:\s*calc\(100% - var\(--left-monitor-inner-boundary-top\) - var\(--left-monitor-inner-boundary-bottom\) \+ \(var\(--monitor-content-bleed\) \* 2\)\);/s,
    'Expected the left monitor content image to extend 1px past the frame transparency on every side',
  );
});

test('left monitor content image element has left-monitor-content-image class applied', () => {
  const source = fs.readFileSync(overlaysJsPath, 'utf8');

  assert.match(
    source,
    /state\.leftMonitorContentImageEl\.className\s*=\s*'left-monitor-content-image';/,
    'Expected leftMonitorContentImageEl to be assigned the left-monitor-content-image class so CSS positioning rules apply',
  );
});

test('left monitor group is stacked above the commodore center overlays', () => {
  const source = fs.readFileSync(indexCssPath, 'utf8');

  assert.match(
    source,
    /#overlay-commodore-screen\s*\{[^}]*z-index:\s*1;/s,
    'Expected the commodore desk overlay to remain below the left monitor group',
  );
  assert.match(
    source,
    /#monitor-group-middle\s*\{[^}]*z-index:\s*2;/s,
    'Expected the commodore monitor shadow group to remain below the left monitor group',
  );
  assert.match(
    source,
    /#monitor-group-left\s*\{[^}]*z-index:\s*3;/s,
    'Expected the left monitor group to stack above the commodore center overlays',
  );
});
