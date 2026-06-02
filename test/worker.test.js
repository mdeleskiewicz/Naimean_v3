import { test } from 'node:test';
import assert from 'node:assert/strict';
import router, { HotspotStore, createSessionToken, verifySessionToken } from '../src/worker.js';
import { onRequest as onHotspotsRequest } from './fixtures/hotspots.js';

function makeState(initialHotspots) {
  let stored = initialHotspots;
  const calls = { get: 0, put: [] };

  return {
    state: {
      storage: {
        async get(key) {
          calls.get += 1;
          if (key === 'hotspots') return stored;
          return undefined;
        },
        async put(key, value) {
          calls.put.push({ key, value });
          if (key === 'hotspots') stored = value;
        }
      }
    },
    calls,
    getStored: () => stored
  };
}

function makeKeyedState(initialEntries = {}) {
  const stored = new Map(Object.entries(initialEntries));
  const calls = { get: [], put: [] };

  return {
    state: {
      storage: {
        async get(key) {
          calls.get.push(key);
          return stored.get(key);
        },
        async put(key, value) {
          calls.put.push({ key, value });
          stored.set(key, value);
        }
      }
    },
    calls,
    getStored(key) {
      return stored.get(key);
    }
  };
}

test('HotspotStore GET returns default hotspots when storage is empty', async () => {
  const { state } = makeState(undefined);
  const store = new HotspotStore(state);

  const response = await store.fetch(new Request('https://example.com/api/hotspots', { method: 'GET' }));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('content-type'), 'application/json; charset=UTF-8');
  assert.equal(body.hotspots.length, 9);
  assert.deepEqual(body.hotspots[0], { id: 'noahs-arcade', x: 880, y: 320, w: 2050, h: 1280 });
  assert.deepEqual(body.hotspots[1], { id: 'aquarium', x: 2680, y: 445, w: 455, h: 729 });
  assert.deepEqual(body.hotspots[2], { id: 'rca-board', x: 738, y: 380, w: 470, h: 1060 });
  assert.deepEqual(body.hotspots[3], { id: 'chapel', x: 3840, y: 0, w: 3840, h: 2160 });
  assert.deepEqual(body.hotspots[5], { id: 'overlay-big-tv-control', x: 1469, y: 330, w: 1000, h: 572 });
  assert.deepEqual(body.hotspots[6], { id: 'overlay-flip-clock-control', x: 990, y: 1740, w: 360, h: 156 });
  assert.deepEqual(body.hotspots[7], { id: 'overlay-left-monitor-control', x: 1322, y: 1028, w: 298, h: 206 });
  assert.deepEqual(body.hotspots[8], { id: 'overlay-right-monitor-control', x: 1758, y: 1014, w: 288, h: 228 });
});

test('HotspotStore POST rejects invalid JSON', async () => {
  const { state } = makeState(undefined);
  const store = new HotspotStore(state);

  const response = await store.fetch(
    new Request('https://example.com/api/hotspots', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{not-json'
    })
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'Invalid JSON body.' });
});

test('HotspotStore POST sanitizes, clamps and stores hotspot payloads', async () => {
  const { state, calls, getStored } = makeState(undefined);
  const store = new HotspotStore(state);

  const response = await store.fetch(
    new Request('https://example.com/api/hotspots', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        hotspots: [
          { id: 'big-tv', x: -100.8, y: 2200.2, w: 10, h: 99999 },
          { id: 'left-monitor', x: 1500.7, y: 1072.4, w: 292.4, h: 205.6 },
          { id: 'commodore-screen', x: 'oops', y: null, w: Infinity, h: undefined },
          { id: 'unknown-id', x: 1, y: 2, w: 3, h: 4 }
        ]
      })
    })
  );

  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.hotspots.length, 9);
  assert.deepEqual(body.hotspots[0], { id: 'noahs-arcade', x: 880, y: 320, w: 2050, h: 1280 });
  assert.deepEqual(body.hotspots[1], { id: 'aquarium', x: 2680, y: 445, w: 455, h: 729 });
  assert.deepEqual(body.hotspots[2], { id: 'rca-board', x: 738, y: 380, w: 470, h: 1060 });
  assert.deepEqual(body.hotspots[3], { id: 'chapel', x: 3840, y: 0, w: 3840, h: 2160 });
  assert.deepEqual(body.hotspots[5], { id: 'overlay-big-tv-control', x: 1469, y: 330, w: 1000, h: 572 });
  assert.deepEqual(body.hotspots[6], { id: 'overlay-flip-clock-control', x: 990, y: 1740, w: 360, h: 156 });
  assert.deepEqual(body.hotspots[7], { id: 'overlay-left-monitor-control', x: 1322, y: 1028, w: 298, h: 206 });
  assert.deepEqual(body.hotspots[8], { id: 'overlay-right-monitor-control', x: 1758, y: 1014, w: 288, h: 228 });

  assert.equal(calls.put.length, 1);
  assert.equal(calls.put[0].key, 'hotspots');
  assert.deepEqual(calls.put[0].value, body.hotspots);
  assert.deepEqual(getStored(), body.hotspots);
});

test('HotspotStore returns 405 for unsupported methods', async () => {
  const { state } = makeState(undefined);
  const store = new HotspotStore(state);

  const response = await store.fetch(new Request('https://example.com/api/hotspots', { method: 'DELETE' }));

  assert.equal(response.status, 405);
  assert.deepEqual(await response.json(), { error: 'Method not allowed.' });
});

test('HotspotStore handles OPTIONS preflight requests', async () => {
  const { state } = makeState(undefined);
  const store = new HotspotStore(state);

  const response = await store.fetch(new Request('https://example.com/api/hotspots', { method: 'OPTIONS' }));

  assert.equal(response.status, 204);
  assert.equal(response.headers.get('access-control-allow-methods'), 'GET, POST, OPTIONS');
  assert.equal(response.headers.get('access-control-allow-headers'), 'content-type');
});

test('HotspotStore GET returns empty arcade URL overrides when storage is empty', async () => {
  const { state, calls } = makeKeyedState({});
  const store = new HotspotStore(state);

  const response = await store.fetch(new Request('https://example.com/api/arcade-url-overrides', { method: 'GET' }));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body, { overrides: {} });
  assert.deepEqual(calls.get, ['arcade-url-overrides']);
});

test('HotspotStore POST sanitizes and stores arcade URL overrides', async () => {
  const { state, calls, getStored } = makeKeyedState({});
  const store = new HotspotStore(state);

  const response = await store.fetch(
    new Request('https://example.com/api/arcade-url-overrides', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        overrides: {
          'DOOM': 'https://example.com/doom',
          'Quake': '/quake.html',
          'Bad URL': 'doom',
          'Blank': '   '
        }
      })
    })
  );

  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.deepEqual(body.overrides, {
    DOOM: 'https://example.com/doom',
    Quake: '/quake.html'
  });
  assert.equal(calls.put.length, 1);
  assert.deepEqual(calls.put[0], {
    key: 'arcade-url-overrides',
    value: {
      DOOM: 'https://example.com/doom',
      Quake: '/quake.html'
    }
  });
  assert.deepEqual(getStored('arcade-url-overrides'), {
    DOOM: 'https://example.com/doom',
    Quake: '/quake.html'
  });
});

test('HotspotStore GET returns corner score when storage is empty', async () => {
  const { state, calls } = makeKeyedState({});
  const store = new HotspotStore(state);

  const response = await store.fetch(new Request('https://example.com/api/corner-score', { method: 'GET' }));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body, { score: 0 });
  assert.deepEqual(calls.get, ['corner-score']);
});

