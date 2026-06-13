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
