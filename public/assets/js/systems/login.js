import { API_TIMEOUT_MS, DISCORD_BUTTON_IMAGE_URL, DISCORD_CDN_BASE_URL, DISCORD_GUEST_INVITE_URL, DISCORD_AVATAR_HASH_RE, DISCORD_LOGIN_FLOW_STORAGE_KEY, DISCORD_LOGIN_SEQUENCE_REDIRECT_DELAY_MS, DISCORD_LOGIN_SEQUENCE_STEP_DELAY_MS, DISCORD_LOGIN_STEP_KEYS, DISCORD_USER_ID_RE } from '../core/constants.js';
import { state } from '../core/state.js';
import { wait } from '../core/utils.js';

function syncDiscordButtonUi() {
  if (!state.discordJoinButtonEl) return;
  if (state.discordAuthState && state.discordAuthState.authenticated) {
    if (state.discordAuthState.isMember) {
      state.discordJoinButtonEl.setAttribute('aria-label', `Discord: ${state.discordAuthState.username}`);
      state.discordJoinButtonEl.title = `Signed in as ${state.discordAuthState.username}`;
    } else {
      state.discordJoinButtonEl.setAttribute('aria-label', 'Join our Discord');
      state.discordJoinButtonEl.title = 'Join our Discord';
    }
  } else if (state.discordAuthState && !state.discordAuthState.authenticated) {
    state.discordJoinButtonEl.setAttribute('aria-label', 'Sign in with Discord');
    state.discordJoinButtonEl.title = 'Sign in with Discord';
  }
  if (state.discordButtonImgEl) {
    state.discordButtonImgEl.src = state.rightMonitorOverlayImageUrl;
  }
  syncLoginOverlayUi();
  state._cb.syncDvdScreensaverState?.();
}

function syncDiscordAuthBodyClass() {
  if (state.discordAuthState && state.discordAuthState.hasRole) {
    document.body.classList.add('has-discord-role');
  } else {
    document.body.classList.remove('has-discord-role');
  }
}

async function fetchDiscordAuthState() {
  try {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), API_TIMEOUT_MS);
    const res = await fetch('/api/discord/me', { signal: controller.signal });
    window.clearTimeout(timeoutId);
    if (res.ok) {
      state.discordAuthState = await res.json();
    }
  } catch {
    // Auth state remains null if request fails
  }
  syncLoginOverlayUi();
}

function persistDiscordLoginFlowState(value) {
  try {
    sessionStorage.setItem(DISCORD_LOGIN_FLOW_STORAGE_KEY, JSON.stringify({
      showLogin: !!value?.showLogin,
      restorePowerOn: !!value?.restorePowerOn
    }));
  } catch (_) {}
}

function consumeDiscordLoginFlowState() {
  try {
    const rawValue = sessionStorage.getItem(DISCORD_LOGIN_FLOW_STORAGE_KEY);
    if (!rawValue) {
      return null;
    }
    sessionStorage.removeItem(DISCORD_LOGIN_FLOW_STORAGE_KEY);
    const parsedValue = JSON.parse(rawValue);
    if (!parsedValue || typeof parsedValue !== 'object') {
      return null;
    }
    return {
      showLogin: !!parsedValue.showLogin,
      restorePowerOn: !!parsedValue.restorePowerOn
    };
  } catch (_) {
    return null;
  }
}

function getDiscordAvatarUrl(authState) {
  if (
    !authState?.authenticated ||
    !DISCORD_USER_ID_RE.test(authState.userId || '') ||
    !DISCORD_AVATAR_HASH_RE.test(authState.avatar || '')
  ) {
    return '';
  }
  // Discord animated avatar hashes use the `a_` prefix and must be requested as GIFs.
  const extension = authState.avatar.startsWith('a_') ? 'gif' : 'png';
  const avatarUrl = new URL(
    `${DISCORD_CDN_BASE_URL}/avatars/${authState.userId}/${authState.avatar}.${extension}?size=256`
  );
  if (avatarUrl.protocol !== 'https:' || avatarUrl.hostname !== 'cdn.discordapp.com') {
    return '';
  }
  return avatarUrl.toString();
}

