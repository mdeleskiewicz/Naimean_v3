const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "content-type, authorization",
};

function jsonResponse(data, status = 200) {
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
  if (!env.ASSETS) {
    return new Response("Missing ASSETS binding", { status: 500 });
  }

  return env.ASSETS.fetch(assetRequest(request, "/index.html"));
}

export class HotspotStore {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          ...JSON_HEADERS,
          "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS",
        },
      });
    }

    if (pathname === "/api/health") {
      return jsonResponse({
        ok: true,
        service: "Naimean HotspotStore",
        time: new Date().toISOString(),
      });
    }

    const roomMatch = pathname.match(/^\/api\/room-state\/([^/]+)$/);

    const key = roomMatch
      ? `room-state:${decodeURIComponent(roomMatch[1])}`
      : pathname.replace(/^\/api\//, "");

    if (!key || key === pathname) {
      return jsonResponse({ ok: false, error: "Unknown API route", pathname }, 404);
    }

    if (request.method === "GET") {
      const value = await this.state.storage.get(key);

      if (value !== undefined && value !== null) {
        return jsonResponse(value);
      }

      if (
        key === "hotspots" ||
        key === "chapel-hotspots" ||
        key === "notes" ||
        key === "calendar-events"
      ) {
        return jsonResponse([]);
      }

      return jsonResponse({});
    }

    if (request.method === "POST" || request.method === "PUT") {
      let body;

      try {
        body = await request.json();
      } catch {
        return jsonResponse({ ok: false, error: "Invalid JSON body" }, 400);
      }

      await this.state.storage.put(key, body);

      return jsonResponse({
        ok: true,
        key,
        data: body,
        updated_at: new Date().toISOString(),
      });
    }

    if (request.method === "DELETE") {
      await this.state.storage.delete(key);
      return jsonResponse({ ok: true, key, deleted: true });
    }

    return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
  }
}

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      const pathname = url.pathname;

      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: {
            ...JSON_HEADERS,
            "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS",
          },
        });
      }

      if (pathname.startsWith("/api/")) {
        if (!env.HOTSPOT_STORE) {
          return jsonResponse({
            ok: false,
            error: "Missing HOTSPOT_STORE binding",
          }, 500);
        }

        const id = env.HOTSPOT_STORE.idFromName("global");
        const obj = env.HOTSPOT_STORE.get(id);
        return obj.fetch(request);
      }

      if (
        pathname === "/" ||
        pathname === "/den" ||
        pathname === "/den.html" ||
        pathname === "/index.html"
      ) {
        return serveIndex(request, env);
      }

      if (!env.ASSETS) {
        return new Response("Missing ASSETS binding", { status: 500 });
      }

      const assetResponse = await env.ASSETS.fetch(request);

      if (assetResponse.status !== 404) {
        return assetResponse;
      }

      const acceptsHtml = request.headers.get("accept")?.includes("text/html");

      if (acceptsHtml) {
        return serveIndex(request, env);
      }

      return assetResponse;
    } catch (err) {
      return jsonResponse(
        {
          ok: false,
          error: "Worker exception",
          message: err?.message || String(err),
        },
        500
      );
    }
  },
};
