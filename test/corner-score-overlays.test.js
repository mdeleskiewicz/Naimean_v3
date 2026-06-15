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
    /bigTvHighScoreStatsEl\.className = 'big-tv-high-score-stats';/,
    'Expected big TV CornerScore metrics panel class to be applied',
  );
  assert.match(
    source,
    /highScoreStatsGridEl\.className = 'big-tv-high-score-stats-grid';/,
    'Expected big TV CornerScore metrics panel grid class to be applied',
  );
  assert.match(
    source,
    /quadrantEl\.className = `big-tv-corner-score-quadrant \$\{cls\}`;/,
    'Expected metrics panel quadrants to be created for each DVD corner',
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

test('middle monitor group no longer creates the CornerScore server/static overlay', () => {
  const source = fs.readFileSync(overlaysJsPath, 'utf8');
  const middleMonitorBlockStart = source.indexOf('if (overlay.id === MONITOR_GROUP_MIDDLE_ID) {');

  assert.notEqual(middleMonitorBlockStart, -1, 'Expected middle monitor group overlay block in overlays.js');

  const powerButtonBlockStart = source.indexOf('if (overlay.id === COMMODORE_POWER_BUTTON_OVERLAY_ID) {', middleMonitorBlockStart);
  const middleMonitorBlock = source.slice(middleMonitorBlockStart, powerButtonBlockStart === -1 ? source.length : powerButtonBlockStart);

  assert.doesNotMatch(
    middleMonitorBlock,
    /middleMonitorCornerScoreOverlayEl|middleMonitorCornerScoreServerStatsEl/,
    'Expected middle monitor group overlay block to avoid creating a server score overlay',
  );
  assert.match(
    middleMonitorBlock,
    /state\.commodoreShadowOverlayEl = shadowLayer;/,
    'Expected middle monitor group overlay block to keep the Commodore power shadow layer',
  );
});
