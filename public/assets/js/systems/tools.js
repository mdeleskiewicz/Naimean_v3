import { AQUARIUM_STATIC_VIDEO_URL, BIG_TV_PROMPT_ACCEPTED_VALUE, BIG_TV_PROMPT_MIN_LOCAL_SCORE, BIG_TV_PROMPT_PREFIX, BIG_TV_PROMPT_SECRET_TEXT, BIG_TV_RICKROLL_VIDEO_URL, BIG_TV_TOOLS_LOGO_URL, BIG_TV_TOOLS_MAX_NAME_LENGTH, BIG_TV_TOOLS_MAX_URL_LENGTH, BIG_TV_TOOLS_STORAGE_KEY, DEN_ORCH_CARDS_STORAGE_KEY, DEN_ORCH_CARD_DEFAULTS, DEN_ORCH_CARD_MAX_FIELD_LENGTH, DISCORD_GUEST_INVITE_URL, MONITOR_CONTENT_MAX_DURATION_MS, MONITOR_CONTENT_MIN_DURATION_MS, MONITOR_STATIC_MAX_DURATION_MS, MONITOR_STATIC_MIN_DURATION_MS, NEDRY_GATE_VIDEO_URL, NOTES_URL, ZELDA_SECRET_AUDIO_URL } from '../core/constants.js';
import { state } from '../core/state.js';
import { wait } from '../core/utils.js';
import { waitForMediaPlaybackToEnd } from '../core/media.js';
import { ensureDebugSaveAccess } from './hotspots.js';

function loadBigTvToolsEntries() {
  try {
    const storedValue = window.localStorage.getItem(BIG_TV_TOOLS_STORAGE_KEY);
    if (!storedValue) {
      return [];
    }
    const parsedValue = JSON.parse(storedValue);
    if (!Array.isArray(parsedValue)) {
      return [];
    }
    return parsedValue
      .map(normalizeBigTvToolEntry)
      .filter((entry) => entry.name || entry.url);
  } catch (error) {
    console.warn('Unable to load big TV tools entries.', error);
    return [];
  }
}

function normalizeBigTvToolEntry(entry) {
  return {
    name: typeof entry?.name === 'string' ? entry.name.slice(0, BIG_TV_TOOLS_MAX_NAME_LENGTH) : '',
    url: typeof entry?.url === 'string' ? entry.url.slice(0, BIG_TV_TOOLS_MAX_URL_LENGTH) : ''
  };
}

function saveBigTvToolsEntries() {
  if (!ensureDebugSaveAccess()) {
    return;
  }
  try {
    const sanitizedEntries = state.bigTvToolsEntries.map(normalizeBigTvToolEntry);
    state.bigTvToolsEntries = sanitizedEntries;
    window.localStorage.setItem(BIG_TV_TOOLS_STORAGE_KEY, JSON.stringify(sanitizedEntries));
  } catch (error) {
    console.warn('Unable to save big TV tools entries.', error);
  }
}

function updateBigTvToolEntry(index, field, value) {
  if (!state.bigTvToolsEntries[index] || (field !== 'name' && field !== 'url')) {
    return;
  }
  state.bigTvToolsEntries[index][field] = value;
  saveBigTvToolsEntries();
}

function normalizeDenOrchCardEntry(defaultEntry, storedEntry) {
  const clampStr = (v, max) => typeof v === 'string' ? v.slice(0, max) : '';
  return {
    id: defaultEntry.id,
    name: clampStr(storedEntry?.name ?? defaultEntry.name, DEN_ORCH_CARD_MAX_FIELD_LENGTH) || defaultEntry.name,
    trigger: clampStr(storedEntry?.trigger ?? defaultEntry.trigger, DEN_ORCH_CARD_MAX_FIELD_LENGTH) || defaultEntry.trigger,
    leftMonitor: clampStr(storedEntry?.leftMonitor ?? defaultEntry.leftMonitor, DEN_ORCH_CARD_MAX_FIELD_LENGTH) || defaultEntry.leftMonitor,
    rightMonitor: clampStr(storedEntry?.rightMonitor ?? defaultEntry.rightMonitor, DEN_ORCH_CARD_MAX_FIELD_LENGTH) || defaultEntry.rightMonitor
  };
}

function loadDenOrchCards() {
  let stored = {};
  try {
    const raw = window.localStorage.getItem(DEN_ORCH_CARDS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        stored = parsed;
      }
    }
  } catch (error) {
    console.warn('Unable to load den orchestration cards.', error);
  }
  return DEN_ORCH_CARD_DEFAULTS.map((def) => normalizeDenOrchCardEntry(def, stored[def.id]));
}

