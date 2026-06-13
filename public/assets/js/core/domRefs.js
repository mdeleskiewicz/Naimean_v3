export const dom = {
  viewport: null,
  stage: null,
  world: null,
  sceneLayer: null,
  hotspotLayer: null,
  screenOverlayLayer: null,
  effectsLayer: null,
  debugStatus: null,
  debugToggleButton: null,
  debugObjectSelect: null,
  debugObjectLockButton: null,
  debugObjectUnlockButton: null,
  debugUrlRow: null,
  debugUrlInput: null,
  debugUrlSaveButton: null,
  saveBtn: null,
  saveModal: null,
  saveModalTitle: null,
  saveModalTextarea: null,
  saveModalCloseBtn: null,
  saveModalCopyBtn: null,
  discordErrorToast: null,
  discordErrorToastMsg: null,
  discordErrorToastClose: null,
};

export function initDomRefs() {
  dom.viewport = document.getElementById('viewport');
  dom.stage = document.getElementById('stage');
  dom.world = document.getElementById('world');
  dom.sceneLayer = document.getElementById('scene-layer');
  dom.hotspotLayer = document.getElementById('hotspot-layer');
  dom.screenOverlayLayer = document.getElementById('screen-overlay-layer');
  dom.effectsLayer = document.getElementById('effects-layer');
  dom.debugStatus = document.getElementById('debug-status');
  dom.debugToggleButton = document.getElementById('debug-toggle-btn');
  dom.debugObjectSelect = document.getElementById('debug-object-select');
  dom.debugObjectLockButton = document.getElementById('debug-object-lock-btn');
  dom.debugObjectUnlockButton = document.getElementById('debug-object-unlock-btn');
  dom.debugUrlRow = document.getElementById('debug-url-row');
  dom.debugUrlInput = document.getElementById('debug-url-input');
  dom.debugUrlSaveButton = document.getElementById('debug-url-save-btn');
  dom.saveBtn = document.getElementById('save-hotspots-btn');
  dom.saveModal = document.getElementById('save-modal');
  dom.saveModalTitle = document.getElementById('save-modal-title');
  dom.saveModalTextarea = document.getElementById('save-modal-textarea');
  dom.saveModalCloseBtn = document.getElementById('save-modal-close-btn');
  dom.saveModalCopyBtn = document.getElementById('save-modal-copy-btn');
  dom.discordErrorToast = document.getElementById('discord-error-toast');
  dom.discordErrorToastMsg = document.getElementById('discord-error-toast-msg');
  dom.discordErrorToastClose = document.getElementById('discord-error-toast-close');
  return dom;
}
