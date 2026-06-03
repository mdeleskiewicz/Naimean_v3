(() => {
  'use strict';

  const MOTION_KEY = 'naimean.pref.motionReduced';
  const VOLUME_KEY = 'naimean.pref.masterVolume';
  const CALENDAR_HIDDEN_LABELS_KEY = 'calendar_hidden_labels';
  const CALENDAR_LABEL_RENAMES_KEY = 'calendar_label_renames';
  const CALENDAR_COLOR_NAMES_KEY = 'calendar_colorTypeNames';
  const BIG_TV_TOOLS_KEY = 'naimean.bigTvTools.entries';
  const ARCADE_URL_OVERRIDES_KEY = 'naimean.arcade.urlOverrides';
  const DEN_URL_OVERRIDES_KEY = 'naimean.den.urlOverrides';
  const SETTINGS_QUERY_PARAM = 'settings';

  const preferenceDefinitions = [
    { key: MOTION_KEY, type: 'boolean', defaultValue: false },
    { key: VOLUME_KEY, type: 'number', defaultValue: 1 },
    { key: CALENDAR_HIDDEN_LABELS_KEY, type: 'array', defaultValue: [] },
    { key: CALENDAR_LABEL_RENAMES_KEY, type: 'object', defaultValue: {} },
    { key: CALENDAR_COLOR_NAMES_KEY, type: 'object', defaultValue: {} },
    { key: BIG_TV_TOOLS_KEY, type: 'array', defaultValue: [] },
    { key: ARCADE_URL_OVERRIDES_KEY, type: 'object', defaultValue: {} },
    { key: DEN_URL_OVERRIDES_KEY, type: 'object', defaultValue: {} }
  ];

  const byKey = new Map(preferenceDefinitions.map((definition) => [definition.key, definition]));

  const state = {
    [MOTION_KEY]: false,
    [VOLUME_KEY]: 1,
    [CALENDAR_HIDDEN_LABELS_KEY]: [],
    [CALENDAR_LABEL_RENAMES_KEY]: {},
    [CALENDAR_COLOR_NAMES_KEY]: {},
    [BIG_TV_TOOLS_KEY]: [],
    [ARCADE_URL_OVERRIDES_KEY]: {},
    [DEN_URL_OVERRIDES_KEY]: {}
  };

  let modalEl = null;
  let statusEl = null;
  let volumeValueEl = null;
  let motionToggleEl = null;
  let volumeSliderEl = null;
  let hiddenLabelsInputEl = null;
  let labelRenamesInputEl = null;
  let colorNamesInputEl = null;
  let toolsInputEl = null;
  let arcadeOverridesInputEl = null;
  let denOverridesInputEl = null;
  let authState = 'unknown';
  let syncTimerId = null;

  function safeParse(value, fallback) {
    if (typeof value !== 'string' || !value.trim()) return fallback;
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  function cloneDefaultValue(definition) {
    if (Array.isArray(definition.defaultValue)) return [...definition.defaultValue];
    if (definition.defaultValue && typeof definition.defaultValue === 'object') return { ...definition.defaultValue };
    return definition.defaultValue;
  }

  function normalizePreferenceValue(definition, value) {
    if (!definition) return value;
    if (definition.type === 'boolean') return Boolean(value);
    if (definition.type === 'number') {
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) return definition.defaultValue;
      return Math.min(1, Math.max(0, parsed));
    }
    if (definition.type === 'array') return Array.isArray(value) ? value : cloneDefaultValue(definition);
    if (definition.type === 'object') {
      return value && typeof value === 'object' && !Array.isArray(value)
        ? value
        : cloneDefaultValue(definition);
    }
    return value;
  }

  function readLocalPreference(definition) {
    try {
      const raw = window.localStorage.getItem(definition.key);
      if (raw === null) return cloneDefaultValue(definition);
      if (definition.type === 'number') {
        const parsedJson = safeParse(raw, null);
        if (typeof parsedJson === 'number') return normalizePreferenceValue(definition, parsedJson);
        return normalizePreferenceValue(definition, Number(raw));
      }
      if (definition.type === 'boolean') {
        const parsedJson = safeParse(raw, null);
        if (typeof parsedJson === 'boolean') return parsedJson;
        return raw === 'true';
      }
      return normalizePreferenceValue(definition, safeParse(raw, cloneDefaultValue(definition)));
    } catch {
      return cloneDefaultValue(definition);
    }
  }

  function writeLocalPreference(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignore storage failures.
    }
  }

  function dispatchPreferenceEvent(key, value) {
    window.dispatchEvent(new CustomEvent('naimean:user-preference-change', {
      detail: { key, value }
    }));
  }

  function applyMotionPreference(value) {
    const enabled = Boolean(value);
    document.documentElement.classList.toggle('naimean-reduced-motion', enabled);
    dispatchPreferenceEvent(MOTION_KEY, enabled);
  }

  function ensureMediaVolume(element) {
    if (!(element instanceof HTMLMediaElement)) return;
    const master = normalizePreferenceValue(byKey.get(VOLUME_KEY), state[VOLUME_KEY]);
    const previousMaster = Number.parseFloat(element.dataset.naimeanAppliedMaster || '');
    let baseVolume = Number.parseFloat(element.dataset.naimeanBaseVolume || '');
    if (!Number.isFinite(baseVolume)) {
      baseVolume = master > 0 ? element.volume / master : element.volume;
    }
    const expectedVolume = Math.min(1, Math.max(0, baseVolume * master));
    if (Number.isFinite(previousMaster) && Math.abs(previousMaster - master) < 0.0001) {
      if (Math.abs(element.volume - expectedVolume) > 0.03) {
        baseVolume = master > 0 ? element.volume / master : element.volume;
      }
    }
    const nextVolume = Math.min(1, Math.max(0, baseVolume * master));
    element.dataset.naimeanBaseVolume = String(Math.min(1, Math.max(0, baseVolume)));
    element.dataset.naimeanAppliedMaster = String(master);
    element.volume = nextVolume;
  }

  function applyVolumePreference() {
    const master = normalizePreferenceValue(byKey.get(VOLUME_KEY), state[VOLUME_KEY]);
    document.documentElement.style.setProperty('--naimean-master-volume', String(master));
    dispatchPreferenceEvent(VOLUME_KEY, master);
    document.querySelectorAll('audio,video').forEach((element) => ensureMediaVolume(element));
  }

  function applyState() {
    applyMotionPreference(state[MOTION_KEY]);
    applyVolumePreference();
  }

  function parseJsonInput(rawValue, definition) {
    const parsed = safeParse(rawValue, null);
    if (parsed === null && rawValue.trim() !== 'null') {
      throw new Error('Invalid JSON');
    }
    return normalizePreferenceValue(definition, parsed);
  }

  function asPrettyJson(value) {
    return JSON.stringify(value, null, 2);
  }

  function setStatus(text, mode = 'neutral') {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.dataset.mode = mode;
  }

  async function savePreferenceToServer(key, value) {
    try {
      const response = await fetch('/api/user-preferences', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ key, value })
      });
      if (response.status === 401) {
        authState = 'unauthenticated';
        setStatus('Saved locally. Sign in to sync.', 'neutral');
        return;
      }
      if (!response.ok) {
        setStatus('Saved locally. Sync failed.', 'warning');
        return;
      }
      authState = 'authenticated';
      setStatus('Saved and synced.', 'success');
    } catch {
      setStatus('Saved locally. Sync unavailable.', 'warning');
    }
  }

  async function savePreference(key, value) {
    const definition = byKey.get(key);
    if (!definition) return;
    const normalized = normalizePreferenceValue(definition, value);
    state[key] = normalized;
    writeLocalPreference(key, normalized);
    if (key === MOTION_KEY || key === VOLUME_KEY) {
      applyState();
    }
    renderFormValues();
    void savePreferenceToServer(key, normalized);
  }

  function renderFormValues() {
    if (!modalEl) return;
    if (motionToggleEl) motionToggleEl.checked = Boolean(state[MOTION_KEY]);
    if (volumeSliderEl) volumeSliderEl.value = String(Math.round((state[VOLUME_KEY] || 0) * 100));
    if (volumeValueEl) volumeValueEl.textContent = `${Math.round((state[VOLUME_KEY] || 0) * 100)}%`;
    if (hiddenLabelsInputEl) hiddenLabelsInputEl.value = (state[CALENDAR_HIDDEN_LABELS_KEY] || []).join(', ');
    if (labelRenamesInputEl) labelRenamesInputEl.value = asPrettyJson(state[CALENDAR_LABEL_RENAMES_KEY]);
    if (colorNamesInputEl) colorNamesInputEl.value = asPrettyJson(state[CALENDAR_COLOR_NAMES_KEY]);
    if (toolsInputEl) toolsInputEl.value = asPrettyJson(state[BIG_TV_TOOLS_KEY]);
    if (arcadeOverridesInputEl) arcadeOverridesInputEl.value = asPrettyJson(state[ARCADE_URL_OVERRIDES_KEY]);
    if (denOverridesInputEl) denOverridesInputEl.value = asPrettyJson(state[DEN_URL_OVERRIDES_KEY]);
  }

  function loadFromLocal() {
    preferenceDefinitions.forEach((definition) => {
      state[definition.key] = readLocalPreference(definition);
    });
  }

  function scheduleVolumeRefreshLoop() {
    if (syncTimerId !== null) return;
    syncTimerId = window.setInterval(() => {
      applyVolumePreference();
    }, 700);
  }

  function parseHiddenLabels(value) {
    return value
      .split(',')
      .map((label) => label.trim())
      .filter(Boolean);
  }

  function createSection({ title, description, input }) {
    const section = document.createElement('section');
    section.className = 'naimean-settings-section';
    const heading = document.createElement('h3');
    heading.textContent = title;
    const body = document.createElement('div');
    body.className = 'naimean-settings-section-body';
    const text = document.createElement('p');
    text.className = 'naimean-settings-help';
    text.textContent = description;
    body.append(text, input);
    section.append(heading, body);
    return section;
  }

  function openPanel() {
    if (!modalEl) return;
    modalEl.classList.add('is-open');
    modalEl.setAttribute('aria-hidden', 'false');
  }

  function closePanel() {
    if (!modalEl) return;
    modalEl.classList.remove('is-open');
    modalEl.setAttribute('aria-hidden', 'true');
  }

  function buildPanel() {
    if (modalEl) return;

    const styleEl = document.createElement('style');
    styleEl.textContent = `
      .naimean-reduced-motion *,
      .naimean-reduced-motion *::before,
      .naimean-reduced-motion *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
      .naimean-settings-launcher {
        position: fixed;
        right: max(16px, env(safe-area-inset-right, 0px) + 12px);
        bottom: max(16px, env(safe-area-inset-bottom, 0px) + 12px);
        z-index: 2147483000;
        border: 1px solid rgba(6, 32, 51, 0.28);
        border-radius: 999px;
        padding: 10px 16px;
        font: 600 14px/1.2 Inter, system-ui, sans-serif;
        background: linear-gradient(180deg, rgba(255,255,255,0.96), rgba(219,245,255,0.94));
        color: #062033;
        cursor: pointer;
        box-shadow: 0 0 24px rgba(88, 235, 255, 0.28);
      }
      .naimean-settings-modal {
        position: fixed;
        inset: 0;
        z-index: 2147483001;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 18px;
        background: rgba(1, 8, 14, 0.64);
      }
      .naimean-settings-modal.is-open { display: flex; }
      .naimean-settings-panel {
        width: min(920px, 100%);
        max-height: min(90vh, 860px);
        overflow: auto;
        border-radius: 18px;
        border: 1px solid rgba(255, 255, 255, 0.8);
        background:
          radial-gradient(circle at top, rgba(255, 255, 255, 0.24), rgba(255, 255, 255, 0) 42%),
          linear-gradient(180deg, rgba(245, 252, 255, 0.96), rgba(227, 247, 255, 0.94));
        color: #062033;
        box-shadow:
          inset 0 0 0 1px rgba(255, 255, 255, 0.9),
          inset 0 0 80px rgba(112, 238, 255, 0.3),
          0 0 48px rgba(255, 255, 255, 0.18);
      }
      .naimean-settings-header {
        position: sticky;
        top: 0;
        z-index: 2;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 14px 16px;
        border-bottom: 1px solid rgba(6, 32, 51, 0.16);
        background: #f7f2e8;
      }
      .naimean-settings-header h2 {
        margin: 0;
        font-size: 18px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .naimean-settings-close {
        border: 1px solid rgba(6, 32, 51, 0.2);
        border-radius: 10px;
        padding: 6px 10px;
        background: rgba(255, 255, 255, 0.8);
        color: #062033;
        cursor: pointer;
      }
      .naimean-settings-body {
        padding: 14px 16px 20px;
        display: grid;
        gap: 12px;
      }
      .naimean-settings-section {
        border: 1px solid rgba(6, 32, 51, 0.14);
        border-radius: 14px;
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(230, 247, 255, 0.86));
        box-shadow: 0 0 24px rgba(88, 235, 255, 0.12);
        padding: 10px 12px;
      }
      .naimean-settings-section h3 {
        margin: 0 0 8px;
        font-size: 14px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .naimean-settings-help {
        margin: 0 0 8px;
        font-size: 12px;
        color: rgba(6, 32, 51, 0.72);
      }
      .naimean-settings-section input[type='text'],
      .naimean-settings-section textarea,
      .naimean-settings-section input[type='range'] {
        width: 100%;
        border: 1px solid rgba(6, 32, 51, 0.16);
        border-radius: 10px;
        padding: 8px;
        background: rgba(255, 255, 255, 0.9);
        color: #062033;
      }
      .naimean-settings-section textarea { min-height: 90px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
      .naimean-settings-toggle-row,
      .naimean-settings-volume-row {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .naimean-settings-status {
        margin: 0;
        font-size: 12px;
        color: rgba(6, 32, 51, 0.72);
      }
      .naimean-settings-status[data-mode='success'] { color: #0e7a42; }
      .naimean-settings-status[data-mode='warning'] { color: #925f00; }
    `;
    document.head.appendChild(styleEl);

    const launcherButton = document.createElement('button');
    launcherButton.type = 'button';
    launcherButton.className = 'naimean-settings-launcher';
    launcherButton.textContent = '⚙ Settings';
    launcherButton.addEventListener('click', () => openPanel());

    modalEl = document.createElement('div');
    modalEl.className = 'naimean-settings-modal';
    modalEl.setAttribute('aria-hidden', 'true');
    modalEl.addEventListener('click', (event) => {
      if (event.target === modalEl) closePanel();
    });

    const panel = document.createElement('div');
    panel.className = 'naimean-settings-panel';
    panel.addEventListener('click', (event) => event.stopPropagation());

    const header = document.createElement('header');
    header.className = 'naimean-settings-header';
    const title = document.createElement('h2');
    title.textContent = 'Global Settings';
    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'naimean-settings-close';
    closeButton.textContent = 'Close';
    closeButton.addEventListener('click', () => closePanel());
    header.append(title, closeButton);

    const body = document.createElement('div');
    body.className = 'naimean-settings-body';

    motionToggleEl = document.createElement('input');
    motionToggleEl.type = 'checkbox';
    motionToggleEl.addEventListener('change', () => {
      void savePreference(MOTION_KEY, motionToggleEl.checked);
    });
    const motionRow = document.createElement('label');
    motionRow.className = 'naimean-settings-toggle-row';
    motionRow.append(motionToggleEl, document.createTextNode('Reduce motion / parallax effects'));
    body.appendChild(createSection({
      title: 'Motion',
      description: 'Reduce camera movement and animations for accessibility.',
      input: motionRow
    }));

    volumeSliderEl = document.createElement('input');
    volumeSliderEl.type = 'range';
    volumeSliderEl.min = '0';
    volumeSliderEl.max = '100';
    volumeSliderEl.step = '1';
    volumeSliderEl.addEventListener('input', () => {
      const volume = Number(volumeSliderEl.value) / 100;
      state[VOLUME_KEY] = volume;
      applyVolumePreference();
      renderFormValues();
    });
    volumeSliderEl.addEventListener('change', () => {
      const volume = Number(volumeSliderEl.value) / 100;
      void savePreference(VOLUME_KEY, volume);
    });
    volumeValueEl = document.createElement('strong');
    const volumeRow = document.createElement('div');
    volumeRow.className = 'naimean-settings-volume-row';
    volumeRow.append(volumeSliderEl, volumeValueEl);
    body.appendChild(createSection({
      title: 'Volume',
      description: 'Master level applied to audio/video elements.',
      input: volumeRow
    }));

    hiddenLabelsInputEl = document.createElement('input');
    hiddenLabelsInputEl.type = 'text';
    hiddenLabelsInputEl.placeholder = 'Personal, Work';
    hiddenLabelsInputEl.addEventListener('change', () => {
      void savePreference(CALENDAR_HIDDEN_LABELS_KEY, parseHiddenLabels(hiddenLabelsInputEl.value));
    });
    body.appendChild(createSection({
      title: 'Calendar hidden labels',
      description: 'Comma-separated labels hidden in calendar filters.',
      input: hiddenLabelsInputEl
    }));

    labelRenamesInputEl = document.createElement('textarea');
    labelRenamesInputEl.addEventListener('change', () => {
      try {
        const parsed = parseJsonInput(labelRenamesInputEl.value, byKey.get(CALENDAR_LABEL_RENAMES_KEY));
        void savePreference(CALENDAR_LABEL_RENAMES_KEY, parsed);
      } catch {
        setStatus('Label renames must be valid JSON object.', 'warning');
      }
    });
    body.appendChild(createSection({
      title: 'Calendar label renames',
      description: 'JSON object map: original label => renamed label.',
      input: labelRenamesInputEl
    }));

    colorNamesInputEl = document.createElement('textarea');
    colorNamesInputEl.addEventListener('change', () => {
      try {
        const parsed = parseJsonInput(colorNamesInputEl.value, byKey.get(CALENDAR_COLOR_NAMES_KEY));
        void savePreference(CALENDAR_COLOR_NAMES_KEY, parsed);
      } catch {
        setStatus('Calendar color names must be valid JSON object.', 'warning');
      }
    });
    body.appendChild(createSection({
      title: 'Calendar color names',
      description: 'JSON object map: hex color => saved name.',
      input: colorNamesInputEl
    }));

    toolsInputEl = document.createElement('textarea');
    toolsInputEl.addEventListener('change', () => {
      try {
        const parsed = parseJsonInput(toolsInputEl.value, byKey.get(BIG_TV_TOOLS_KEY));
        void savePreference(BIG_TV_TOOLS_KEY, parsed);
      } catch {
        setStatus('Big TV tools must be valid JSON array.', 'warning');
      }
    });
    body.appendChild(createSection({
      title: 'Big TV tools entries',
      description: 'JSON array used by the Big TV Tools menu.',
      input: toolsInputEl
    }));

    arcadeOverridesInputEl = document.createElement('textarea');
    arcadeOverridesInputEl.addEventListener('change', () => {
      try {
        const parsed = parseJsonInput(arcadeOverridesInputEl.value, byKey.get(ARCADE_URL_OVERRIDES_KEY));
        void savePreference(ARCADE_URL_OVERRIDES_KEY, parsed);
      } catch {
        setStatus('Arcade overrides must be valid JSON object.', 'warning');
      }
    });
    body.appendChild(createSection({
      title: 'Arcade URL overrides',
      description: 'JSON object of cabinet id => custom URL.',
      input: arcadeOverridesInputEl
    }));

    denOverridesInputEl = document.createElement('textarea');
    denOverridesInputEl.addEventListener('change', () => {
      try {
        const parsed = parseJsonInput(denOverridesInputEl.value, byKey.get(DEN_URL_OVERRIDES_KEY));
        void savePreference(DEN_URL_OVERRIDES_KEY, parsed);
      } catch {
        setStatus('Den URL overrides must be valid JSON object.', 'warning');
      }
    });
    body.appendChild(createSection({
      title: 'Den URL overrides',
      description: 'JSON object of hotspot id => custom URL.',
      input: denOverridesInputEl
    }));

    statusEl = document.createElement('p');
    statusEl.className = 'naimean-settings-status';
    statusEl.textContent = 'Loading preferences…';
    body.appendChild(statusEl);

    panel.append(header, body);
    modalEl.appendChild(panel);

    document.body.append(launcherButton, modalEl);

    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && modalEl.classList.contains('is-open')) {
        closePanel();
      }
    });

    window.NaimeanSettingsPanel = {
      open: openPanel,
      close: closePanel,
      toggle() {
        if (!modalEl) return;
        if (modalEl.classList.contains('is-open')) closePanel();
        else openPanel();
      }
    };

    window.addEventListener('naimean:open-settings', () => openPanel());

    renderFormValues();
  }

  async function hydrateFromServer() {
    try {
      const response = await fetch('/api/user-preferences', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store'
      });
      if (response.status === 401) {
        authState = 'unauthenticated';
        setStatus('Using local preferences. Sign in to sync.', 'neutral');
        return;
      }
      if (!response.ok) {
        setStatus('Using local preferences. Server sync unavailable.', 'warning');
        return;
      }
      authState = 'authenticated';
      const body = await response.json().catch(() => ({}));
      const preferences = body && body.preferences && typeof body.preferences === 'object'
        ? body.preferences
        : {};
      preferenceDefinitions.forEach((definition) => {
        if (!Object.prototype.hasOwnProperty.call(preferences, definition.key)) return;
        const normalized = normalizePreferenceValue(definition, preferences[definition.key]);
        state[definition.key] = normalized;
        writeLocalPreference(definition.key, normalized);
      });
      applyState();
      renderFormValues();
      setStatus('Loaded and synced with your account.', 'success');
    } catch {
      setStatus('Using local preferences. Network unavailable.', 'warning');
    }
  }

  function maybeOpenFromQueryString() {
    const params = new URLSearchParams(window.location.search);
    const value = params.get(SETTINGS_QUERY_PARAM);
    if (value !== '1' && value !== 'true') return;
    openPanel();
  }

  loadFromLocal();
  applyState();
  scheduleVolumeRefreshLoop();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      buildPanel();
      maybeOpenFromQueryString();
      void hydrateFromServer();
    }, { once: true });
  } else {
    buildPanel();
    maybeOpenFromQueryString();
    void hydrateFromServer();
  }
})();
