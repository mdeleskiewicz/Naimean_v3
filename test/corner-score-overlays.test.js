import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '..');
const overlaysJsPath = path.join(repoRoot, 'public', 'assets', 'js', 'ui', 'overlays.js');

test('right monitor corner score overlay applies expected classes and initials prompt structure', () => {
  const source = fs.readFileSync(overlaysJsPath, 'utf8');

  assert.match(
    source,
    /rightMonitorCornerScoreLabelEl\.className = 'right-monitor-corner-score-label';/,
    'Expected right monitor corner score label class to be applied',
  );
  assert.match(
    source,
    /rightMonitorCornerScoreValueEl\.className = 'right-monitor-corner-score-value';/,
    'Expected right monitor corner score value class to be applied',
  );
  assert.match(
    source,
    /bigTvCornerScoreInitialsPromptEl\.className = 'big-tv-corner-score-initials-prompt';/,
    'Expected initials prompt class to be applied',
  );
  assert.match(
    source,
    /bigTvCornerScoreInitialsInputEl\.className = 'big-tv-corner-score-initials-input';/,
    'Expected initials input class to be applied',
  );
  assert.match(
    source,
    /bigTvCornerScoreInitialsSubmitButtonEl\.className = 'big-tv-corner-score-initials-submit';/,
    'Expected initials submit class to be applied',
  );
  assert.match(
    source,
    /bigTvCornerScoreInitialsPromptEl\.addEventListener\('submit', \(event\) => \{\s*event\.preventDefault\(\);\s*submitCornerScoreInitials\(\);\s*\}\);/s,
    'Expected initials form submit handler to submit corner score initials',
  );
  assert.match(
    source,
    /bigTvHighScoreStatsEl\.className = 'right-monitor-cs-server-stats';/,
    'Expected right monitor server stats panel class to be applied',
  );
  assert.match(
    source,
    /rightMonitorCornerScoreServerStatsEl\.className = 'right-monitor-cs-server-stats-grid';/,
    'Expected right monitor server stats grid class to be applied',
  );
});

test('whiteboard corner score overlay uses styled stack/value/initials classes', () => {
  const source = fs.readFileSync(overlaysJsPath, 'utf8');

  assert.match(
    source,
    /el\.classList\.add\('whiteboard-corner-score-overlay'\);/,
    'Expected whiteboard corner score overlay class to be applied',
  );
  assert.match(
    source,
    /whiteboardStackEl\.className = 'whiteboard-corner-score-stack';/,
    'Expected whiteboard stack class to be applied',
  );
  assert.match(
    source,
    /whiteboardCornerScoreValueEl\.className = 'whiteboard-corner-score-value';/,
    'Expected whiteboard score value class to be applied',
  );
  assert.match(
    source,
    /whiteboardCornerScoreInitialsGroupEl\.className = 'whiteboard-corner-score-initials-group';/,
    'Expected whiteboard initials group class to be applied',
  );
  assert.match(
    source,
    /whiteboardCornerScoreInitialsEl\.className = 'whiteboard-corner-score-initials';/,
    'Expected whiteboard initials value class to be applied',
  );
  assert.doesNotMatch(
    source,
    /whiteboard-cs-server-stats/,
    'Expected whiteboard overlay to avoid rendering server stats rows',
  );
});
