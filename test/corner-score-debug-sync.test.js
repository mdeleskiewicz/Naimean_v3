import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

test('debug UI includes a CornerScore server sync button', () => {
  const indexHtmlPath = path.join(repoRoot, 'public', 'index.html');
  const source = fs.readFileSync(indexHtmlPath, 'utf8');

  assert.match(
    source,
    /<button id="debug-corner-score-sync-btn"[^>]*>Set CornerScore server = local \(MAD\)<\/button>/,
    'Expected debug controls to include a button for syncing local CornerScore to server with MAD initials'
  );
});

test('debug UI includes a CornerScore clear button', () => {
  const indexHtmlPath = path.join(repoRoot, 'public', 'index.html');
  const source = fs.readFileSync(indexHtmlPath, 'utf8');

  assert.match(
    source,
    /<button id="debug-corner-score-clear-btn"[^>]*>Clear CornerScore \(server \+ local\)<\/button>/,
    'Expected debug controls to include a button for clearing CornerScore server and local state'
  );
});

test('dom refs register debug corner score sync button', () => {
  const domRefsPath = path.join(repoRoot, 'public', 'assets', 'js', 'core', 'domRefs.js');
  const source = fs.readFileSync(domRefsPath, 'utf8');

  assert.match(
    source,
    /debugCornerScoreSyncButton:\s*null/,
    'Expected dom refs shape to include debugCornerScoreSyncButton'
  );
  assert.match(
    source,
    /dom\.debugCornerScoreSyncButton = document\.getElementById\('debug-corner-score-sync-btn'\);/,
    'Expected initDomRefs to wire #debug-corner-score-sync-btn'
  );
});

test('dom refs register debug corner score clear button', () => {
  const domRefsPath = path.join(repoRoot, 'public', 'assets', 'js', 'core', 'domRefs.js');
  const source = fs.readFileSync(domRefsPath, 'utf8');

  assert.match(
    source,
    /debugCornerScoreClearButton:\s*null/,
    'Expected dom refs shape to include debugCornerScoreClearButton'
  );
  assert.match(
    source,
    /dom\.debugCornerScoreClearButton = document\.getElementById\('debug-corner-score-clear-btn'\);/,
    'Expected initDomRefs to wire #debug-corner-score-clear-btn'
  );
});

test('scene binds debug corner score sync button with password gate', () => {
  const scenePath = path.join(repoRoot, 'public', 'assets', 'js', 'systems', 'scene.js');
  const source = fs.readFileSync(scenePath, 'utf8');

  assert.match(
    source,
    /syncCornerScoreServerToLocalMad/,
    'Expected scene to import/use syncCornerScoreServerToLocalMad'
  );
  assert.match(
    source,
    /if \(!ensureDebugSaveAccess\(\)\) return;/,
    'Expected scene debug action to require debug save access'
  );
  assert.match(
    source,
    /dom\.debugCornerScoreSyncButton\.addEventListener\('click',/,
    'Expected scene to bind click handler for debug corner score sync button'
  );
});

test('scene binds debug corner score clear button with password gate', () => {
  const scenePath = path.join(repoRoot, 'public', 'assets', 'js', 'systems', 'scene.js');
  const source = fs.readFileSync(scenePath, 'utf8');

  assert.match(
    source,
    /clearCornerScore/,
    'Expected scene to import/use clearCornerScore'
  );
  assert.match(
    source,
    /dom\.debugCornerScoreClearButton\.addEventListener\('click',/,
    'Expected scene to bind click handler for debug corner score clear button'
  );
});

test('corner score sync operation resets and writes MAD initials', () => {
  const cornerScorePath = path.join(repoRoot, 'public', 'assets', 'js', 'systems', 'cornerScore.js');
  const source = fs.readFileSync(cornerScorePath, 'utf8');

  assert.match(
    source,
    /async function syncCornerScoreServerToLocalMad\(\)/,
    'Expected CornerScore module to expose syncCornerScoreServerToLocalMad'
  );
  assert.match(
    source,
    /method:\s*'DELETE'/,
    'Expected debug sync flow to reset server score first'
  );
  assert.match(
    source,
    /body:\s*JSON\.stringify\(\{\s*score:\s*localScore,\s*initials:\s*'MAD'\s*\}\)/s,
    'Expected debug sync flow to submit local score with MAD initials'
  );
});

test('corner score clear function resets server and local state to zero', () => {
  const cornerScorePath = path.join(repoRoot, 'public', 'assets', 'js', 'systems', 'cornerScore.js');
  const source = fs.readFileSync(cornerScorePath, 'utf8');

  assert.match(
    source,
    /async function clearCornerScore\(\)/,
    'Expected CornerScore module to expose clearCornerScore'
  );
  assert.match(
    source,
    /state\.cornerScoreValue = 0/,
    'Expected clearCornerScore to reset local score to 0'
  );
  assert.match(
    source,
    /state\.cornerScoreHighScoreValue = 0/,
    'Expected clearCornerScore to reset server high score to 0'
  );
  assert.match(
    source,
    /state\.cornerScoreHighScoreInitials = ''/,
    'Expected clearCornerScore to reset server initials to empty'
  );
  assert.match(
    source,
    /state\.cornerScorePersonalBest = null/,
    'Expected clearCornerScore to reset personal best to null'
  );
  assert.match(
    source,
    /state\.cornerScoreServerStats = null/,
    'Expected clearCornerScore to reset server stats to null'
  );
});

test('worker DELETE /api/corner-score does not require Discord session auth', () => {
  const workerPath = path.join(repoRoot, 'src', 'worker.js');
  const source = fs.readFileSync(workerPath, 'utf8');

  assert.doesNotMatch(
    source,
    /if \(request\.method === 'DELETE' && isCornerScore\)[\s\S]{0,200}getRequestSession/,
    'Expected DELETE /api/corner-score to not require Discord session authentication'
  );
});
