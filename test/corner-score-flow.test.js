import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '..');
const cornerScoreJsPath = path.join(repoRoot, 'public', 'assets', 'js', 'systems', 'cornerScore.js');
const dvdJsPath = path.join(repoRoot, 'public', 'assets', 'js', 'systems', 'dvd.js');

test('corner score initials prompt is gated by local score exceeding server high score', () => {
  const source = fs.readFileSync(cornerScoreJsPath, 'utf8');

  assert.match(
    source,
    /const shouldShowPrompt = state\.cornerScoreValue > state\.cornerScoreHighScoreValue;/,
    'Expected initials prompt visibility to require local score greater than server high score',
  );
});

test('dvd scoring flow does not preemptively overwrite high score before initials submit', () => {
  const source = fs.readFileSync(dvdJsPath, 'utf8');

  assert.doesNotMatch(
    source,
    /else if \(nextCornerScore > previousHighScore\) \{\s*setCornerScoreHighScore\(nextCornerScore, ''\);/s,
    'Expected new high-score path to avoid mutating server high-score state before submit',
  );
  assert.match(
    source,
    /else if \(nextCornerScore > previousHighScore\) \{\s*showCornerScoreStatus\('New high-score!', nextCornerScore\);\s*showCornerScoreInitialsPrompt\(nextCornerScore\);/s,
    'Expected new high-score path to show initials prompt',
  );
});

test('corner score mode activates after successful server score hydration', () => {
  const source = fs.readFileSync(cornerScoreJsPath, 'utf8');

  assert.match(
    source,
    /const payload = await response\.json\(\);\s*setCornerScoreHighScore\(payload\?\.score, payload\?\.initials\);\s*activateRightMonitorCornerScoreMode\(\);/s,
    'Expected successful server hydration to activate right monitor corner score mode',
  );
});