function saveDenOrchCards() {
  if (!ensureDebugSaveAccess()) {
    return;
  }
  try {
    const overrides = {};
    state.bigTvOrchCardsEntries.forEach((entry, i) => {
      const def = DEN_ORCH_CARD_DEFAULTS[i];
      if (!def) return;
      const normalized = normalizeDenOrchCardEntry(def, entry);
      const hasChange = normalized.name !== def.name ||
        normalized.trigger !== def.trigger ||
        normalized.leftMonitor !== def.leftMonitor ||
        normalized.rightMonitor !== def.rightMonitor;
      if (hasChange) {
        overrides[def.id] = {
          name: normalized.name,
          trigger: normalized.trigger,
          leftMonitor: normalized.leftMonitor,
          rightMonitor: normalized.rightMonitor
        };
      }
    });
    window.localStorage.setItem(DEN_ORCH_CARDS_STORAGE_KEY, JSON.stringify(overrides));
  } catch (error) {
    console.warn('Unable to save den orchestration cards.', error);
  }
}

function updateDenOrchCardEntry(index, field, value) {
  const EDITABLE_FIELDS = ['name', 'trigger', 'leftMonitor', 'rightMonitor'];
  if (!state.bigTvOrchCardsEntries[index] || !EDITABLE_FIELDS.includes(field)) {
    return;
  }
  state.bigTvOrchCardsEntries[index][field] = value;
  saveDenOrchCards();
}

function renderDenOrchCardsList() {
  if (!state.bigTvToolsListEl) {
    return;
  }
  state.bigTvToolsListEl.replaceChildren();
  state.bigTvOrchCardsEntries.forEach((entry, index) => {
    const row = document.createElement('div');
    row.className = 'big-tv-tools-menu-item orch-card-list-item';
    row.addEventListener('pointerdown', (event) => event.stopPropagation());
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'big-tv-tools-menu-item-launch';
    btn.setAttribute('aria-label', `${entry.name} — view card settings`);
    btn.addEventListener('click', (event) => {
      event.stopPropagation();
      showDenOrchCardDetail(index);
    });
    const nameEl = document.createElement('span');
    nameEl.className = 'big-tv-tools-menu-item-name';
    nameEl.textContent = entry.name;
    const triggerEl = document.createElement('span');
    triggerEl.className = 'big-tv-tools-menu-item-url';
    triggerEl.textContent = entry.trigger;
    btn.append(nameEl, triggerEl);
    row.appendChild(btn);
    state.bigTvToolsListEl.appendChild(row);
  });
}

function renderDenOrchCardDetail(index) {
  if (!state.bigTvToolsListEl) {
    return;
  }
  const entry = state.bigTvOrchCardsEntries[index];
  if (!entry) {
    return;
  }
  state.bigTvToolsListEl.replaceChildren();
  const isOwner = !!(state.discordAuthState?.hasRole);

  const FIELDS = [
    { key: 'trigger', label: 'Trigger' },
    { key: 'leftMonitor', label: 'Left Monitor State' },
    { key: 'rightMonitor', label: 'Right Monitor State' }
  ];

  FIELDS.forEach(({ key, label }) => {
    const fieldRow = document.createElement('div');
    fieldRow.className = 'orch-card-detail-field';
    const labelEl = document.createElement('span');
    labelEl.className = 'big-tv-tools-label orch-card-detail-label';
    labelEl.textContent = label;

    if (isOwner) {
      const input = document.createElement('input');
      input.className = 'big-tv-tools-input orch-card-detail-input';
      input.type = 'text';
      input.value = entry[key];
      input.setAttribute('autocomplete', 'off');
      input.addEventListener('pointerdown', (event) => event.stopPropagation());
      input.addEventListener('click', (event) => event.stopPropagation());
      input.addEventListener('input', (event) => updateDenOrchCardEntry(index, key, event.target.value));
      fieldRow.append(labelEl, input);
    } else {
      const valueEl = document.createElement('span');
      valueEl.className = 'orch-card-detail-value';
      valueEl.textContent = entry[key];
      fieldRow.append(labelEl, valueEl);
    }

    state.bigTvToolsListEl.appendChild(fieldRow);
  });
}

