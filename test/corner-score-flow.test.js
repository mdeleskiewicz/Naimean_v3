import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '..');
const cornerScoreJsPath = path.join(repoRoot, 'public', 'assets', 'js', 'systems', 'cornerScore.js');
const dvdJsPath = path.join(repoRoot, 'public', 'assets', 'js', 'systems', 'dvd.js');

test('corner score initials prompt stays visible while a pending target score equals the server high score', () => {
  const source = fs.readFileSync(cornerScoreJsPath, 'utf8');

  // The prompt should also remain open when the server round-trip has updated the stored high score
  // to match the player's new score (cornerScoreInitialsTargetScore !== null and >= high score),
  // so the player can still submit their initials without the form disappearing.
  assert.match(
    source,
    /state\.cornerScoreInitialsTargetScore !== null && state\.cornerScoreInitialsTargetScore >= state\.cornerScoreHighScoreValue/,
    'Expected initials prompt to remain visible when target score equals current server high score',
  );
});

test('dvd scoring flow does not preemptively overwrite high score before initials submit', () => {
  const source = fs.readFileSync(dvdJsPath, 'utf8');

  assert.doesNotMatch(
    source,
    /else if \(nextCornerScore > previousHighScore\) \{\s*setCornerScoreHighScore\(nextCornerScore, ''\);/s,
    'Expected new high-score path to avoid mutating server high-score state before submit',
  );
  // New behaviour: show server-high-score banner + add table row, then prompt for initials
  assert.match(
    source,
    /else if \(nextCornerScore > previousHighScore\) \{\s*showServerHighScoreBanner\(\);\s*addServerHighScoreTableRow\(/s,
    'Expected new high-score path to show server banner and initials prompt',
  );
});

test('dvd scoring flow does not auto-persist new high score before initials submit', () => {
  const source = fs.readFileSync(dvdJsPath, 'utf8');

  assert.doesNotMatch(
    source,
    /else if \(nextCornerScore > previousHighScore\) \{[^}]*void queueCornerScoreUpdate\(nextCornerScore\)/s,
    'Expected new high-score path to NOT automatically queue a server persist — server score only updates on initials submit',
  );
  // New behaviour: banner + table row + initials prompt, no server update yet
  assert.match(
    source,
    /else if \(nextCornerScore > previousHighScore\) \{\s*showServerHighScoreBanner\(\);\s*addServerHighScoreTableRow\(/s,
    'Expected new high-score path to show banner and prompt only, without queuing a server update',
  );
});

test('dvd run timer starts when the first wall bounce is detected', () => {
  const source = fs.readFileSync(dvdJsPath, 'utf8');

  assert.match(
    source,
    /if \(hitHorizontalEdge \|\| hitVerticalEdge\) \{\s*startRunStats\(\);\s*state\.dvdColorStepIndex = \(state\.dvdColorStepIndex \+ 1\) % DVD_COLOR_STEPS\.length;\s*applyDvdColorStep\(\);\s*recordBounce\(\);/s,
    'Expected first wall bounce handling to start run timing before updating bounce stats',
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

test('server high score toggle shows arena stats for 15 seconds and then hides them', () => {
  const source = fs.readFileSync(cornerScoreJsPath, 'utf8');

  assert.match(
    source,
    /const SERVER_STATS_VISIBLE_MS = 15_000;/,
    'Expected server stats visibility duration to be 15 seconds',
  );
  assert.match(
    source,
    /state\.bigTvHighScoreStatsEl\.classList\.add\('is-active'\);\s*state\.bigTvHighScoreStatsEl\.setAttribute\('aria-hidden', 'false'\);/s,
    'Expected toggle flow to reveal server stats immediately',
  );
  assert.match(
    source,
    /state\.bigTvHighScoreStatsTimeoutId = window\.setTimeout\(\(\) => \{\s*state\.isBigTvHighScoreStatsVisible = false;\s*state\.bigTvHighScoreStatsEl\?\.classList\.remove\('is-active'\);\s*state\.bigTvHighScoreStatsEl\?\.setAttribute\('aria-hidden', 'true'\);/s,
    'Expected toggle flow to hide server stats after timeout',
  );
});
