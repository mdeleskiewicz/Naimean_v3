import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '..');
const overlaysJsPath = path.join(repoRoot, 'public', 'assets', 'js', 'ui', 'overlays.js');
const hotspotsJsPath = path.join(repoRoot, 'public', 'assets', 'js', 'systems', 'hotspots.js');
const loginJsPath = path.join(repoRoot, 'public', 'assets', 'js', 'systems', 'login.js');
const toolsJsPath = path.join(repoRoot, 'public', 'assets', 'js', 'systems', 'tools.js');

test('GitHub quadrants bypass Discord auth while the Login quadrant still starts OAuth', () => {
  const overlaysSource = fs.readFileSync(overlaysJsPath, 'utf8');
  const hotspotsSource = fs.readFileSync(hotspotsJsPath, 'utf8');
  const loginSource = fs.readFileSync(loginJsPath, 'utf8');

  assert.match(
    overlaysSource,
    /segment\.addEventListener\('click', \(\) => \{[\s\S]*shouldAutoStartDiscordLoginOnNextLoginActivation = nextState === 'login' && !state\.discordAuthState\?\.authenticated[\s\S]*activateLeftMonitorQuadrant\(nextState\)/,
    'Expected the Login quadrant click path to mark unauthenticated users for Discord OAuth before activating login mode',
  );
  assert.doesNotMatch(
    overlaysSource,
    /segment\.addEventListener\('click', \(\) => \{[\s\S]*ensureDiscordAuthForQuadrantAction/,
    'Expected left monitor quadrant selection to stop forcing Discord auth before reaching the Login quadrant',
  );
  assert.match(
    overlaysSource,
    /btn\.addEventListener\('click', \(e\) => \{[\s\S]*window\.open\(url, '_blank', 'noopener,noreferrer'\)/,
    'Expected GitHub quadrant buttons to open their URLs directly',
  );
  assert.doesNotMatch(
    overlaysSource,
    /btn\.addEventListener\('click', \(e\) => \{[\s\S]*ensureDiscordAuthForQuadrantAction[\s\S]*window\.open\(url, '_blank', 'noopener,noreferrer'\)/,
    'Expected GitHub quadrant button clicks to stop forcing Discord auth before opening URLs',
  );
  assert.match(
    hotspotsSource,
    /if \(spot\.id === MONITOR_GROUP_LEFT_CONTROL_ID\) \{[\s\S]*if \(state\.isGithubScreensaverMode && state\.bigTvGithubQuadrantEl\) \{[\s\S]*githubBtn\.click\(\)[\s\S]*leftMonitorSegmentButtonsByState\.get/,
    'Expected left monitor hotspot routing to keep forwarding GitHub quadrants and standard monitor quadrants',
  );
  assert.doesNotMatch(
    hotspotsSource,
    /if \(spot\.id === MONITOR_GROUP_LEFT_CONTROL_ID\) \{[\s\S]*ensureDiscordAuthForQuadrantAction/,
    'Expected left monitor hotspot quadrant routing to stop forcing Discord auth before routing clicks',
  );
  assert.match(
    loginSource,
    /beginDiscordLoginFlow[\s\S]*window\.location\.assign\('\/api\/discord\/auth'\);/,
    'Expected the Login quadrant flow to remain the place that sends users into Discord OAuth',
  );
});

test('authenticated Join Discord action routes through the secret prompt flow', () => {
  const source = fs.readFileSync(loginJsPath, 'utf8');

  assert.match(
    source,
    /function handleDiscordJoinButtonAction\(\) \{[\s\S]*if \(state\.discordAuthState\?\.authenticated\) \{[\s\S]*activateBigTvPromptMode\?\.\(\);/,
    'Expected authenticated Join Discord action to trigger the secret prompt flow',
  );
  assert.doesNotMatch(
    source,
    /window\.location\.assign\(DISCORD_GUEST_INVITE_URL\);/,
    'Expected direct Discord guest invite redirects to be removed from login button handler',
  );
});

test('Discord guest invite redirect happens only after successful final rickroll', () => {
  const source = fs.readFileSync(toolsJsPath, 'utf8');

  assert.match(
    source,
    /const rickrollEnded = await playBigTvVideoPass\(sequenceToken, BIG_TV_RICKROLL_VIDEO_URL\);\s*if \(rickrollEnded && sequenceToken === state\.bigTvPromptSequenceToken\) \{\s*window\.location\.assign\(DISCORD_GUEST_INVITE_URL\);/s,
    'Expected guest invite redirect to run only after the terminal rickroll pass for the active secret sequence',
  );
});