function syncLoginStepUi({ activeKey = null, completedKeys = [] } = {}) {
  const completedKeySet = new Set(completedKeys);
  state.loginStepElsByKey.forEach((stepEl, key) => {
    stepEl.classList.toggle('is-complete', completedKeySet.has(key));
    stepEl.classList.toggle('is-active', key === activeKey && !completedKeySet.has(key));
    stepEl.classList.toggle('is-pending', !completedKeySet.has(key) && key !== activeKey);
  });
}

function syncLoginOverlayUi({ stage = 'idle' } = {}) {
  if (
    !state.loginStatusBadgeEl ||
    !state.loginTitleEl ||
    !state.loginMessageEl ||
    !state.loginPrimaryActionButtonEl ||
    !state.loginAuthCardEl
  ) {
    return;
  }

  if (state.discordAuthState?.authenticated) {
    state.loginStatusBadgeEl.textContent = 'Connected';
    state.loginTitleEl.textContent = 'Discord account ready';
    state.loginMessageEl.textContent = state.discordAuthState.isMember
      ? 'OAuth is complete. Your Discord account details are now displayed on the big TV.'
      : 'OAuth is complete. Your Discord account is connected, but it is not yet in the server.';
    state.loginPrimaryActionButtonEl.disabled = false;
    state.loginPrimaryActionButtonEl.textContent = 'Refresh Discord Status';
    state.loginAuthCardEl.classList.remove('is-hidden');
    const avatarUrl = getDiscordAvatarUrl(state.discordAuthState);
    state.loginAuthAvatarEl.src = avatarUrl || DISCORD_BUTTON_IMAGE_URL;
    state.loginAuthAvatarEl.alt = avatarUrl && state.discordAuthState.username
      ? `${state.discordAuthState.username} Discord avatar`
      : 'Discord logo';
    state.loginAuthUsernameValueEl.textContent = state.discordAuthState.username || 'Unknown';
    state.loginAuthUserIdValueEl.textContent = state.discordAuthState.userId || 'Unavailable';
    state.loginAuthMembershipValueEl.textContent = state.discordAuthState.isMember ? 'Server member' : 'Not in server';
    state.loginAuthAccessValueEl.textContent = state.discordAuthState.hasRole ? 'Role access granted' : 'Required role missing';
    syncLoginStepUi({ completedKeys: DISCORD_LOGIN_STEP_KEYS });
    return;
  }

  state.loginAuthCardEl.classList.add('is-hidden');
  state.loginAuthAvatarEl.removeAttribute('src');
  state.loginAuthAvatarEl.alt = 'Discord avatar';
  state.loginStatusBadgeEl.textContent = 'Discord OAuth';
  state.loginPrimaryActionButtonEl.disabled = state.isDiscordLoginSequenceRunning;

  if (stage === 'starting') {
    state.loginTitleEl.textContent = 'Waking the login screen';
    state.loginMessageEl.textContent = 'Showing the login screen on the big TV before opening Discord.';
    state.loginPrimaryActionButtonEl.textContent = 'Preparing Login…';
    syncLoginStepUi({ activeKey: 'display' });
    return;
  }

  if (stage === 'oauth') {
    state.loginTitleEl.textContent = 'Opening Discord OAuth';
    state.loginMessageEl.textContent = 'Step two is underway. Discord sign-in is opening now.';
    state.loginPrimaryActionButtonEl.textContent = 'Opening Discord…';
    syncLoginStepUi({ activeKey: 'oauth', completedKeys: ['display'] });
    return;
  }

  if (stage === 'redirecting') {
    state.loginTitleEl.textContent = 'Redirecting to Discord';
    state.loginMessageEl.textContent = 'Final step before the handoff. You are being redirected to Discord now.';
    state.loginPrimaryActionButtonEl.textContent = 'Redirecting…';
    syncLoginStepUi({ activeKey: 'return', completedKeys: ['display', 'oauth'] });
    return;
  }

  state.loginTitleEl.textContent = 'Step-by-step Discord sign-in';
  state.loginMessageEl.textContent = 'Use the Login quadrant to bring up this screen, then continue into Discord OAuth.';
  state.loginPrimaryActionButtonEl.textContent = 'Start Discord Login';
  syncLoginStepUi({ activeKey: 'display' });
}