function renderBigTvToolsMenuEntries() {
  if (!state.bigTvToolsListEl) {
    return;
  }
  const hasVisibleEntries = state.bigTvToolsEntries.some(
    (e) => e.name.trim().length > 0 || e.url.trim().length > 0
  );
  if (state.bigTvToolsHintEl) {
    state.bigTvToolsHintEl.hidden = hasVisibleEntries;
  }
  state.bigTvToolsListEl.replaceChildren();

  // ── Built-in: Notes ──────────────────────────────────────────────
  const notesRow = document.createElement('div');
  notesRow.className = 'big-tv-tools-menu-item';
  notesRow.addEventListener('pointerdown', (event) => event.stopPropagation());
  const notesLaunchBtn = document.createElement('button');
  notesLaunchBtn.type = 'button';
  notesLaunchBtn.className = 'big-tv-tools-menu-item-launch';
  notesLaunchBtn.setAttribute('aria-label', 'Notes — opens in new tab');
  notesLaunchBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    window.open(NOTES_URL, '_blank', 'noopener,noreferrer');
  });
  const notesName = document.createElement('span');
  notesName.className = 'big-tv-tools-menu-item-name';
  notesName.textContent = 'Notes';
  const notesUrl = document.createElement('span');
  notesUrl.className = 'big-tv-tools-menu-item-url';
  notesUrl.textContent = NOTES_URL;
  notesLaunchBtn.append(notesName, notesUrl);
  notesRow.appendChild(notesLaunchBtn);
  state.bigTvToolsListEl.appendChild(notesRow);
  // ────────────────────────────────────────────────────────────────

  // ── Built-in: Den Orchestration Cards ───────────────────────────
  const orchRow = document.createElement('div');
  orchRow.className = 'big-tv-tools-menu-item';
  orchRow.addEventListener('pointerdown', (event) => event.stopPropagation());
  const orchLaunchBtn = document.createElement('button');
  orchLaunchBtn.type = 'button';
  orchLaunchBtn.className = 'big-tv-tools-menu-item-launch';
  orchLaunchBtn.setAttribute('aria-label', 'Den Orchestration Cards — view card settings');
  orchLaunchBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    showDenOrchCardsList();
  });
  const orchName = document.createElement('span');
  orchName.className = 'big-tv-tools-menu-item-name';
  orchName.textContent = 'Den Orchestration Cards';
  const orchDesc = document.createElement('span');
  orchDesc.className = 'big-tv-tools-menu-item-url';
  orchDesc.textContent = `${state.bigTvOrchCardsEntries.length} cards`;
  orchLaunchBtn.append(orchName, orchDesc);
  orchRow.appendChild(orchLaunchBtn);
  state.bigTvToolsListEl.appendChild(orchRow);
  // ────────────────────────────────────────────────────────────────

  state.bigTvToolsEntries.forEach((entry, index) => {
    const trimmedName = entry.name.trim();
    const trimmedUrl = entry.url.trim();
    const hasAnyValue = trimmedName.length > 0 || trimmedUrl.length > 0;
    if (!hasAnyValue) {
      return;
    }
    const itemRow = document.createElement('div');
    itemRow.className = 'big-tv-tools-menu-item';
    itemRow.addEventListener('pointerdown', (event) => event.stopPropagation());

    const launchButton = document.createElement('button');
    launchButton.type = 'button';
    launchButton.className = 'big-tv-tools-menu-item-launch';
    launchButton.setAttribute('aria-label', `${trimmedName || 'Unnamed Tool'} — opens in new tab`);
    launchButton.addEventListener('click', (event) => {
      event.stopPropagation();
      if (trimmedUrl) {
        window.open(trimmedUrl, '_blank', 'noopener,noreferrer');
      }
    });
    const itemName = document.createElement('span');
    itemName.className = 'big-tv-tools-menu-item-name';
    itemName.textContent = trimmedName || 'Unnamed Tool';
    const itemUrl = document.createElement('span');
    itemUrl.className = 'big-tv-tools-menu-item-url';
    itemUrl.textContent = trimmedUrl || 'No URL yet';
    launchButton.append(itemName, itemUrl);

    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.className = 'big-tv-tools-menu-item-edit';
    editButton.setAttribute('aria-label', `Edit ${trimmedName || 'tool'}`);
    editButton.textContent = '✎';
    editButton.addEventListener('pointerdown', (event) => event.stopPropagation());
    editButton.addEventListener('click', (event) => {
      event.stopPropagation();
      showBigTvToolsEditor({ focusRowIndex: index, focusField: 'url' });
    });

    itemRow.append(launchButton, editButton);
    state.bigTvToolsListEl.appendChild(itemRow);
  });
}

