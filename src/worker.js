const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-naimean-worker": "debug-no-redirect-v1",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: JSON_HEADERS,
  });
}

function assetRequest(request, pathname) {
  const url = new URL(request.url);
  url.pathname = pathname;
  return new Request(url.toString(), request);
}

async function serveIndex(request, env) {
  const res = await env.ASSETS.fetch(assetRequest(request, "/index.html"));
  const headers = new Headers(res.headers);
  headers.set("cache-control", "no-store");
  headers.set("x-naimean-worker", "debug-no-redirect-v1");
  headers.set("content-type", "text/html; charset=utf-8");
  return new Response(res.body, { status: res.status, headers });
}

export class HotspotStore {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    const url = new URL(request.url);
    const key = url.pathname.replace(/^\/api\//, "");

    if (url.pathname === "/api/health") {
      return json({
        ok: true,
        worker: "debug-no-redirect-v1",
        time: new Date().toISOString(),
      });
    }

    if (request.method === "GET") {
      return json((await this.state.storage.get(key)) ?? {});
    }

    if (request.method === "POST" || request.method === "PUT") {
      const body = await request.json();
      await this.state.storage.put(key, body);
      return json({ ok: true, key, data: body });
    }

    return json({ ok: false, error: "Method not allowed" }, 405);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      const id = env.HOTSPOT_STORE.idFromName("global");
      return env.HOTSPOT_STORE.get(id).fetch(request);
    }

    return serveIndex(request, env);
  },
};