test('HotspotStore POST increments and stores corner score', async () => {
  const { state, calls, getStored } = makeKeyedState({ 'corner-score': 7 });
  const store = new HotspotStore(state);

  const response = await store.fetch(
    new Request('https://example.com/api/corner-score', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ incrementBy: 3 })
    })
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body, { ok: true, score: 10 });
  assert.equal(calls.put.length, 1);
  assert.deepEqual(calls.put[0], { key: 'corner-score', value: 10 });
  assert.equal(getStored('corner-score'), 10);
});

test('worker routes /api/hotspots through HOTSPOT_STORE durable object', async () => {
  const calls = { idFromName: [], get: [], stubFetch: 0, assetsFetch: 0 };
  const expectedResponse = new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'content-type': 'application/json' }
  });

  const env = {
    HOTSPOT_STORE: {
      idFromName(name) {
        calls.idFromName.push(name);
        return `id:${name}`;
      },
      get(id) {
        calls.get.push(id);
        return {
          async fetch(request) {
            calls.stubFetch += 1;
            assert.equal(new URL(request.url).pathname, '/api/hotspots');
            return expectedResponse;
          }
        };
      }
    },
    ASSETS: {
      async fetch() {
        calls.assetsFetch += 1;
        return new Response('assets');
      }
    }
  };

  const response = await router.fetch(new Request('https://example.com/api/hotspots', { method: 'GET' }), env);

  assert.equal(response, expectedResponse);
  assert.deepEqual(calls.idFromName, ['den-hotspots']);
  assert.deepEqual(calls.get, ['id:den-hotspots']);
  assert.equal(calls.stubFetch, 1);
  assert.equal(calls.assetsFetch, 0);
});

test('worker routes /api/chapel-hotspots through HOTSPOT_STORE durable object', async () => {
  const calls = { idFromName: [], get: [], stubFetch: 0, assetsFetch: 0 };
  const expectedResponse = new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'content-type': 'application/json' }
  });

  const env = {
    HOTSPOT_STORE: {
      idFromName(name) {
        calls.idFromName.push(name);
        return `id:${name}`;
      },
      get(id) {
        calls.get.push(id);
        return {
          async fetch(request) {
            calls.stubFetch += 1;
            assert.equal(new URL(request.url).pathname, '/api/chapel-hotspots');
            return expectedResponse;
          }
        };
      }
    },
    ASSETS: {
      async fetch() {
        calls.assetsFetch += 1;
        return new Response('assets');
      }
    }
  };

  const response = await router.fetch(new Request('https://example.com/api/chapel-hotspots', { method: 'GET' }), env);

  assert.equal(response, expectedResponse);
  assert.deepEqual(calls.idFromName, ['chapel-hotspots']);
  assert.deepEqual(calls.get, ['id:chapel-hotspots']);
  assert.equal(calls.stubFetch, 1);
  assert.equal(calls.assetsFetch, 0);
});

test('worker routes /api/arcade-url-overrides through HOTSPOT_STORE durable object', async () => {
  const calls = { idFromName: [], get: [], stubFetch: 0, assetsFetch: 0 };
  const expectedResponse = new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'content-type': 'application/json' }
  });

  const env = {
    HOTSPOT_STORE: {
      idFromName(name) {
        calls.idFromName.push(name);
        return `id:${name}`;
      },
      get(id) {
        calls.get.push(id);
        return {
          async fetch(request) {
            calls.stubFetch += 1;
            assert.equal(new URL(request.url).pathname, '/api/arcade-url-overrides');
            return expectedResponse;
          }
        };
      }
    },
    ASSETS: {
      async fetch() {
        calls.assetsFetch += 1;
        return new Response('assets');
      }
    }
  };

  const response = await router.fetch(new Request('https://example.com/api/arcade-url-overrides', { method: 'GET' }), env);

  assert.equal(response, expectedResponse);
  assert.deepEqual(calls.idFromName, ['arcade-url-overrides']);
  assert.deepEqual(calls.get, ['id:arcade-url-overrides']);
  assert.equal(calls.stubFetch, 1);
  assert.equal(calls.assetsFetch, 0);
});

test('worker routes /api/corner-score through HOTSPOT_STORE durable object', async () => {
  const calls = { idFromName: [], get: [], stubFetch: 0, assetsFetch: 0 };
  const expectedResponse = new Response(JSON.stringify({ ok: true, score: 1 }), {
    status: 200,
    headers: { 'content-type': 'application/json' }
  });

  const env = {
    HOTSPOT_STORE: {
      idFromName(name) {
        calls.idFromName.push(name);
        return `id:${name}`;
      },
      get(id) {
        calls.get.push(id);
        return {
          async fetch(request) {
            calls.stubFetch += 1;
            assert.equal(new URL(request.url).pathname, '/api/corner-score');
            return expectedResponse;
          }
        };
      }
    },
    ASSETS: {
      async fetch() {
        calls.assetsFetch += 1;
        return new Response('assets');
      }
    }
  };

  const response = await router.fetch(new Request('https://example.com/api/corner-score', { method: 'GET' }), env);

  assert.equal(response, expectedResponse);
  assert.deepEqual(calls.idFromName, ['corner-score']);
  assert.deepEqual(calls.get, ['id:corner-score']);
  assert.equal(calls.stubFetch, 1);
  assert.equal(calls.assetsFetch, 0);
});

test('worker returns 500 for /api/hotspots when HOTSPOT_STORE binding is missing', async () => {
  const env = {
    ASSETS: {
      async fetch() {
        return new Response('assets');
      }
    }
  };

  const response = await router.fetch(new Request('https://example.com/api/hotspots', { method: 'POST' }), env);

  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: 'HOTSPOT_STORE binding is missing.' });
});

test('worker returns 500 for /api/arcade-url-overrides when HOTSPOT_STORE binding is missing', async () => {
  const env = {
    ASSETS: {
      async fetch() {
        return new Response('assets');
      }
    }
  };

  const response = await router.fetch(new Request('https://example.com/api/arcade-url-overrides', { method: 'POST' }), env);

  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: 'HOTSPOT_STORE binding is missing.' });
});

test('worker returns 500 for /api/corner-score when HOTSPOT_STORE binding is missing', async () => {
  const env = {
    ASSETS: {
      async fetch() {
        return new Response('assets');
      }
    }
  };

  const response = await router.fetch(new Request('https://example.com/api/corner-score', { method: 'POST' }), env);

  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: 'HOTSPOT_STORE binding is missing.' });
});

test('worker serves non-api requests through ASSETS binding', async () => {
  const calls = { assetsFetch: [] };
  const env = {
    HOTSPOT_STORE: {
      idFromName() {
        throw new Error('HOTSPOT_STORE should not be used for non-api requests');
      },
      get() {
        throw new Error('HOTSPOT_STORE should not be used for non-api requests');
      }
    },
    ASSETS: {
      async fetch(request) {
        calls.assetsFetch.push(new URL(request.url).pathname);
        return new Response('other page', { status: 200 });
      }
    }
  };

  const response = await router.fetch(new Request('https://example.com/other.html'), env);

  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'other page');
  assert.deepEqual(calls.assetsFetch, ['/other.html']);
});

test('worker serves /den through the index asset alias', async () => {
  const calls = { assetsFetch: [] };
  const env = {
    HOTSPOT_STORE: {},
    ASSETS: {
      async fetch(request) {
        calls.assetsFetch.push(new URL(request.url).pathname);
        return new Response('den', { status: 200 });
      }
    }
  };

  const response = await router.fetch(new Request('https://example.com/den'), env);

  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'den');
  assert.deepEqual(calls.assetsFetch, ['/index.html']);
});