async function beginDiscordLoginFlow(flowSequenceToken = state.loginSequenceToken) {
  if (state.isDiscordLoginSequenceRunning || state.discordAuthState?.authenticated) {
    syncLoginOverlayUi();
    return;
  }

  state.isDiscordLoginSequenceRunning = true;
  syncLoginOverlayUi({ stage: 'starting' });

  try {
    await wait(DISCORD_LOGIN_SEQUENCE_STEP_DELAY_MS);
    if (flowSequenceToken !== state.loginSequenceToken || state.leftMonitorSelectedState !== 'login') {
      return;
    }

    syncLoginOverlayUi({ stage: 'oauth' });
    await wait(DISCORD_LOGIN_SEQUENCE_STEP_DELAY_MS);
    if (flowSequenceToken !== state.loginSequenceToken || state.leftMonitorSelectedState !== 'login') {
      return;
    }

    persistDiscordLoginFlowState({
      showLogin: true,
      restorePowerOn: state.isCommodorePoweringOn
    });
    syncLoginOverlayUi({ stage: 'redirecting' });
    await wait(DISCORD_LOGIN_SEQUENCE_REDIRECT_DELAY_MS);
    if (flowSequenceToken !== state.loginSequenceToken || state.leftMonitorSelectedState !== 'login') {
      return;
    }

    window.location.assign('/api/discord/auth');
  } finally {
    if (flowSequenceToken === state.loginSequenceToken) {
      state.isDiscordLoginSequenceRunning = false;
    }
    syncLoginOverlayUi();
  }
}

async function handleLoginPrimaryAction() {
  if (state.discordAuthState?.authenticated) {
    await fetchDiscordAuthState();
    syncDiscordAuthBodyClass();
    syncDiscordButtonUi();
    return;
  }

  void beginDiscordLoginFlow();
}

function showLoginOverlay() {
  if (!state.loginOverlayEl) {
    return;
  }
  state.isLoginActive = true;
  state.loginOverlayEl.classList.add('is-active');
  state.loginOverlayEl.setAttribute('aria-hidden', 'false');
  syncLoginOverlayUi();
  state._cb.syncBigTvContentVisibility?.();
}

function hideLoginOverlay({ cancelSequence = true } = {}) {
  if (cancelSequence) {
    state.loginSequenceToken += 1;
  }
  state.isLoginActive = false;
  state.isDiscordLoginSequenceRunning = false;
  if (state.loginOverlayEl) {
    state.loginOverlayEl.classList.remove('is-active');
    state.loginOverlayEl.setAttribute('aria-hidden', 'true');
  }
  state._cb.syncBigTvContentVisibility?.();
}

async function activateLoginMode() {
  state.loginSequenceToken += 1;
  const sequenceToken = state.loginSequenceToken;
  state._cb.stopAquariumPlaybackSequence?.();
  state._cb.hideBigTvPromptOverlay?.();
  state._cb.hideNedryGateOverlay?.();
  state._cb.hideBigTvToolsOverlay?.();
  hideLoginOverlay({ cancelSequence: false });

  await state._cb.playBigTvStaticPass?.(sequenceToken, () => state.loginSequenceToken);
  if (sequenceToken !== state.loginSequenceToken) {
    state._cb.hideAquariumStaticOverlay?.();
    return;
  }

  state._cb.hideAquariumStaticOverlay?.();
  showLoginOverlay();
  if (state.shouldAutoStartDiscordLoginOnNextLoginActivation && !state.discordAuthState?.authenticated) {
    state.shouldAutoStartDiscordLoginOnNextLoginActivation = false;
    void beginDiscordLoginFlow(sequenceToken);
  } else {
    state.shouldAutoStartDiscordLoginOnNextLoginActivation = false;
    syncLoginOverlayUi();
  }
}

state._cb.hideLoginOverlay = hideLoginOverlay;
state._cb.showLoginOverlay = showLoginOverlay;
state._cb.activateLoginMode = activateLoginMode;
state._cb.syncLoginOverlayUi = syncLoginOverlayUi;
state._cb.syncDiscordButtonUi = syncDiscordButtonUi;
state._cb.syncDiscordAuthBodyClass = syncDiscordAuthBodyClass;
state._cb.handleLoginPrimaryAction = handleLoginPrimaryAction;

export { persistDiscordLoginFlowState, consumeDiscordLoginFlowState, getDiscordAvatarUrl, syncLoginStepUi, syncLoginOverlayUi, beginDiscordLoginFlow, handleLoginPrimaryAction, showLoginOverlay, hideLoginOverlay, fetchDiscordAuthState, syncDiscordButtonUi, syncDiscordAuthBodyClass, activateLoginMode };
