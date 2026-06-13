import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '..');
const sceneJsPath = path.join(repoRoot, 'public', 'assets', 'js', 'systems', 'scene.js');

function getBlock(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `Expected to find start marker: ${startMarker}`);
  const end = source.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Expected to find end marker: ${endMarker}`);
  return source.slice(start, end);
}

test('ashtray smoke effect appends animated wisp elements', () => {
  const source = fs.readFileSync(sceneJsPath, 'utf8');
  const smokeBlock = getBlock(
    source,
    'function createAshtraySmokeEffect() {',
    'function createAshtrayCigaretteEffect() {',
  );

  assert.match(
    smokeBlock,
    /className:\s*'ashtray-smoke-wisp'/,
    'Expected smoke effect to include a base smoke wisp',
  );
  assert.match(
    smokeBlock,
    /className:\s*'ashtray-smoke-wisp ashtray-smoke-wisp-swirl'/,
    'Expected smoke effect to include a swirl smoke wisp',
  );
  assert.match(
    smokeBlock,
    /className:\s*'ashtray-smoke-wisp ashtray-smoke-wisp-depth'/,
    'Expected smoke effect to include a depth smoke wisp',
  );
  assert.match(
    smokeBlock,
    /el\.appendChild\(wisp\);/,
    'Expected smoke wisps to be appended into the smoke effect container',
  );
});

test('ashtray cigarette effect appends cigarette body and ember', () => {
  const source = fs.readFileSync(sceneJsPath, 'utf8');
  const cigaretteBlock = getBlock(
    source,
    'function createAshtrayCigaretteEffect() {',
    'function renderHotspotLayers() {',
  );

  assert.match(
    cigaretteBlock,
    /cigarette\.className\s*=\s*'ashtray-cigarette';/,
    'Expected cigarette effect to include the cigarette element',
  );
  assert.match(
    cigaretteBlock,
    /ember\.className\s*=\s*'ashtray-cigarette-ember';/,
    'Expected cigarette effect to include ember element',
  );
  assert.match(
    cigaretteBlock,
    /cigarette\.appendChild\(ember\);/,
    'Expected ember to be appended to the cigarette element',
  );
  assert.match(
    cigaretteBlock,
    /el\.appendChild\(cigarette\);/,
    'Expected cigarette to be appended to the ashtray cigarette container',
  );
});