test('worker preserves existing frame-src CSP for den html path', async () => {
  const env = {
    HOTSPOT_STORE: {
      idFromName() {
        throw new Error('HOTSPOT_STORE should not be used for non-api requests');
      },
      get() {
        throw new Error('HOTSPOT_STORE should not be used for non-api requests');
      }
    },
    ASSETS: {
      async fetch() {
        return new Response('den page', {
          status: 200,
          headers: {
            'content-security-policy': "default-src 'self'; frame-src https://discord.com https://discordapp.com;"
          }
        });
      }
    }
  };

  const response = await router.fetch(new Request('https://example.com/den.html'), env);
  const csp = response.headers.get('content-security-policy');
  assert.equal(
    csp,
    "default-src 'self'; frame-src https://discord.com https://discordapp.com;"
  );
});

test('worker serves den html path through the index asset alias', async () => {
  const calls = { assetsFetch: [] };
  const env = {
    HOTSPOT_STORE: {
      idFromName() {
        throw new Error('HOTSPOT_STORE should not be used for non-api requests');
      },
      get() {
        throw new Error('HOTSPOT_STORE should not be used for non-api requests');
      }
    },
    ASSETS: {
      async fetch(request) {
        calls.assetsFetch.push(new URL(request.url).pathname);
        return new Response('den page', {
          status: 200,
          headers: {
            'content-security-policy': "default-src 'self'; frame-src https://discord.com https://discordapp.com;"
          }
        });
      }
    }
  };

  const response = await router.fetch(new Request('https://example.com/den.html'), env);
  const csp = response.headers.get('content-security-policy');

  assert.equal(response.status, 200);
  assert.equal(
    csp,
    "default-src 'self'; frame-src https://discord.com https://discordapp.com;"
  );
  assert.deepEqual(calls.assetsFetch, ['/index.html']);
});

test('worker serves /mame_gui through the MAME GUI asset alias', async () => {
  const calls = { assetsFetch: [] };
  const env = {
    HOTSPOT_STORE: {},
    ASSETS: {
      async fetch(request) {
        calls.assetsFetch.push(new URL(request.url).pathname);
        return new Response('mame gui', { status: 200 });
      }
    }
  };

  const response = await router.fetch(new Request('https://example.com/mame_gui'), env);

  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'mame gui');
  assert.deepEqual(calls.assetsFetch, ['/mame-gui.html']);
});

test('worker serves /mame-gui through the MAME GUI asset alias', async () => {
  const calls = { assetsFetch: [] };
  const env = {
    HOTSPOT_STORE: {},
    ASSETS: {
      async fetch(request) {
        calls.assetsFetch.push(new URL(request.url).pathname);
        return new Response('mame gui', { status: 200 });
      }
    }
  };

  const response = await router.fetch(new Request('https://example.com/mame-gui'), env);

  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'mame gui');
  assert.deepEqual(calls.assetsFetch, ['/mame-gui.html']);
});

test('functions/api/hotspots onRequest delegates to HOTSPOT_STORE durable object', async () => {
  const calls = { idFromName: [], get: [], fetch: 0 };
  const expected = new Response('ok', { status: 200 });

  const env = {
    HOTSPOT_STORE: {
      idFromName(name) {
        calls.idFromName.push(name);
        return `id:${name}`;
      },
      get(id) {
        calls.get.push(id);
        return {
          async fetch(request) {
            calls.fetch += 1;
            assert.equal(request.method, 'GET');
            return expected;
          }
        };
      }
    }
  };

  const response = await onHotspotsRequest({ request: new Request('https://example.com/api/hotspots'), env });

  assert.equal(response, expected);
  assert.deepEqual(calls.idFromName, ['den-hotspots']);
  assert.deepEqual(calls.get, ['id:den-hotspots']);
  assert.equal(calls.fetch, 1);
});

test('functions/api/hotspots onRequest returns 500 when HOTSPOT_STORE binding is missing', async () => {
  const response = await onHotspotsRequest({
    request: new Request('https://example.com/api/hotspots', { method: 'POST' }),
    env: {}
  });

  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: 'HOTSPOT_STORE binding is missing.' });
});

// --- src/worker.js HotspotStore additional coverage ---

test('HotspotStore GET returns saved hotspots when storage has data', async () => {
  const saved = [
    { id: 'noahs-arcade', x: 100, y: 200, w: 300, h: 400 },
    { id: 'aquarium', x: 500, y: 600, w: 200, h: 150 },
    { id: 'rca-board', x: 738, y: 380, w: 470, h: 1060 },
    { id: 'pencil-sharpener', x: 2562, y: 1220, w: 221, h: 245 },
    { id: 'overlay-big-tv-control', x: 1469, y: 330, w: 1000, h: 572 },
    { id: 'overlay-flip-clock-control', x: 990, y: 1740, w: 360, h: 156 },
    { id: 'overlay-left-monitor-control', x: 1322, y: 1028, w: 298, h: 206 }
  ];
  const { state } = makeState(saved);
  const store = new HotspotStore(state);

  const response = await store.fetch(new Request('https://example.com/api/hotspots', { method: 'GET' }));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body.hotspots[0], { id: 'noahs-arcade', x: 100, y: 200, w: 300, h: 400 });
  assert.deepEqual(body.hotspots[1], { id: 'aquarium', x: 500, y: 600, w: 200, h: 150 });
});

test('HotspotStore GET returns 500 when storage.get throws', async () => {
  const state = {
    storage: {
      async get() { throw new Error('disk failure'); },
      async put() {}
    }
  };
  const store = new HotspotStore(state);

  const response = await store.fetch(new Request('https://example.com/api/hotspots', { method: 'GET' }));
  const body = await response.json();

  assert.equal(response.status, 500);
  assert.match(body.error, /Failed to load hotspots/);
  assert.match(body.error, /disk failure/);
});

test('HotspotStore POST returns 500 when storage.put throws', async () => {
  const state = {
    storage: {
      async get() { return undefined; },
      async put() { throw new Error('quota exceeded'); }
    }
  };
  const store = new HotspotStore(state);

  const response = await store.fetch(
    new Request('https://example.com/api/hotspots', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ hotspots: [] })
    })
  );
  const body = await response.json();

  assert.equal(response.status, 500);
  assert.match(body.error, /Failed to save hotspots/);
  assert.match(body.error, /quota exceeded/);
});

// --- sanitizeHotspots edge cases (exercised through HotspotStore) ---

test('HotspotStore POST uses defaults when hotspots payload is null', async () => {
  const { state } = makeState(undefined);
  const store = new HotspotStore(state);

  const response = await store.fetch(
    new Request('https://example.com/api/hotspots', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ hotspots: null })
    })
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.hotspots.length, 9);
  assert.deepEqual(body.hotspots[0], { id: 'noahs-arcade', x: 880, y: 320, w: 2050, h: 1280 });
});

test('HotspotStore POST uses defaults when hotspots payload is a non-array', async () => {
  const { state } = makeState(undefined);
  const store = new HotspotStore(state);

  const response = await store.fetch(
    new Request('https://example.com/api/hotspots', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ hotspots: 'oops' })
    })
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.hotspots.length, 9);
  assert.deepEqual(body.hotspots[0], { id: 'noahs-arcade', x: 880, y: 320, w: 2050, h: 1280 });
  assert.deepEqual(body.hotspots[1], { id: 'aquarium', x: 2680, y: 445, w: 455, h: 729 });
});

test('HotspotStore POST skips non-object and null entries in hotspots array', async () => {
  const { state } = makeState(undefined);
  const store = new HotspotStore(state);

  const response = await store.fetch(
    new Request('https://example.com/api/hotspots', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        hotspots: [
          null,
          42,
          'string-entry',
          { id: 123, x: 1, y: 2, w: 3, h: 4 },
          { id: 'noahs-arcade', x: 100, y: 200, w: 300, h: 400 }
        ]
      })
    })
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body.hotspots[0], { id: 'noahs-arcade', x: 100, y: 200, w: 300, h: 400 });
  assert.deepEqual(body.hotspots[1], { id: 'aquarium', x: 2680, y: 445, w: 455, h: 729 });
});

