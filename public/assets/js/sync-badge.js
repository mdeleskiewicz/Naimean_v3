/**
 * Shared sync-status badge helper.
 *
 * Usage:
 *   const badge = window.makeSyncBadge(anchorEl);
 *   badge.saving();          // show "saving…"
 *   badge.saved();           // show "saved ✓", auto-hides after 3 s
 *   badge.failed(retryFn);   // show "save failed ✗ [Retry]", persistent
 *   badge.clear();           // hide immediately
 *
 * The badge <span> is inserted immediately after `anchorEl` in the DOM.
 * Pages with fixed-position anchors should add their own CSS rule to give
 * the badge fixed positioning (e.g. `#save-hotspots-btn + .sync-badge { … }`).
 */
(function () {
  'use strict';

  if (!document.getElementById('sync-badge-css')) {
    var style = document.createElement('style');
    style.id = 'sync-badge-css';
    style.textContent = [
      '.sync-badge{',
        'display:inline-flex;align-items:center;gap:5px;',
        'font-size:0.72em;letter-spacing:0.04em;',
        'padding:3px 8px;border-radius:3px;',
        'opacity:0;transition:opacity 0.2s;',
        'white-space:nowrap;vertical-align:middle;pointer-events:none;',
      '}',
      '.sync-badge[data-state]{opacity:1;pointer-events:auto;}',
      '.sync-badge[data-state="saving"]{color:#aaa;}',
      '.sync-badge[data-state="saved"]{color:#55cc55;}',
      '.sync-badge[data-state="failed"]{color:#e05555;}',
      '.sync-badge__retry{',
        'background:none;border:1px solid currentColor;border-radius:2px;',
        'color:inherit;cursor:pointer;font:inherit;font-size:0.9em;',
        'padding:0 5px;line-height:1.6;',
      '}',
      '.sync-badge__retry:hover{opacity:0.75;}'
    ].join('');
    document.head.appendChild(style);
  }

  function makeSyncBadge(anchorEl) {
    var badge = document.createElement('span');
    badge.className = 'sync-badge';
    badge.setAttribute('role', 'status');
    badge.setAttribute('aria-live', 'polite');
    anchorEl.insertAdjacentElement('afterend', badge);

    var hideTimer = null;

    function clear() {
      if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
      badge.removeAttribute('data-state');
      badge.textContent = '';
    }

    function saving() {
      clear();
      badge.setAttribute('data-state', 'saving');
      badge.textContent = 'saving\u2026';
    }

    function saved() {
      clear();
      badge.setAttribute('data-state', 'saved');
      badge.textContent = 'saved \u2713';
      hideTimer = setTimeout(clear, 3000);
    }

    function failed(retryFn) {
      clear();
      badge.setAttribute('data-state', 'failed');
      badge.textContent = 'save failed \u2717';
      if (typeof retryFn === 'function') {
        var btn = document.createElement('button');
        btn.className = 'sync-badge__retry';
        btn.type = 'button';
        btn.textContent = 'Retry';
        btn.addEventListener('click', retryFn);
        badge.appendChild(btn);
      }
    }

    return { saving: saving, saved: saved, failed: failed, clear: clear };
  }

  window.makeSyncBadge = makeSyncBadge;
}());