function renderBigTvToolsEntries({ focusRowIndex = null, focusField = 'name' } = {}) {
  if (!state.bigTvToolsListEl) {
    return;
  }
  if (state.bigTvToolsViewMode === 'orchestration-list') {
    renderDenOrchCardsList();
    return;
  }
  if (state.bigTvToolsViewMode === 'orchestration-detail') {
    renderDenOrchCardDetail(state.bigTvOrchCardDetailIndex);
    return;
  }
  if (state.bigTvToolsViewMode !== 'editor') {
    renderBigTvToolsMenuEntries();
    return;
  }
  state.bigTvToolsListEl.replaceChildren();
  if (state.bigTvToolsHintEl) {
    state.bigTvToolsHintEl.hidden = true;
  }
  state.bigTvToolsEntries.forEach((entry, index) => {
    const row = document.createElement('div');
    row.className = 'big-tv-tools-row';

    const nameField = document.createElement('label');
    nameField.className = 'big-tv-tools-field';
    const nameLabel = document.createElement('span');
    nameLabel.className = 'big-tv-tools-label';
    nameLabel.textContent = 'Tool Name';
    const nameInput = document.createElement('input');
    nameInput.className = 'big-tv-tools-input';
    nameInput.type = 'text';
    nameInput.placeholder = 'Add tool name';
    nameInput.value = entry.name;
    nameInput.setAttribute('autocomplete', 'off');
    nameInput.addEventListener('pointerdown', (event) => event.stopPropagation());
    nameInput.addEventListener('click', (event) => event.stopPropagation());
    nameInput.addEventListener('input', (event) => updateBigTvToolEntry(index, 'name', event.target.value));
    nameField.append(nameLabel, nameInput);

    const urlField = document.createElement('label');
    urlField.className = 'big-tv-tools-field';
    const urlLabel = document.createElement('span');
    urlLabel.className = 'big-tv-tools-label';
    urlLabel.textContent = 'Embed URL';
    const urlInput = document.createElement('input');
    urlInput.className = 'big-tv-tools-input';
    urlInput.type = 'url';
    urlInput.placeholder = 'Paste embed URL';
    urlInput.value = entry.url;
    urlInput.setAttribute('autocomplete', 'off');
    urlInput.addEventListener('pointerdown', (event) => event.stopPropagation());
    urlInput.addEventListener('click', (event) => event.stopPropagation());
    urlInput.addEventListener('input', (event) => updateBigTvToolEntry(index, 'url', event.target.value));
    urlInput.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') {
        return;
      }
      event.preventDefault();
      showBigTvToolsMenu();
    });
    urlField.append(urlLabel, urlInput);

    row.append(nameField, urlField);
    state.bigTvToolsListEl.appendChild(row);

    if (focusRowIndex === index) {
      const focusTarget = focusField === 'url' ? urlInput : nameInput;
      window.requestAnimationFrame(() => focusTarget.focus());
    }
  });
}

function syncBigTvToolsUiMode({ focusRowIndex = null, focusField = 'name' } = {}) {
  if (state.bigTvToolsHeaderActionButtonEl) {
    if (state.bigTvToolsViewMode === 'editor') {
      state.bigTvToolsHeaderActionButtonEl.textContent = '←';
      state.bigTvToolsHeaderActionButtonEl.setAttribute('aria-label', 'Back to tools menu');
    } else if (state.bigTvToolsViewMode === 'orchestration-list') {
      state.bigTvToolsHeaderActionButtonEl.textContent = '←';
      state.bigTvToolsHeaderActionButtonEl.setAttribute('aria-label', 'Back to tools menu');
    } else if (state.bigTvToolsViewMode === 'orchestration-detail') {
      state.bigTvToolsHeaderActionButtonEl.textContent = '←';
      state.bigTvToolsHeaderActionButtonEl.setAttribute('aria-label', 'Back to orchestration cards');
    } else {
      state.bigTvToolsHeaderActionButtonEl.textContent = '+';
      state.bigTvToolsHeaderActionButtonEl.setAttribute('aria-label', 'Add tool');
    }
  }
  const isOrchDetail = state.bigTvToolsViewMode === 'orchestration-detail';
  if (state.bigTvToolsHeaderTitleEl) {
    const entry = isOrchDetail ? state.bigTvOrchCardsEntries[state.bigTvOrchCardDetailIndex] : null;
    state.bigTvToolsHeaderTitleEl.textContent = entry ? entry.name : '';
    state.bigTvToolsHeaderTitleEl.hidden = !isOrchDetail;
  }
  if (state.bigTvToolsHintEl && state.bigTvToolsViewMode !== 'menu') {
    state.bigTvToolsHintEl.hidden = true;
  }
  if (state.bigTvToolsFooterEl) {
    state.bigTvToolsFooterEl.classList.toggle('is-hidden', state.bigTvToolsViewMode !== 'editor');
  }
  renderBigTvToolsEntries({ focusRowIndex, focusField });
}

function showBigTvToolsMenu() {
  state.bigTvToolsViewMode = 'menu';
  syncBigTvToolsUiMode();
}

function showBigTvToolsEditor({ focusRowIndex = null, focusField = 'name' } = {}) {
  state.bigTvToolsViewMode = 'editor';
  syncBigTvToolsUiMode({ focusRowIndex, focusField });
}