test('HotspotStore POST uses last entry when hotspot id is duplicated', async () => {
  const { state } = makeState(undefined);
  const store = new HotspotStore(state);

  const response = await store.fetch(
    new Request('https://example.com/api/hotspots', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        hotspots: [
          { id: 'noahs-arcade', x: 10, y: 20, w: 100, h: 200 },
          { id: 'noahs-arcade', x: 50, y: 60, w: 500, h: 600 }
        ]
      })
    })
  );
  const body = await response.json();

  assert.deepEqual(body.hotspots[0], { id: 'noahs-arcade', x: 50, y: 60, w: 500, h: 600 });
});

test('HotspotStore POST clamps coordinates to boundary min values', async () => {
  const { state } = makeState(undefined);
  const store = new HotspotStore(state);

  const response = await store.fetch(
    new Request('https://example.com/api/hotspots', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        hotspots: [
          { id: 'noahs-arcade', x: -999, y: -999, w: 1, h: 1 }
        ]
      })
    })
  );
  const body = await response.json();

  assert.deepEqual(body.hotspots[0], { id: 'noahs-arcade', x: 0, y: 0, w: 20, h: 20 });
});

test('HotspotStore POST clamps coordinates to boundary max values', async () => {
  const { state } = makeState(undefined);
  const store = new HotspotStore(state);

  const response = await store.fetch(
    new Request('https://example.com/api/hotspots', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        hotspots: [
          { id: 'noahs-arcade', x: 99999, y: 99999, w: 99999, h: 99999 }
        ]
      })
    })
  );
  const body = await response.json();

  assert.deepEqual(body.hotspots[0], { id: 'noahs-arcade', x: 3840, y: 2160, w: 3840, h: 2160 });
});

test('HotspotStore POST falls back to default for NaN coordinate values', async () => {
  const { state } = makeState(undefined);
  const store = new HotspotStore(state);

  const response = await store.fetch(
    new Request('https://example.com/api/hotspots', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        hotspots: [
          { id: 'noahs-arcade', x: NaN, y: NaN, w: NaN, h: NaN }
        ]
      })
    })
  );
  const body = await response.json();

  assert.deepEqual(body.hotspots[0], { id: 'noahs-arcade', x: 880, y: 320, w: 2050, h: 1280 });
});

test('HotspotStore POST rounds fractional coordinate values', async () => {
  const { state } = makeState(undefined);
  const store = new HotspotStore(state);

  const response = await store.fetch(
    new Request('https://example.com/api/hotspots', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        hotspots: [
          { id: 'noahs-arcade', x: 100.4, y: 200.5, w: 300.6, h: 400.9 }
        ]
      })
    })
  );
  const body = await response.json();

  assert.deepEqual(body.hotspots[0], { id: 'noahs-arcade', x: 100, y: 201, w: 301, h: 401 });
});

// --- worker router additional coverage ---

test('worker serves non-hotspot /api/* requests through ASSETS binding', async () => {
  const calls = { assetsFetch: [] };
  const env = {
    HOTSPOT_STORE: {
      idFromName() { throw new Error('HOTSPOT_STORE should not be called'); },
      get() { throw new Error('HOTSPOT_STORE should not be called'); }
    },
    ASSETS: {
      async fetch(request) {
        calls.assetsFetch.push(new URL(request.url).pathname);
        return new Response('other api', { status: 200 });
      }
    }
  };

  const response = await router.fetch(new Request('https://example.com/api/other'), env);

  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'other api');
  assert.deepEqual(calls.assetsFetch, ['/api/other']);
});

test('worker serves shrimp clip catalog from local fallback when Drive config is missing', async () => {
  const env = {
    HOTSPOT_STORE: {},
    ASSETS: {
      async fetch() {
        throw new Error('ASSETS should not be called for shrimp clip catalog API');
      }
    }
  };

  const response = await router.fetch(new Request('https://example.com/api/aquarium/shrimp-clips'), env);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.source, 'local-fallback');
  assert.equal(body.clips.length, 23);
  assert.equal(body.clips[0], 'assets/video/shrimp/sh1.mp4');
});

test('worker serves shrimp clip catalog from Google Drive when configured', async () => {
  const env = {
    HOTSPOT_STORE: {},
    ASSETS: {
      async fetch() {
        throw new Error('ASSETS should not be called for shrimp clip catalog API');
      }
    },
    GOOGLE_DRIVE_API_KEY: 'test-api-key',
    GOOGLE_DRIVE_SHRIMP_FOLDER_ID: '1DPzSJbcN9v_D1mSy4nIXjPOBhFHJpvSi'
  };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    assert.match(String(url), /googleapis\.com\/drive\/v3\/files\?/);
    return Response.json({
      files: [
        { id: 'abc1234567890', name: 'shrimp-a.mp4', mimeType: 'video/mp4' },
        { id: 'def1234567890', name: 'shrimp-b.webm', mimeType: 'video/webm' },
        { id: 'nonvideo12345', name: 'shrimp.txt', mimeType: 'text/plain' }
      ]
    });
  };

  try {
    const response = await router.fetch(new Request('https://example.com/api/aquarium/shrimp-clips'), env);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.source, 'google-drive');
    assert.deepEqual(body.clips, [
      '/api/aquarium/shrimp-clip/abc1234567890',
      '/api/aquarium/shrimp-clip/def1234567890'
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('worker proxies Drive shrimp clip media through API endpoint', async () => {
  const env = {
    HOTSPOT_STORE: {},
    ASSETS: {
      async fetch() {
        throw new Error('ASSETS should not be called for shrimp clip proxy API');
      }
    },
    GOOGLE_DRIVE_API_KEY: 'test-api-key'
  };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    assert.match(String(url), /googleapis\.com\/drive\/v3\/files\/abc1234567890\?/);
    return new Response('video-bytes', {
      status: 200,
      headers: {
        'content-type': 'video/mp4',
        'content-length': '11'
      }
    });
  };

  try {
    const response = await router.fetch(new Request('https://example.com/api/aquarium/shrimp-clip/abc1234567890'), env);

    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'video/mp4');
    assert.equal(response.headers.get('cache-control'), 'public, max-age=300');
    assert.equal(await response.text(), 'video-bytes');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('worker rejects invalid shrimp clip id for proxy endpoint', async () => {
  const env = {
    HOTSPOT_STORE: {},
    ASSETS: {
      async fetch() {
        throw new Error('ASSETS should not be called for shrimp clip proxy API');
      }
    },
    GOOGLE_DRIVE_API_KEY: 'test-api-key'
  };

  const response = await router.fetch(new Request('https://example.com/api/aquarium/shrimp-clip/bad'), env);

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'Invalid clip id.' });
});

test('worker returns 503 for shrimp clip proxy when Drive API key is missing', async () => {
  const env = {
    HOTSPOT_STORE: {},
    ASSETS: {
      async fetch() {
        throw new Error('ASSETS should not be called for shrimp clip proxy API');
      }
    }
  };

  const response = await router.fetch(new Request('https://example.com/api/aquarium/shrimp-clip/abc1234567890'), env);

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: 'Google Drive API key is not configured.' });
});

