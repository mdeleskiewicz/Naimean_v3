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
    /else if \(nextCornerScore > previousHighScore\) \{\s*showCornerScoreStatus\('New High-Score', nextCornerScore\);\s*showCornerScoreInitialsPrompt\(nextCornerScore\);/s,
    'Expected new high-score path to show initials prompt',
  );
});

test('server score hydration does not pre-activate right monitor corner score overlays', () => {
  const source = fs.readFileSync(cornerScoreJsPath, 'utf8');

  // Hydrating the high score from the server must NOT call activateRightMonitorCornerScoreMode
  // so that both right-monitor overlays stay transparent until the user actually scores a corner.
  assert.doesNotMatch(
    source,
    /setCornerScoreHighScore\(payload\?\.score, payload\?\.initials\);\s*activateRightMonitorCornerScoreMode\(\);/s,
    'Expected server hydration to NOT activate right monitor corner score mode before a corner is scored',
  );
});

test('submitting corner score initials clears the temporary new-high-score status', () => {
  const source = fs.readFileSync(cornerScoreJsPath, 'utf8');

  assert.match(
    source,
    /setCornerScoreHighScore\(highestKnownScore, submittedInitials\);\s*hideCornerScoreInitialsPrompt\(\);\s*hideCornerScoreStatus\(\);/s,
    'Expected initials submit flow to hide the temporary new-high-score status text',
  );
});
