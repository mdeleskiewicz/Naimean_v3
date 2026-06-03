(() => {
  'use strict';

  const STORAGE_KEY = 'naimean.offlineQueue';
  const MUTATION_METHODS = new Set(['POST', 'PUT', 'DELETE']);
  const INDICATOR_IDS = ['calendar-sync-status', 'topbar-save-status', 'save-hotspots-btn'];
  const DEFAULT_HEADERS = { 'cache-control': 'no-store' };

  const originalFetch = window.fetch.bind(window);
  let isFlushing = false;
  let flushPending = false;

  function safeParseQueue(raw) {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch (_) {
      return [];
    }
  }

  function readQueue() {
    try {
      return safeParseQueue(window.localStorage.getItem(STORAGE_KEY));
    } catch (_) {
      return [];
    }
  }

  function writeQueue(queue) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    } catch (_) {}
    notifyQueueChanged(queue.length);
  }

  function getQueueLength() {
    return readQueue().length;
  }

  function normalizeUrl(value) {
    try {
      return new URL(value, window.location.href);
    } catch (_) {
      return null;
    }
  }

  function getRequestUrl(input, init) {
    if (typeof input === 'string') return input;
    if (input instanceof URL) return input.href;
    if (input instanceof Request) return input.url;
    if (init && typeof init.url === 'string') return init.url;
    return '';
  }

  function getRequestMethod(input, init) {
    const explicitMethod = init && typeof init.method === 'string' ? init.method : '';
    const inputMethod = input instanceof Request && typeof input.method === 'string' ? input.method : '';
    return String(explicitMethod || inputMethod || 'GET').toUpperCase();
  }

  function shouldQueueRequest(input, init) {
    const method = getRequestMethod(input, init);
    if (!MUTATION_METHODS.has(method)) return false;
    const parsed = normalizeUrl(getRequestUrl(input, init));
    return Boolean(parsed && parsed.pathname.startsWith('/api/'));
  }

  function toHeaderObject(headers) {
    const out = {};
    headers.forEach((value, key) => {
      out[key] = value;
    });
    return out;
  }

  async function serializeBody(body) {
    if (typeof body === 'string') return body;
    if (body == null) return null;
    if (body instanceof URLSearchParams) return body.toString();
    if (body instanceof Blob) return await body.text();
    if (body instanceof ArrayBuffer) return new TextDecoder().decode(body);
    if (ArrayBuffer.isView(body)) return new TextDecoder().decode(body.buffer);
    return null;
  }

  async function buildQueueItem(input, init) {
    const url = normalizeUrl(getRequestUrl(input, init));
    if (!url) return null;
    const method = getRequestMethod(input, init);
    const headers = new Headers();
    if (input instanceof Request) {
      input.headers.forEach((value, key) => headers.set(key, value));
    }
    if (init && init.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    let bodyText = null;
    if (init && Object.prototype.hasOwnProperty.call(init, 'body')) {
      bodyText = await serializeBody(init.body);
    } else if (input instanceof Request && method !== 'GET' && method !== 'HEAD') {
      try {
        bodyText = await input.clone().text();
      } catch (_) {
        bodyText = null;
      }
    }

    return {
      url: url.href,
      method,
      headers: toHeaderObject(headers),
      body: bodyText,
      credentials: init && init.credentials != null
        ? init.credentials
        : input instanceof Request
          ? input.credentials
          : undefined,
      mode: init && init.mode != null
        ? init.mode
        : input instanceof Request
          ? input.mode
          : undefined,
      cache: init && init.cache != null
        ? init.cache
        : input instanceof Request
          ? input.cache
          : undefined,
      redirect: init && init.redirect != null
        ? init.redirect
        : input instanceof Request
          ? input.redirect
          : undefined,
      referrer: init && init.referrer != null
        ? init.referrer
        : input instanceof Request
          ? input.referrer
          : undefined,
      referrerPolicy: init && init.referrerPolicy != null
        ? init.referrerPolicy
        : input instanceof Request
          ? input.referrerPolicy
          : undefined
    };
  }

  function makeQueuedResponse(length, meta = {}) {
    return new Response(JSON.stringify({ ok: true, queued: true, pending: length, ...meta }), {
      status: 202,
      headers: DEFAULT_HEADERS
    });
  }

  async function enqueue(input, init) {
    const item = await buildQueueItem(input, init);
    if (!item) return getQueueLength();
    const queue = readQueue();
    queue.push(item);
    writeQueue(queue);
    return queue.length;
  }

  function shouldEnqueueFailure(error, response) {
    if (response) return response.status >= 500;
    return Boolean(error);
  }

  async function replayItem(item) {
    const options = {
      method: item.method,
      headers: item.headers,
      credentials: item.credentials,
      mode: item.mode,
      cache: item.cache,
      redirect: item.redirect,
      referrer: item.referrer,
      referrerPolicy: item.referrerPolicy
    };
    if (item.body != null && item.method !== 'GET' && item.method !== 'HEAD') {
      options.body = item.body;
    }
    return originalFetch(item.url, options);
  }

  async function flushQueue() {
    if (isFlushing) {
      flushPending = true;
      return;
    }
    isFlushing = true;
    try {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
      let queue = readQueue();
      while (queue.length) {
        const [head] = queue;
        try {
          const res = await replayItem(head);
          if (!res.ok && res.status >= 500) break;
          queue.shift();
          writeQueue(queue);
        } catch (_) {
          break;
        }
      }
    } finally {
      isFlushing = false;
      if (flushPending) {
        flushPending = false;
        void flushQueue();
      }
    }
  }

  function ensureStyles() {
    if (document.getElementById('offline-queue-style')) return;
    const style = document.createElement('style');
    style.id = 'offline-queue-style';
    style.textContent = `
      [data-offline-queue-pending]:not([data-offline-queue-pending="0"])::after {
        content: attr(data-offline-queue-pending) " pending";
        margin-left: 8px;
        padding: 2px 8px;
        border-radius: 999px;
        font-size: 0.75em;
        line-height: 1.2;
        background: rgba(255, 214, 10, 0.2);
        border: 1px solid rgba(255, 214, 10, 0.6);
        color: #ffd60a;
        vertical-align: middle;
      }
    `;
    document.head.appendChild(style);
  }

  function updateIndicators(length) {
    INDICATOR_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.setAttribute('data-offline-queue-pending', String(length));
      el.setAttribute('title', length > 0 ? `${length} pending sync operation${length === 1 ? '' : 's'}` : '');
    });
  }

  function notifyQueueChanged(length = getQueueLength()) {
    ensureStyles();
    updateIndicators(length);
    window.dispatchEvent(
      new CustomEvent('naimean-offline-queue-change', {
        detail: { length }
      })
    );
  }

  window.fetch = async function offlineQueueFetch(input, init) {
    if (isFlushing || !shouldQueueRequest(input, init)) {
      return originalFetch(input, init);
    }

    try {
      const response = await originalFetch(input, init);
      if (!shouldEnqueueFailure(null, response)) return response;
      let errorText = '';
      try {
        errorText = (await response.clone().text()).trim().slice(0, 512);
      } catch (_) {}
      const pendingLength = await enqueue(input, init);
      return makeQueuedResponse(pendingLength, {
        originalStatus: response.status,
        error: errorText || `Request failed with status ${response.status} and was queued for retry.`
      });
    } catch (error) {
      const pendingLength = await enqueue(input, init);
      return makeQueuedResponse(pendingLength, {
        error: error && error.message ? error.message : 'Network failure; request queued for retry.'
      });
    }
  };

  window.NaimeanOfflineQueue = {
    getQueueLength,
    flushNow: flushQueue,
    storageKey: STORAGE_KEY
  };

  notifyQueueChanged();
  window.addEventListener('online', () => {
    void flushQueue();
  });
  window.addEventListener('focus', () => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    void flushQueue();
  });
}());