test('worker serves root path without rewriting to /index.html', async () => {
  const calls = { assetsFetch: [] };
  const env = {
    HOTSPOT_STORE: {},
    ASSETS: {
      async fetch(request) {
        calls.assetsFetch.push(new URL(request.url).pathname);
        return new Response('den', { status: 200 });
      }
    }
  };

  const response = await router.fetch(new Request('https://example.com/'), env);

  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'den');
  assert.deepEqual(calls.assetsFetch, ['/']);
});

test('worker avoids root redirect loops when /index.html canonicalizes to /', async () => {
  const calls = { assetsFetch: [] };
  const env = {
    HOTSPOT_STORE: {},
    ASSETS: {
      async fetch(request) {
        const path = new URL(request.url).pathname;
        calls.assetsFetch.push(path);
        if (path === '/index.html') {
          return Response.redirect('https://example.com/', 301);
        }
        return new Response('den', { status: 200 });
      }
    }
  };

  const response = await router.fetch(new Request('https://example.com/'), env);

  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'den');
  assert.deepEqual(calls.assetsFetch, ['/']);
});

test('worker serves /index.html through the index asset alias', async () => {
  const calls = { assetsFetch: [] };
  const env = {
    HOTSPOT_STORE: {},
    ASSETS: {
      async fetch(request) {
        calls.assetsFetch.push(new URL(request.url).pathname);
        return new Response('den', { status: 200 });
      }
    }
  };

  const response = await router.fetch(new Request('https://example.com/index.html'), env);

  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'den');
  assert.deepEqual(calls.assetsFetch, ['/index.html']);
});

// --- functions/api/hotspots.js HotspotStore class coverage ---

import { HotspotStore as FunctionsHotspotStore } from './fixtures/hotspots.js';

function makeFunctionsState(initialHotspots) {
  let stored = initialHotspots;
  const calls = { get: 0, put: [] };

  return {
    state: {
      storage: {
        async get(key) {
          calls.get += 1;
          if (key === 'hotspots') return stored;
          return undefined;
        },
        async put(key, value) {
          calls.put.push({ key, value });
          if (key === 'hotspots') stored = value;
        }
      }
    },
    calls,
    getStored: () => stored
  };
}

test('functions HotspotStore GET returns default hotspots when storage is empty', async () => {
  const { state } = makeFunctionsState(undefined);
  const store = new FunctionsHotspotStore(state);

  const response = await store.fetch(new Request('https://example.com/api/hotspots', { method: 'GET' }));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.hotspots.length, 7);
  assert.deepEqual(body.hotspots[0], { id: 'noahs-arcade', x: 880, y: 320, w: 2050, h: 1280 });
  assert.deepEqual(body.hotspots[3], { id: 'chapel', x: 3840, y: 0, w: 3840, h: 2160 });
});

test('functions HotspotStore GET returns saved hotspots when storage has data', async () => {
  const saved = [
    { id: 'noahs-arcade', x: 10, y: 20, w: 100, h: 200 },
    { id: 'aquarium', x: 2680, y: 445, w: 455, h: 729 },
    { id: 'rca-board', x: 738, y: 380, w: 470, h: 1060 },
    { id: 'pencil-sharpener', x: 2562, y: 1220, w: 221, h: 245 },
    { id: 'overlay-big-tv-control', x: 1469, y: 330, w: 1000, h: 572 },
    { id: 'overlay-flip-clock-control', x: 990, y: 1740, w: 360, h: 156 }
  ];
  const { state } = makeFunctionsState(saved);
  const store = new FunctionsHotspotStore(state);

  const response = await store.fetch(new Request('https://example.com/api/hotspots', { method: 'GET' }));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body.hotspots[0], { id: 'noahs-arcade', x: 10, y: 20, w: 100, h: 200 });
});

test('functions HotspotStore POST rejects invalid JSON', async () => {
  const { state } = makeFunctionsState(undefined);
  const store = new FunctionsHotspotStore(state);

  const response = await store.fetch(
    new Request('https://example.com/api/hotspots', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{bad json'
    })
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'Invalid JSON body.' });
});

test('functions HotspotStore POST sanitizes and stores hotspot payloads', async () => {
  const { state, calls, getStored } = makeFunctionsState(undefined);
  const store = new FunctionsHotspotStore(state);

  const response = await store.fetch(
    new Request('https://example.com/api/hotspots', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        hotspots: [
          { id: 'noahs-arcade', x: 50, y: 60, w: 500, h: 600 }
        ]
      })
    })
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.hotspots.length, 7);
  assert.deepEqual(body.hotspots[0], { id: 'noahs-arcade', x: 50, y: 60, w: 500, h: 600 });
  assert.equal(calls.put.length, 1);
  assert.equal(calls.put[0].key, 'hotspots');
  assert.deepEqual(getStored(), body.hotspots);
});

const DEFAULT_CHAPEL_ANCHOR_POINTS_EXPECTED = {
  aceVenturaTopLeft: { x: 359, y: 2215 },
  aceVenturaBottomRight: { x: 457, y: 2355 },
  sillyGooseTopLeft: { x: 289, y: 2303 },
  sillyGooseBottomRight: { x: 349, y: 2381 },
  crustyTheClownTopLeft: { x: 4, y: 2285 },
  crustyTheClownBottomRight: { x: 118, y: 2512 },
  caseyJonesTopLeft: { x: 129, y: 2230 },
  caseyJonesBottomRight: { x: 278, y: 2410 },
  rickTopLeft: { x: 773, y: 2268 },
  rickBottomRight: { x: 844, y: 2401 },
  mortyTopLeft: { x: 697, y: 2321 },
  mortyBottomRight: { x: 762, y: 2401 },
  scroogeMcduckTopLeft: { x: 855, y: 2249 },
  scroogeMcduckBottomRight: { x: 989, y: 2511 },
  chapelMonitorShadowTopLeft: { x: 470, y: 2027 },
  chapelMonitorShadowBottomRight: { x: 608, y: 2116 },
  commodoreButtonsTopLeft: { x: 531, y: 2171 },
  commodoreButtonsBottomRight: { x: 543, y: 2183 },
  antechamberTopLeft: { x: 305, y: 2928 },
  antechamberBottomRight: { x: 775, y: 3400 },
  sauceDropTopLeft: { x: 536, y: 370 },
  sauceDropBottomRight: { x: 604, y: 2858 }
};

const DEFAULT_CHAPEL_HOTSPOTS_EXPECTED = [
  {
    id: 'chapel-commodore-power-button',
    label: 'Commodore power button',
    variant: 'power-button',
    anchors: ['commodoreButtonsTopLeft', 'commodoreButtonsBottomRight'],
    href: '/commodore.html'
  },
  {
    id: 'chapel-antechamber',
    label: 'Antechamber',
    anchors: ['antechamberTopLeft', 'antechamberBottomRight'],
    href: '/antechamber.html'
  }
];

test('HotspotStore GET returns default chapel hotspot config when storage is empty', async () => {
  const { state } = makeKeyedState();
  const store = new HotspotStore(state);

  const response = await store.fetch(new Request('https://example.com/api/chapel-hotspots', { method: 'GET' }));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body.anchorPoints, DEFAULT_CHAPEL_ANCHOR_POINTS_EXPECTED);
  assert.deepEqual(body.hotspots, DEFAULT_CHAPEL_HOTSPOTS_EXPECTED);
});