function showDenOrchCardsList() {
  state.bigTvToolsViewMode = 'orchestration-list';
  state.bigTvOrchCardDetailIndex = null;
  syncBigTvToolsUiMode();
}

function showDenOrchCardDetail(index) {
  state.bigTvOrchCardDetailIndex = index;
  state.bigTvToolsViewMode = 'orchestration-detail';
  syncBigTvToolsUiMode();
}

function addBigTvToolEntry() {
  state.bigTvToolsEntries.push({ name: '', url: '' });
  saveBigTvToolsEntries();
  showBigTvToolsEditor({ focusRowIndex: state.bigTvToolsEntries.length - 1 });
}

function showBigTvToolsOverlay() {
  if (!state.bigTvToolsOverlayEl) {
    return;
  }
  state.isBigTvToolsActive = true;
  showBigTvToolsMenu();
  state.bigTvToolsOverlayEl.classList.add('is-active');
  state.bigTvToolsOverlayEl.setAttribute('aria-hidden', 'false');
  state._cb.syncBigTvContentVisibility?.();
}

function hideBigTvToolsOverlay({ cancelSequence = true } = {}) {
  if (cancelSequence) {
    state.bigTvToolsSequenceToken += 1;
  }
  state.isBigTvToolsActive = false;
  if (state.bigTvToolsOverlayEl) {
    state.bigTvToolsOverlayEl.classList.remove('is-active');
    state.bigTvToolsOverlayEl.setAttribute('aria-hidden', 'true');
  }
  state.bigTvToolsViewMode = 'menu';
  saveBigTvToolsEntries();
  state._cb.syncBigTvContentVisibility?.();
}

function getRandomMonitorStaticDurationMs() {
  return MONITOR_STATIC_MIN_DURATION_MS + Math.floor(
    Math.random() * (MONITOR_STATIC_MAX_DURATION_MS - MONITOR_STATIC_MIN_DURATION_MS + 1)
  );
}

function getRandomMonitorContentDurationMs() {
  return MONITOR_CONTENT_MIN_DURATION_MS + Math.floor(
    Math.random() * (MONITOR_CONTENT_MAX_DURATION_MS - MONITOR_CONTENT_MIN_DURATION_MS + 1)
  );
}

function clearMonitorFlickerTimeouts() {
  if (state.rightMonitorFlickerTimeoutId !== null) {
    clearTimeout(state.rightMonitorFlickerTimeoutId);
    state.rightMonitorFlickerTimeoutId = null;
  }
  if (state.leftMonitorFlickerTimeoutId !== null) {
    clearTimeout(state.leftMonitorFlickerTimeoutId);
    state.leftMonitorFlickerTimeoutId = null;
  }
}

function setMonitorStaticVisibility(staticOverlayEl, staticVideoEl, shouldShowStatic) {
  if (!staticOverlayEl) {
    return;
  }
  staticOverlayEl.classList.toggle('is-active', shouldShowStatic);
  if (!staticVideoEl) {
    return;
  }
  if (shouldShowStatic) {
    staticVideoEl.currentTime = 0;
    const playPromise = staticVideoEl.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {});
    }
    return;
  }
  staticVideoEl.pause();
  staticVideoEl.currentTime = 0;
}

function scheduleRightMonitorFlicker(shouldShowStaticNext) {
  if (!state.isBigTvPromptActive) {
    state.rightMonitorFlickerTimeoutId = null;
    return;
  }
  setMonitorStaticVisibility(
    state.rightMonitorStaticOverlayEl,
    state.rightMonitorStaticVideoEl,
    shouldShowStaticNext
  );
  state.rightMonitorFlickerTimeoutId = window.setTimeout(
    () => scheduleRightMonitorFlicker(!shouldShowStaticNext),
    shouldShowStaticNext ? getRandomMonitorStaticDurationMs() : getRandomMonitorContentDurationMs()
  );
}

function scheduleLeftMonitorFlicker(shouldShowStaticNext) {
  if (!state.isBigTvPromptActive) {
    state.leftMonitorFlickerTimeoutId = null;
    return;
  }
  setMonitorStaticVisibility(
    state.leftMonitorStaticOverlayEl,
    state.leftMonitorStaticVideoEl,
    shouldShowStaticNext
  );
  state.leftMonitorFlickerTimeoutId = window.setTimeout(
    () => scheduleLeftMonitorFlicker(!shouldShowStaticNext),
    shouldShowStaticNext ? getRandomMonitorStaticDurationMs() : getRandomMonitorContentDurationMs()
  );
}

