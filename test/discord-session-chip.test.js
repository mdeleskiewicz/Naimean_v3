import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '..');
const indexHtmlPath = path.join(repoRoot, 'public', 'index.html');
const indexCssPath = path.join(repoRoot, 'public', 'assets', 'css', 'index.css');
const loginJsPath = path.join(repoRoot, 'public', 'assets', 'js', 'systems', 'login.js');

test('index includes the authenticated Discord session chip and logout action', () => {
  const source = fs.readFileSync(indexHtmlPath, 'utf8');

  assert.match(
    source,
    /id="discord-session-chip"/,
    'Expected the viewport Discord session chip container to be present',
  );
  assert.match(
    source,
    /id="discord-session-chip-button"/,
    'Expected the viewport Discord session chip button to be present',
  );
  assert.match(
    source,
    /id="discord-session-logout-btn"[\s\S]*Log Out/,
    'Expected the viewport Discord session chip to expose a Log Out action',
  );
});

test('Discord session chip styling keeps the control hidden until auth succeeds and anchors it top-right', () => {
  const source = fs.readFileSync(indexCssPath, 'utf8');

  assert.match(
    source,
    /\.discord-session-chip\s*\{[\s\S]*top:\s*calc\(env\(safe-area-inset-top,\s*0px\)\s*\+\s*clamp\(18px,\s*2\.8vw,\s*30px\)\);[\s\S]*right:\s*calc\(env\(safe-area-inset-right,\s*0px\)\s*\+\s*clamp\(18px,\s*2\.8vw,\s*30px\)\);[\s\S]*opacity:\s*0;[\s\S]*pointer-events:\s*none;/s,
    'Expected the viewport Discord session chip to anchor in the top-right and stay hidden by default',
  );
  assert.match(
    source,
    /\.discord-session-chip\.is-visible\s*\{[\s\S]*opacity:\s*1;[\s\S]*pointer-events:\s*auto;/s,
    'Expected the viewport Discord session chip to become interactive only after auth succeeds',
  );
  assert.match(
    source,
    /\.discord-session-chip-button\s*\{[\s\S]*box-shadow:[\s\S]*rgba\(57,\s*255,\s*20,\s*0\.58\)/s,
    'Expected the viewport Discord session chip to use the green Tron glow styling',
  );
});

test('login system refreshes Discord auth with live credentials and supports logout from the session chip', () => {
  const source = fs.readFileSync(loginJsPath, 'utf8');

  assert.match(
    source,
    /fetch\('\/api\/discord\/me',\s*\{\s*cache:\s*'no-store',\s*credentials:\s*'include',\s*signal:\s*controller\.signal\s*\}\)/,
    'Expected Discord auth refresh to bypass cache and include cookies',
  );
  assert.match(
    source,
    /fetch\('\/api\/discord\/logout',\s*\{\s*method:\s*'POST',\s*credentials:\s*'include'\s*\}\)/,
    'Expected the viewport Discord session chip logout action to call the logout endpoint',
  );
});