test('HotspotStore POST sanitizes and stores chapel hotspot config', async () => {
  const { state, calls, getStored } = makeKeyedState();
  const store = new HotspotStore(state);

  const response = await store.fetch(
    new Request('https://example.com/api/chapel-hotspots', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        anchorPoints: {
          chapelMonitorShadowTopLeft: { x: 501.6, y: 2001.2 },
          chapelMonitorShadowBottomRight: { x: 640.9, y: 2120.7 },
          commodoreButtonsTopLeft: { x: -12.2, y: 99999.4 },
          commodoreButtonsBottomRight: { x: 547.4, y: 2182.2 },
          ignored: { x: 1, y: 2 }
        },
        hotspots: [
          { id: 'chapel-commodore-power-button', href: 'https://example.com/not-allowed' },
          { id: 'chapel-antechamber', href: '/antechamber-override.html' },
          { id: 'other-hotspot', href: '/ignored' }
        ]
      })
    })
  );

  const body = await response.json();

  // Updated values: provided anchor points are sanitised/clamped; others use defaults
  const expectedAnchorPoints = {
    ...DEFAULT_CHAPEL_ANCHOR_POINTS_EXPECTED,
    chapelMonitorShadowTopLeft: { x: 502, y: 2001 },
    chapelMonitorShadowBottomRight: { x: 641, y: 2121 },
    commodoreButtonsTopLeft: { x: 0, y: 3709 },
    commodoreButtonsBottomRight: { x: 547, y: 2182 }
  };

  const expectedHotspots = [
    {
      id: 'chapel-commodore-power-button',
      label: 'Commodore power button',
      variant: 'power-button',
      anchors: ['commodoreButtonsTopLeft', 'commodoreButtonsBottomRight'],
      href: '/commodore.html'
    },
    {
      id: 'chapel-antechamber',
      label: 'Antechamber',
      anchors: ['antechamberTopLeft', 'antechamberBottomRight'],
      href: '/antechamber-override.html'
    }
  ];

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.deepEqual(body.anchorPoints, expectedAnchorPoints);
  assert.deepEqual(body.hotspots, expectedHotspots);
  assert.deepEqual(calls.put, [
    {
      key: 'chapel-hotspots',
      value: {
        anchorPoints: expectedAnchorPoints,
        hotspots: expectedHotspots
      }
    }
  ]);
  assert.deepEqual(getStored('chapel-hotspots'), {
    anchorPoints: expectedAnchorPoints,
    hotspots: expectedHotspots
  });
});

test('functions HotspotStore returns 405 for unsupported methods', async () => {
  const { state } = makeFunctionsState(undefined);
  const store = new FunctionsHotspotStore(state);

  const response = await store.fetch(new Request('https://example.com/api/hotspots', { method: 'DELETE' }));

  assert.equal(response.status, 405);
  assert.deepEqual(await response.json(), { error: 'Method not allowed.' });
});

// --- functions/api/hotspots.js onRequest additional coverage ---

test('functions/api/hotspots onRequest handles OPTIONS preflight', async () => {
  const response = await onHotspotsRequest({
    request: new Request('https://example.com/api/hotspots', { method: 'OPTIONS' }),
    env: {}
  });

  assert.equal(response.status, 204);
  assert.equal(response.headers.get('access-control-allow-methods'), 'GET, POST, OPTIONS');
  assert.equal(response.headers.get('access-control-allow-headers'), 'content-type');
});

test('functions/api/hotspots onRequest returns 500 when stub.fetch throws', async () => {
  const env = {
    HOTSPOT_STORE: {
      idFromName() { return 'id:den-hotspots'; },
      get() {
        return {
          async fetch() { throw new Error('connection refused'); }
        };
      }
    }
  };

  const response = await onHotspotsRequest({
    request: new Request('https://example.com/api/hotspots', { method: 'GET' }),
    env
  });
  const body = await response.json();

  assert.equal(response.status, 500);
  assert.match(body.error, /Hotspot store request failed/);
  assert.match(body.error, /connection refused/);
});

test('functions/api/hotspots onRequest delegates POST requests', async () => {
  const calls = { fetch: 0 };
  const expected = new Response(JSON.stringify({ ok: true }), { status: 200 });

  const env = {
    HOTSPOT_STORE: {
      idFromName() { return 'id:den-hotspots'; },
      get() {
        return {
          async fetch(request) {
            calls.fetch += 1;
            assert.equal(request.method, 'POST');
            return expected;
          }
        };
      }
    }
  };

  const response = await onHotspotsRequest({
    request: new Request('https://example.com/api/hotspots', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ hotspots: [] })
    }),
    env
  });

  assert.equal(response, expected);
  assert.equal(calls.fetch, 1);
});

test('HotspotStore GET reports unknown load errors without message text', async () => {
  const state = {
    storage: {
      async get() { throw {}; },
      async put() {}
    }
  };
  const store = new HotspotStore(state);

  const response = await store.fetch(new Request('https://example.com/api/hotspots', { method: 'GET' }));

  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: 'Failed to load hotspots: Unknown error' });
});

test('HotspotStore POST reports unknown save errors without message text', async () => {
  const state = {
    storage: {
      async get() { return undefined; },
      async put() { throw {}; }
    }
  };
  const store = new HotspotStore(state);

  const response = await store.fetch(
    new Request('https://example.com/api/hotspots', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ hotspots: [] })
    })
  );

  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: 'Failed to save hotspots: Unknown error' });
});

test('FunctionsHotspotStore POST falls back to defaults for non-finite values', async () => {
  const { state } = makeFunctionsState(undefined);
  const store = new FunctionsHotspotStore(state);

  const response = await store.fetch(
    new Request('https://example.com/api/hotspots', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        hotspots: [
          null,
          { id: 'noahs-arcade', x: 'bad', y: null, w: Infinity, h: undefined }
        ]
      })
    })
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body.hotspots[0], { id: 'noahs-arcade', x: 880, y: 320, w: 2050, h: 1280 });
});

test('FunctionsHotspotStore POST uses defaults when hotspots payload is not an array', async () => {
  const { state } = makeFunctionsState(undefined);
  const store = new FunctionsHotspotStore(state);

  const response = await store.fetch(
    new Request('https://example.com/api/hotspots', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ hotspots: null })
    })
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.hotspots.length, 7);
  assert.deepEqual(body.hotspots[0], { id: 'noahs-arcade', x: 880, y: 320, w: 2050, h: 1280 });
  assert.deepEqual(body.hotspots[1], { id: 'aquarium', x: 2680, y: 445, w: 455, h: 729 });
  assert.equal(body.hotspots.find((hotspot) => hotspot.id === 'overlay-left-monitor-control'), undefined);
});

test('functions/api/hotspots onRequest returns unknown error text when durable object throws non-Error', async () => {
  const env = {
    HOTSPOT_STORE: {
      idFromName() { return 'id:den-hotspots'; },
      get() {
        return {
          async fetch() { throw {}; }
        };
      }
    }
  };

  const response = await onHotspotsRequest({
    request: new Request('https://example.com/api/hotspots', { method: 'GET' }),
    env
  });

  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: 'Hotspot store request failed: Unknown error' });
});

// ---- Discord OAuth tests ----

const TEST_SESSION_SECRET = 'test-session-secret-32-bytes-long!!';

test('createSessionToken produces a verifiable token', async () => {
  const payload = { userId: '123', username: 'testuser', isMember: true, roles: ['roleA'], exp: Date.now() + 60000 };
  const token = await createSessionToken(TEST_SESSION_SECRET, payload);
  assert.equal(typeof token, 'string');
  assert.ok(token.includes('.'));

  const verified = await verifySessionToken(TEST_SESSION_SECRET, token);
  assert.equal(verified.userId, '123');
  assert.equal(verified.username, 'testuser');
  assert.equal(verified.isMember, true);
  assert.deepEqual(verified.roles, ['roleA']);
});