function startMonitorFlickerLoops() {
  clearMonitorFlickerTimeouts();
  const rightStartsStatic = Math.random() < 0.5;
  const leftStartsStatic = Math.random() < 0.5;
  setMonitorStaticVisibility(
    state.rightMonitorStaticOverlayEl,
    state.rightMonitorStaticVideoEl,
    rightStartsStatic
  );
  setMonitorStaticVisibility(
    state.leftMonitorStaticOverlayEl,
    state.leftMonitorStaticVideoEl,
    leftStartsStatic
  );
  state.rightMonitorFlickerTimeoutId = window.setTimeout(
    () => scheduleRightMonitorFlicker(!rightStartsStatic),
    rightStartsStatic ? getRandomMonitorStaticDurationMs() : getRandomMonitorContentDurationMs()
  );
  state.leftMonitorFlickerTimeoutId = window.setTimeout(
    () => scheduleLeftMonitorFlicker(!leftStartsStatic),
    leftStartsStatic ? getRandomMonitorStaticDurationMs() : getRandomMonitorContentDurationMs()
  );
}

function stopMonitorFlickerLoops() {
  clearMonitorFlickerTimeouts();
  setMonitorStaticVisibility(state.rightMonitorStaticOverlayEl, state.rightMonitorStaticVideoEl, false);
  setMonitorStaticVisibility(state.leftMonitorStaticOverlayEl, state.leftMonitorStaticVideoEl, false);
}

function updateBigTvPromptInput() {
  if (!state.bigTvPromptInputEl) {
    return;
  }
  state.bigTvPromptInputEl.textContent = state.bigTvPromptInputValue;
  if (state.bigTvPromptHiddenInputEl && state.bigTvPromptHiddenInputEl.value !== state.bigTvPromptInputValue) {
    state.bigTvPromptHiddenInputEl.value = state.bigTvPromptInputValue;
  }
}

function setBigTvPromptSecretRevealed(isRevealed, { temporary = false } = {}) {
  if (state.bigTvPromptSecretRevealTimeoutId) {
    window.clearTimeout(state.bigTvPromptSecretRevealTimeoutId);
    state.bigTvPromptSecretRevealTimeoutId = null;
  }
  if (!state.bigTvPromptSecretBoxEl) {
    return;
  }
  state.bigTvPromptSecretBoxEl.classList.toggle('is-revealed', isRevealed);
  if (isRevealed && temporary) {
    state.bigTvPromptSecretRevealTimeoutId = window.setTimeout(() => {
      if (state.bigTvPromptSecretBoxEl) {
        state.bigTvPromptSecretBoxEl.classList.remove('is-revealed');
      }
      state.bigTvPromptSecretRevealTimeoutId = null;
    }, 1600);
  }
}

function showBigTvPromptOverlay() {
  if (!state.bigTvPromptOverlayEl) {
    return;
  }
  state.isBigTvPromptActive = true;
  state.bigTvPromptInputValue = '';
  updateBigTvPromptInput();
  if (state.bigTvPromptSecretEl) {
    state.bigTvPromptSecretEl.textContent = BIG_TV_PROMPT_SECRET_TEXT;
  }
  setBigTvPromptSecretRevealed(false);
  state.bigTvPromptOverlayEl.classList.add('is-active');
  state._cb.syncBigTvContentVisibility?.();
  startMonitorFlickerLoops();
  if (state.bigTvPromptHiddenInputEl) {
    state.bigTvPromptHiddenInputEl.value = '';
    state.bigTvPromptHiddenInputEl.focus();
  }
}

function hideBigTvPromptOverlay({ clearInput = true } = {}) {
  state.isBigTvPromptActive = false;
  if (state.bigTvPromptOverlayEl) {
    state.bigTvPromptOverlayEl.classList.remove('is-active');
  }
  if (clearInput) {
    state.bigTvPromptInputValue = '';
    updateBigTvPromptInput();
  }
  if (state.bigTvPromptHiddenInputEl) {
    state.bigTvPromptHiddenInputEl.blur();
    state.bigTvPromptHiddenInputEl.value = '';
  }
  setBigTvPromptSecretRevealed(false);
  stopMonitorFlickerLoops();
  state._cb.syncBigTvContentVisibility?.();
}

async function playBigTvStaticPass(sequenceToken, getSequenceToken = () => state.bigTvPromptSequenceToken) {
  if (!state.aquariumStaticOverlayEl || !state.aquariumStaticVideoEl) {
    return false;
  }
  state.aquariumStaticOverlayEl.classList.add('is-active');
  state.aquariumStaticVideoEl.currentTime = 0;
  state._cb.syncBigTvContentVisibility?.();
  try {
    await state.aquariumStaticVideoEl.play();
  } catch (error) {
    if (error?.name !== 'AbortError') {
      console.warn('Unable to play big TV static overlay.', error);
    }
    return false;
  }
  const hasEnded = await waitForMediaPlaybackToEnd(state.aquariumStaticVideoEl);
  return hasEnded && sequenceToken === getSequenceToken();
}

