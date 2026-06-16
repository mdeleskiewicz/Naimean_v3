import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '..');
const overlaysJsPath = path.join(repoRoot, 'public', 'assets', 'js', 'ui', 'overlays.js');
const hotspotsJsPath = path.join(repoRoot, 'public', 'assets', 'js', 'systems', 'hotspots.js');
const loginJsPath = path.join(repoRoot, 'public', 'assets', 'js', 'systems', 'login.js');
const toolsJsPath = path.join(repoRoot, 'public', 'assets', 'js', 'systems', 'tools.js');

test('DVD quadrant click paths require Discord auth before launching actions', () => {
  const overlaysSource = fs.readFileSync(overlaysJsPath, 'utf8');
  const hotspotsSource = fs.readFileSync(hotspotsJsPath, 'utf8');

  assert.match(
    overlaysSource,
    /segment\.addEventListener\('click', async \(\) => \{[\s\S]*ensureDiscordAuthForQuadrantAction/,
    'Expected left monitor segment clicks to gate quadrant actions behind Discord auth',
  );
  assert.match(
    overlaysSource,
    /btn\.addEventListener\('click', async \(e\) => \{[\s\S]*ensureDiscordAuthForQuadrantAction[\s\S]*window\.open\(url, '_blank', 'noopener,noreferrer'\)/,
    'Expected GitHub/DVD quadrant button clicks to require Discord auth before opening URLs',
  );
  assert.match(
    hotspotsSource,
    /if \(spot\.id === MONITOR_GROUP_LEFT_CONTROL_ID\) \{[\s\S]*ensureDiscordAuthForQuadrantAction[\s\S]*githubBtn\.click\(\)[\s\S]*leftMonitorSegmentButtonsByState\.get/,
    'Expected left monitor hotspot quadrant routing to require Discord auth',
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