test('verifySessionToken rejects a tampered payload', async () => {
  const payload = { userId: '123', exp: Date.now() + 60000 };
  const token = await createSessionToken(TEST_SESSION_SECRET, payload);
  const [encoded, sig] = [token.slice(0, token.lastIndexOf('.')), token.slice(token.lastIndexOf('.') + 1)];
  const tampered = Buffer.from(JSON.stringify({ userId: 'HACKED', exp: Date.now() + 60000 })).toString('base64url');
  const result = await verifySessionToken(TEST_SESSION_SECRET, `${tampered}.${sig}`);
  assert.equal(result, null);
});

test('verifySessionToken returns null for an expired token', async () => {
  const payload = { userId: '123', exp: Date.now() - 1000 };
  const token = await createSessionToken(TEST_SESSION_SECRET, payload);
  const result = await verifySessionToken(TEST_SESSION_SECRET, token);
  assert.equal(result, null);
});

test('verifySessionToken returns null for null/undefined/empty', async () => {
  assert.equal(await verifySessionToken(TEST_SESSION_SECRET, null), null);
  assert.equal(await verifySessionToken(TEST_SESSION_SECRET, undefined), null);
  assert.equal(await verifySessionToken(TEST_SESSION_SECRET, ''), null);
  assert.equal(await verifySessionToken(TEST_SESSION_SECRET, 'nodot'), null);
});

test('worker /api/discord/auth redirects to Discord OAuth with state cookie', async () => {
  const env = { DISCORD_CLIENT_ID: 'test-client-id', ASSETS: { async fetch() { return new Response(''); } } };
  const response = await router.fetch(new Request('https://naimean.com/api/discord/auth'), env);

  assert.equal(response.status, 302);
  const location = response.headers.get('Location');
  assert.ok(location.startsWith('https://discord.com/oauth2/authorize?'));
  assert.ok(location.includes('client_id=test-client-id'));
  assert.ok(location.includes('response_type=code'));
  assert.ok(location.includes('scope='));
  assert.ok(location.includes('state='));

  const setCookie = response.headers.get('Set-Cookie');
  assert.ok(setCookie.includes('naimean_oauth_state='));
  assert.ok(setCookie.includes('HttpOnly'));
  assert.ok(setCookie.includes('SameSite=Lax'));
});

test('worker /api/discord/auth redirects to /?discord_error=configuration_error when DISCORD_CLIENT_ID is missing', async () => {
  const env = { ASSETS: { async fetch() { return new Response(''); } } };
  const response = await router.fetch(new Request('https://naimean.com/api/discord/auth'), env);
  assert.equal(response.status, 302);
  assert.ok(response.headers.get('Location').includes('discord_error=configuration_error'));
});

test('worker /api/discord/auth returns 405 for non-GET methods', async () => {
  const env = { DISCORD_CLIENT_ID: 'cid', ASSETS: { async fetch() { return new Response(''); } } };
  const response = await router.fetch(
    new Request('https://naimean.com/api/discord/auth', { method: 'POST' }),
    env
  );
  assert.equal(response.status, 405);
});

test('worker /api/discord/callback redirects to /?discord_error=invalid_request when code is missing', async () => {
  const env = { ASSETS: { async fetch() { return new Response(''); } } };
  const response = await router.fetch(
    new Request('https://naimean.com/api/discord/callback?state=abc'),
    env
  );
  assert.equal(response.status, 302);
  assert.ok(response.headers.get('Location').includes('discord_error=invalid_request'));
});

test('worker /api/discord/callback redirects to /?discord_error=invalid_request when state is missing', async () => {
  const env = { ASSETS: { async fetch() { return new Response(''); } } };
  const response = await router.fetch(
    new Request('https://naimean.com/api/discord/callback?code=mycode'),
    env
  );
  assert.equal(response.status, 302);
  assert.ok(response.headers.get('Location').includes('discord_error=invalid_request'));
});

test('worker /api/discord/callback redirects to /?discord_error=state_mismatch when state cookie is absent', async () => {
  const env = { ASSETS: { async fetch() { return new Response(''); } } };
  const response = await router.fetch(
    new Request('https://naimean.com/api/discord/callback?code=mycode&state=abc'),
    env
  );
  assert.equal(response.status, 302);
  assert.ok(response.headers.get('Location').includes('discord_error=state_mismatch'));
});

test('worker /api/discord/callback redirects to /?discord_error=state_mismatch when state does not match cookie', async () => {
  const env = { ASSETS: { async fetch() { return new Response(''); } } };
  const response = await router.fetch(
    new Request('https://naimean.com/api/discord/callback?code=mycode&state=abc', {
      headers: { Cookie: 'naimean_oauth_state=DIFFERENT' }
    }),
    env
  );
  assert.equal(response.status, 302);
  assert.ok(response.headers.get('Location').includes('discord_error=state_mismatch'));
});

test('worker /api/discord/callback redirects to /?discord_error=configuration_error when secrets are not configured', async () => {
  const env = {
    DISCORD_CLIENT_ID: 'cid',
    // DISCORD_CLIENT_SECRET and SESSION_SECRET intentionally missing
    ASSETS: { async fetch() { return new Response(''); } }
  };
  const response = await router.fetch(
    new Request('https://naimean.com/api/discord/callback?code=mycode&state=abc', {
      headers: { Cookie: 'naimean_oauth_state=abc' }
    }),
    env
  );
  assert.equal(response.status, 302);
  assert.ok(response.headers.get('Location').includes('discord_error=configuration_error'));
});

test('worker /api/discord/callback returns 302 to error page when Discord returns error param', async () => {
  const env = { ASSETS: { async fetch() { return new Response(''); } } };
  const response = await router.fetch(
    new Request('https://naimean.com/api/discord/callback?error=access_denied'),
    env
  );
  assert.equal(response.status, 302);
  assert.ok(response.headers.get('Location').includes('discord_error=access_denied'));
});