async function playBigTvVideoPass(sequenceToken, sourceUrl) {
  if (!state.nedryGateOverlayEl || !state.nedryGateVideoEl) {
    return false;
  }
  state._cb.setNedryGateVideoSource?.(sourceUrl);
  state.nedryGateOverlayEl.classList.add('is-active');
  state.nedryGateVideoEl.currentTime = 0;
  state._cb.syncBigTvContentVisibility?.();
  try {
    await state.nedryGateVideoEl.play();
  } catch (error) {
    if (error?.name !== 'AbortError') {
      console.warn('Unable to play big TV overlay video.', error);
    }
    return false;
  }
  const hasEnded = await waitForMediaPlaybackToEnd(state.nedryGateVideoEl);
  state._cb.hideNedryGateOverlay?.();
  state._cb.setNedryGateVideoSource?.(NEDRY_GATE_VIDEO_URL);
  return hasEnded && sequenceToken === state.bigTvPromptSequenceToken;
}

function getZeldaSecretAudioElement() {
  if (!state.zeldaSecretAudioEl) {
    state.zeldaSecretAudioEl = new Audio(ZELDA_SECRET_AUDIO_URL);
    state.zeldaSecretAudioEl.preload = 'metadata';
  }
  return state.zeldaSecretAudioEl;
}

function stopZeldaSecretAudioPlayback() {
  if (!state.zeldaSecretAudioEl) {
    return;
  }
  state.zeldaSecretAudioEl.pause();
  state.zeldaSecretAudioEl.currentTime = 0;
}

async function activateBigTvToolsMode() {
  state.bigTvToolsSequenceToken += 1;
  const sequenceToken = state.bigTvToolsSequenceToken;
  state._cb.stopAquariumPlaybackSequence?.();
  hideBigTvPromptOverlay();
  state._cb.hideNedryGateOverlay?.();
  hideBigTvToolsOverlay({ cancelSequence: false });

  await playBigTvStaticPass(sequenceToken, () => state.bigTvToolsSequenceToken);
  if (sequenceToken !== state.bigTvToolsSequenceToken) {
    state._cb.hideAquariumStaticOverlay?.();
    return;
  }

  state._cb.hideAquariumStaticOverlay?.();
  showBigTvToolsOverlay();
}

function activateBigTvPromptMode() {
  if (!state.nedryGateOverlayEl || !state.nedryGateVideoEl) {
    return;
  }
  if (state.cornerScoreValue < BIG_TV_PROMPT_MIN_LOCAL_SCORE) {
    return;
  }

  hideBigTvToolsOverlay();
  state._cb.stopAquariumPlaybackSequence?.();
  stopZeldaSecretAudioPlayback();
  playBigTvPromptIntroSequence();
}

async function playBigTvPromptIntroSequence() {
  state.bigTvPromptSequenceToken += 1;
  const sequenceToken = state.bigTvPromptSequenceToken;
  hideBigTvPromptOverlay();
  state._cb.hideNedryGateOverlay?.();

  const firstStaticEnded = await playBigTvStaticPass(sequenceToken);
  if (!firstStaticEnded || sequenceToken !== state.bigTvPromptSequenceToken) {
    state._cb.hideAquariumStaticOverlay?.();
    return;
  }

  const nedryGateEnded = await playBigTvVideoPass(sequenceToken, NEDRY_GATE_VIDEO_URL);
  if (!nedryGateEnded || sequenceToken !== state.bigTvPromptSequenceToken) {
    state._cb.hideAquariumStaticOverlay?.();
    return;
  }

  const secondStaticEnded = await playBigTvStaticPass(sequenceToken);
  if (sequenceToken !== state.bigTvPromptSequenceToken) {
    state._cb.hideAquariumStaticOverlay?.();
    return;
  }

  state._cb.hideAquariumStaticOverlay?.();
  if (!secondStaticEnded) {
    console.warn('Big TV second static pass failed; showing prompt anyway.');
  }
  showBigTvPromptOverlay();
}

