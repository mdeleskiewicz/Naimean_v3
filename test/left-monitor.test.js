import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '..');
const indexCssPath = path.join(repoRoot, 'public', 'assets', 'css', 'index.css');

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

test('left monitor github quadrant overlay is centered and uses reduced label font size', () => {
  const source = fs.readFileSync(indexCssPath, 'utf8');

  assert.match(
    source,
    /\.left-monitor-github-quadrant-overlay\s*\{[^}]*transform:\s*none;/,
    'Expected left monitor GitHub quadrant overlay to avoid vertical offset transforms',
  );
  assert.match(
    source,
    /\.left-monitor-github-quadrant-overlay\s+\.github-quadrant-btn\s*\{[^}]*font:\s*700\s+clamp\(8px,\s*min\(5\.76cqw,\s*6\.72cqh\),\s*17\.6px\)\s*\/\s*1/,
    'Expected left monitor GitHub quadrant labels to be reduced by 20%',
  );
});