test('worker /api/discord/callback succeeds, sets session cookie and redirects to /', async () => {
  const env = {
    DISCORD_CLIENT_ID: 'cid',
    DISCORD_CLIENT_SECRET: 'secret',
    SESSION_SECRET: TEST_SESSION_SECRET,
    DISCORD_GUILD_ID: 'guild123',
    ASSETS: { async fetch() { return new Response(''); } }
  };
  const state = 'teststate123';

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    const u = String(url);
    if (u.includes('/oauth2/token')) {
      return Response.json({ access_token: 'tok123', token_type: 'Bearer' });
    }
    if (u.includes('/users/@me/guilds/')) {
      return Response.json({ roles: ['role-alpha', 'role-beta'] });
    }
    if (u.includes('/users/@me')) {
      return Response.json({ id: 'user999', username: 'naimean_tester', avatar: 'avatarhash' });
    }
    throw new Error(`Unexpected fetch: ${u}`);
  };

  try {
    const response = await router.fetch(
      new Request(`https://naimean.com/api/discord/callback?code=code123&state=${state}`, {
        headers: { Cookie: `naimean_oauth_state=${state}` }
      }),
      env
    );

    assert.equal(response.status, 302);
    assert.equal(response.headers.get('Location'), '/');

    const cookies = response.headers.getSetCookie
      ? response.headers.getSetCookie()
      : [response.headers.get('Set-Cookie')];
    const sessionCookie = cookies.find((c) => c.startsWith('naimean_session='));
    assert.ok(sessionCookie, 'session cookie should be set');
    assert.ok(sessionCookie.includes('HttpOnly'));
    assert.ok(sessionCookie.includes('SameSite=Lax'));

    const stateClearCookie = cookies.find((c) => c.startsWith('naimean_oauth_state=;'));
    assert.ok(stateClearCookie, 'state cookie should be cleared');

    // Verify the session payload
    const tokenValue = sessionCookie.split(';')[0].split('=').slice(1).join('=');
    const session = await verifySessionToken(TEST_SESSION_SECRET, tokenValue);
    assert.equal(session.userId, 'user999');
    assert.equal(session.username, 'naimean_tester');
    assert.equal(session.isMember, true);
    assert.deepEqual(session.roles, ['role-alpha', 'role-beta']);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('worker /api/discord/callback sets isMember=false when user is not in guild', async () => {
  const env = {
    DISCORD_CLIENT_ID: 'cid',
    DISCORD_CLIENT_SECRET: 'secret',
    SESSION_SECRET: TEST_SESSION_SECRET,
    DISCORD_GUILD_ID: 'guild123',
    ASSETS: { async fetch() { return new Response(''); } }
  };
  const state = 'nonmemberstate';

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const u = String(url);
    if (u.includes('/oauth2/token')) {
      return Response.json({ access_token: 'tok456', token_type: 'Bearer' });
    }
    if (u.includes('/users/@me/guilds/')) {
      return new Response('Forbidden', { status: 403 });
    }
    if (u.includes('/users/@me')) {
      return Response.json({ id: 'user111', username: 'outsider', avatar: null });
    }
    throw new Error(`Unexpected fetch: ${u}`);
  };

  try {
    const response = await router.fetch(
      new Request(`https://naimean.com/api/discord/callback?code=code456&state=${state}`, {
        headers: { Cookie: `naimean_oauth_state=${state}` }
      }),
      env
    );

    assert.equal(response.status, 302);
    const cookies = response.headers.getSetCookie
      ? response.headers.getSetCookie()
      : [response.headers.get('Set-Cookie')];
    const sessionCookie = cookies.find((c) => c.startsWith('naimean_session='));
    assert.ok(sessionCookie);

    const tokenValue = sessionCookie.split(';')[0].split('=').slice(1).join('=');
    const session = await verifySessionToken(TEST_SESSION_SECRET, tokenValue);
    assert.equal(session.isMember, false);
    assert.deepEqual(session.roles, []);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('worker /api/discord/callback redirects to /?discord_error=token_exchange_failed when token exchange fails', async () => {
  const env = {
    DISCORD_CLIENT_ID: 'cid',
    DISCORD_CLIENT_SECRET: 'secret',
    SESSION_SECRET: TEST_SESSION_SECRET,
    ASSETS: { async fetch() { return new Response(''); } }
  };
  const state = 'badtokenstate';

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (String(url).includes('/oauth2/token')) {
      return new Response('Bad Request', { status: 400 });
    }
    throw new Error('Unexpected fetch');
  };

  try {
    const response = await router.fetch(
      new Request(`https://naimean.com/api/discord/callback?code=badcode&state=${state}`, {
        headers: { Cookie: `naimean_oauth_state=${state}` }
      }),
      env
    );
    assert.equal(response.status, 302);
    assert.ok(response.headers.get('Location').includes('discord_error=token_exchange_failed'));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('worker /api/discord/me returns unauthenticated when no session cookie', async () => {
  const env = {
    SESSION_SECRET: TEST_SESSION_SECRET,
    ASSETS: { async fetch() { return new Response(''); } }
  };
  const response = await router.fetch(new Request('https://naimean.com/api/discord/me'), env);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { authenticated: false });
});

test('worker /api/discord/me returns user info for valid session', async () => {
  const env = {
    SESSION_SECRET: TEST_SESSION_SECRET,
    DISCORD_ALLOWED_ROLE_IDS: 'role-alpha',
    ASSETS: { async fetch() { return new Response(''); } }
  };
  const token = await createSessionToken(TEST_SESSION_SECRET, {
    userId: 'u42',
    username: 'member_user',
    avatar: null,
    isMember: true,
    roles: ['role-alpha'],
    exp: Date.now() + 60000,
  });
  const response = await router.fetch(
    new Request('https://naimean.com/api/discord/me', {
      headers: { Cookie: `naimean_session=${token}` }
    }),
    env
  );
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.authenticated, true);
  assert.equal(body.userId, 'u42');
  assert.equal(body.username, 'member_user');
  assert.equal(body.isMember, true);
  assert.equal(body.hasRole, true);
  assert.deepEqual(body.roles, ['role-alpha']);
});

test('worker /api/discord/me returns hasRole=false when user lacks required role', async () => {
  const env = {
    SESSION_SECRET: TEST_SESSION_SECRET,
    DISCORD_ALLOWED_ROLE_IDS: 'role-special',
    ASSETS: { async fetch() { return new Response(''); } }
  };
  const token = await createSessionToken(TEST_SESSION_SECRET, {
    userId: 'u43',
    username: 'basic_user',
    avatar: null,
    isMember: true,
    roles: ['role-other'],
    exp: Date.now() + 60000,
  });
  const response = await router.fetch(
    new Request('https://naimean.com/api/discord/me', {
      headers: { Cookie: `naimean_session=${token}` }
    }),
    env
  );
  const body = await response.json();
  assert.equal(body.authenticated, true);
  assert.equal(body.hasRole, false);
});

test('worker /api/discord/me returns hasRole=true when DISCORD_ALLOWED_ROLE_IDS is empty', async () => {
  const env = {
    SESSION_SECRET: TEST_SESSION_SECRET,
    DISCORD_ALLOWED_ROLE_IDS: '',
    ASSETS: { async fetch() { return new Response(''); } }
  };
  const token = await createSessionToken(TEST_SESSION_SECRET, {
    userId: 'u44',
    username: 'any_member',
    avatar: null,
    isMember: true,
    roles: [],
    exp: Date.now() + 60000,
  });
  const response = await router.fetch(
    new Request('https://naimean.com/api/discord/me', {
      headers: { Cookie: `naimean_session=${token}` }
    }),
    env
  );
  const body = await response.json();
  assert.equal(body.hasRole, true);
});

test('worker /api/discord/logout clears session cookie', async () => {
  const env = { ASSETS: { async fetch() { return new Response(''); } } };
  const response = await router.fetch(
    new Request('https://naimean.com/api/discord/logout', { method: 'POST' }),
    env
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  const setCookie = response.headers.get('Set-Cookie');
  assert.ok(setCookie.includes('naimean_session=;'));
  assert.ok(setCookie.includes('Max-Age=0'));
});

test('worker /api/discord/logout returns 405 for GET', async () => {
  const env = { ASSETS: { async fetch() { return new Response(''); } } };
  const response = await router.fetch(new Request('https://naimean.com/api/discord/logout'), env);
  assert.equal(response.status, 405);
});

test('worker applies long-lived cache headers to versioned .png assets', async () => {
  const env = {
    HOTSPOT_STORE: {},
    ASSETS: {
      async fetch() {
        return new Response('img-bytes', { status: 200, headers: { 'content-type': 'image/png' } });
      }
    }
  };
  const response = await router.fetch(
    new Request('https://example.com/assets/images/commodore64.v20260424.png'),
    env
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'public, max-age=31536000, immutable');
});

test('worker applies long-lived cache headers to versioned .mp4 assets', async () => {
  const env = {
    HOTSPOT_STORE: {},
    ASSETS: {
      async fetch() {
        return new Response('vid-bytes', { status: 200, headers: { 'content-type': 'video/mp4' } });
      }
    }
  };
  const response = await router.fetch(
    new Request('https://example.com/assets/video/static.v20260424.mp4'),
    env
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'public, max-age=31536000, immutable');
});

test('worker applies must-revalidate cache headers to non-versioned assets', async () => {
  const env = {
    HOTSPOT_STORE: {},
    ASSETS: {
      async fetch() {
        return new Response('img-bytes', { status: 200, headers: { 'content-type': 'image/png' } });
      }
    }
  };
  const response = await router.fetch(
    new Request('https://example.com/assets/images/logo.png'),
    env
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'public, max-age=0, must-revalidate');
});