async function playBigTvPromptSuccessSequence() {
  state.bigTvPromptSequenceToken += 1;
  const sequenceToken = state.bigTvPromptSequenceToken;
  hideBigTvPromptOverlay();
  state._cb.hideNedryGateOverlay?.();

  const zeldaAudio = getZeldaSecretAudioElement();
  stopZeldaSecretAudioPlayback();
  const zeldaPlayPromise = zeldaAudio.play();
  if (zeldaPlayPromise && typeof zeldaPlayPromise.catch === 'function') {
    zeldaPlayPromise.catch((error) => {
      if (error?.name !== 'AbortError') {
        console.warn('Unable to play Zelda secret audio.', error);
      }
    });
  }

  // Rickroll starts as soon as static ends — do not wait for Zelda audio.
  const staticEnded = await playBigTvStaticPass(sequenceToken);

  if (sequenceToken !== state.bigTvPromptSequenceToken) {
    state._cb.hideAquariumStaticOverlay?.();
    stopZeldaSecretAudioPlayback();
    return;
  }

  state._cb.hideAquariumStaticOverlay?.();
  stopZeldaSecretAudioPlayback();
  if (!staticEnded) {
    return;
  }

  const rickrollEnded = await playBigTvVideoPass(sequenceToken, BIG_TV_RICKROLL_VIDEO_URL);
  if (rickrollEnded && sequenceToken === state.bigTvPromptSequenceToken) {
    window.location.assign(DISCORD_GUEST_INVITE_URL);
  }
}

function submitBigTvPrompt() {
  if (!state.isBigTvPromptActive) {
    return;
  }
  const submittedValue = state.bigTvPromptInputValue.trim().toLowerCase();
  state.bigTvPromptInputValue = '';
  updateBigTvPromptInput();
  if (submittedValue === BIG_TV_PROMPT_ACCEPTED_VALUE) {
    playBigTvPromptSuccessSequence();
  }
}

function handleBigTvPromptTyping(event) {
  if (!state.isBigTvPromptActive) {
    return;
  }
  if (event.metaKey || event.ctrlKey || event.altKey) {
    return;
  }
  if (event.key === 'Escape') {
    hideBigTvPromptOverlay();
    return;
  }
  if (event.key === 'Backspace') {
    event.preventDefault();
    state.bigTvPromptInputValue = state.bigTvPromptInputValue.slice(0, -1);
    updateBigTvPromptInput();
    return;
  }
  if (event.key === 'Enter') {
    event.preventDefault();
    submitBigTvPrompt();
    return;
  }
  if (event.key.length === 1) {
    event.preventDefault();
    state.bigTvPromptInputValue += event.key;
    updateBigTvPromptInput();
  }
}

state.bigTvToolsEntries = loadBigTvToolsEntries();
state.bigTvOrchCardsEntries = loadDenOrchCards();
state._cb.hideBigTvToolsOverlay = hideBigTvToolsOverlay;
state._cb.showBigTvToolsOverlay = showBigTvToolsOverlay;
state._cb.activateBigTvToolsMode = activateBigTvToolsMode;
state._cb.hideBigTvPromptOverlay = hideBigTvPromptOverlay;
state._cb.activateBigTvPromptMode = activateBigTvPromptMode;
state._cb.playBigTvStaticPass = playBigTvStaticPass;
state._cb.getZeldaSecretAudioElement = getZeldaSecretAudioElement;
state._cb.stopZeldaSecretAudioPlayback = stopZeldaSecretAudioPlayback;
state._cb.stopMonitorFlickerLoops = stopMonitorFlickerLoops;
state._cb.handleBigTvPromptTyping = handleBigTvPromptTyping;
state._cb.updateBigTvPromptInput = updateBigTvPromptInput;
state._cb.submitBigTvPrompt = submitBigTvPrompt;
state._cb.showDenOrchCardsList = showDenOrchCardsList;
state._cb.showDenOrchCardDetail = showDenOrchCardDetail;

export { loadBigTvToolsEntries, normalizeBigTvToolEntry, saveBigTvToolsEntries, updateBigTvToolEntry, normalizeDenOrchCardEntry, loadDenOrchCards, saveDenOrchCards, updateDenOrchCardEntry, renderDenOrchCardsList, renderDenOrchCardDetail, showDenOrchCardsList, showDenOrchCardDetail, renderBigTvToolsMenuEntries, renderBigTvToolsEntries, syncBigTvToolsUiMode, showBigTvToolsMenu, showBigTvToolsEditor, addBigTvToolEntry, showBigTvToolsOverlay, hideBigTvToolsOverlay, activateBigTvToolsMode, showBigTvPromptOverlay, hideBigTvPromptOverlay, setBigTvPromptSecretRevealed, updateBigTvPromptInput, activateBigTvPromptMode, playBigTvStaticPass, playBigTvVideoPass, getZeldaSecretAudioElement, stopZeldaSecretAudioPlayback, playBigTvPromptIntroSequence, playBigTvPromptSuccessSequence, submitBigTvPrompt, handleBigTvPromptTyping, getRandomMonitorStaticDurationMs, getRandomMonitorContentDurationMs, clearMonitorFlickerTimeouts, setMonitorStaticVisibility, scheduleRightMonitorFlicker, scheduleLeftMonitorFlicker, startMonitorFlickerLoops, stopMonitorFlickerLoops };
