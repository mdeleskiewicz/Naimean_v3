const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "content-type, authorization",
};

function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders },
  });
}

function textResponse(text, status = 200, headers = {}) {
  return new Response(text, {
    status,
    headers,
  });
}

function corsOptions(methods = "GET, POST, PUT, DELETE, OPTIONS") {
  return new Response(null, {
    status: 204,
    headers: {
      ...JSON_HEADERS,
      "access-control-allow-methods": methods,
    },
  });
}

async function parseJsonBody(request) {
  try {
    return { body: await request.json(), error: null };
  } catch {
    return {
      body: null,
      error: jsonResponse({ ok: false, error: "Invalid JSON body." }, 400),
    };
  }
}

function makeAssetRequest(request, pathname) {
  const url = new URL(request.url);
  url.pathname = pathname;
  return new Request(url.toString(), request);
}

async function serveAsset(request, env, pathname = null) {
  if (!env.ASSETS) {
    return textResponse("ASSETS binding is missing.", 500);
  }

  const assetRequest = pathname ? makeAssetRequest(request, pathname) : request;
  return env.ASSETS.fetch(assetRequest);
}

function isPageRoute(pathname) {
  return (
    pathname === "/" ||
    pathname === "/den" ||
    pathname === "/den.html" ||
    pathname === "/index.html"
  );
}

function defaultForKey(key) {
  if (
    key === "hotspots" ||
    key === "chapel-hotspots" ||
    key === "notes" ||
    key === "calendar-events"
  ) {
    return [];
  }

  if (
    key === "arcade-url-overrides" ||
    key === "corner-score" ||
    key === "user-preferences"
  ) {
    return {};
  }

  if (key.startsWith("room-state:")) {
    return {};
  }

  return null;
}

function apiKeyFromPath(pathname) {
  const roomStateMatch = pathname.match(/^\/api\/room-state\/([^/]+)$/);
  if (roomStateMatch) {
    return `room-state:${decodeURIComponent(roomStateMatch[1])}`;
  }

  const simpleMap = {
    "/api/hotspots": "hotspots",
    "/api/chapel-hotspots": "chapel-hotspots",
    "/api/arcade-url-overrides": "arcade-url-overrides",
    "/api/corner-score": "corner-score",
    "/api/notes": "notes",
    "/api/calendar-events": "calendar-events",
    "/api/user-preferences": "user-preferences",
  };

  return simpleMap[pathname] || null;
}

export class HotspotStore {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;

    this.state.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS kv_store (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    this.initialized = true;
  }

  async getValue(key) {
    await this.init();

    const row = this.state.storage.sql
      .exec("SELECT value FROM kv_store WHERE key = ? LIMIT 1", key)
      .one();

    if (!row) return defaultForKey(key);

    try {
      return JSON.parse(row.value);
    } catch {
      return defaultForKey(key);
    }
  }

  async setValue(key, value) {
    await this.init();

    this.state.storage.sql.exec(
      `
      INSERT INTO kv_store (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
      `,
      key,
      JSON.stringify(value),
      new Date().toISOString()
    );

    return value;
  }

  async deleteValue(key) {
    await this.init();
    this.state.storage.sql.exec("DELETE FROM kv_store WHERE key = ?", key);
  }

  async fetchDriveNotes() {
    const folderId =
      this.env.GOOGLE_DRIVE_SHRIMP_FOLDER_ID ||
      this.env.GOOGLE_DRIVE_FOLDER_ID ||
      "13mnHEVznrsh_Lw1RZNhK7wWDV57ZRXyb";

    const apiKey = this.env.GOOGLE_DRIVE_API_KEY;

    if (!apiKey) {
      return jsonResponse({
        ok: false,
        error: "GOOGLE_DRIVE_API_KEY is not configured.",
        files: [],
      }, 200);
    }

    const pageSize = this.env.GOOGLE_DRIVE_PAGE_SIZE || "100";
    const q = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
    const url =
      `https://www.googleapis.com/drive/v3/files?q=${q}` +
      `&pageSize=${encodeURIComponent(pageSize)}` +
      `&fields=files(id,name,mimeType,webViewLink,webContentLink,modifiedTime)` +
      `&key=${encodeURIComponent(apiKey)}`;

    const res = await fetch(url);
    const data = await res.json();

    return jsonResponse({
      ok: res.ok,
      files: data.files || [],
      raw: res.ok ? undefined : data,
    }, res.ok ? 200 : 502);
  }

  async fetch(request) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    if (request.method === "OPTIONS") {
      return corsOptions();
    }

    if (pathname === "/api/health") {
      return jsonResponse({
        ok: true,
        service: "Naimean HotspotStore",
        time: new Date().toISOString(),
      });
    }

    if (pathname === "/api/fetch-drive-notes") {
      return this.fetchDriveNotes();
    }

    const key = apiKeyFromPath(pathname);

    if (!key) {
      return jsonResponse({
        ok: false,
        error: "Unknown API endpoint.",
        path: pathname,
      }, 404);
    }

    if (request.method === "GET") {
      const data = await this.getValue(key);
      return jsonResponse(data);
    }

    if (request.method === "POST" || request.method === "PUT") {
      const { body, error } = await parseJsonBody(request);
      if (error) return error;

      const saved = await this.setValue(key, body);

      return jsonResponse({
        ok: true,
        key,
        data: saved,
        updated_at: new Date().toISOString(),
      });
    }

    if (request.method === "DELETE") {
      await this.deleteValue(key);
      return jsonResponse({ ok: true, key, deleted: true });
    }

    return jsonResponse({ ok: false, error: "Method not allowed." }, 405);
  }
}

async function handleDiscordAuth(request, env) {
  const clientId = env.DISCORD_CLIENT_ID;
  const redirectUri = env.DISCORD_REDIRECT_URI || `${new URL(request.url).origin}/api/discord/callback`;

  if (!clientId) {
    return jsonResponse({
      ok: false,
      error: "DISCORD_CLIENT_ID is not configured.",
    }, 500);
  }

  const state = crypto.randomUUID();
  const authUrl = new URL("https://discord.com/oauth2/authorize");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "identify guilds guilds.members.read");
  authUrl.searchParams.set("state", state);

  return new Response(null, {
    status: 302,
    headers: {
      location: authUrl.toString(),
      "set-cookie": `naimean_oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
    },
  });
}

async function handleDiscordCallback(request, env) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return textResponse("Discord callback missing code.", 400);
  }

  if (!env.DISCORD_CLIENT_ID || !env.DISCORD_CLIENT_SECRET) {
    return textResponse("Discord OAuth secret is not configured.", 500);
  }

  const redirectUri = env.DISCORD_REDIRECT_URI || `${url.origin}/api/discord/callback`;

  const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.DISCORD_CLIENT_ID,
      client_secret: env.DISCORD_CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  const tokenData = await tokenRes.json();

  if (!tokenRes.ok || !tokenData.access_token) {
    return jsonResponse({
      ok: false,
      error: "Discord token exchange failed.",
      details: tokenData,
    }, 502);
  }

  return new Response(null, {
    status: 302,
    headers: {
      location: "/den",
      "set-cookie": `naimean_session=${tokenData.access_token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`,
    },
  });
}

function handleDiscordLogout() {
  return new Response(null, {
    status: 302,
    headers: {
      location: "/den",
      "set-cookie": "naimean_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0",
    },
  });
}

async function handleDiscordMe(request) {
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(/(?:^|;\s*)naimean_session=([^;]+)/);
  const token = match ? decodeURIComponent(match[1]) : null;

  if (!token) {
    return jsonResponse({ ok: true, authenticated: false, user: null });
  }

  const res = await fetch("https://discord.com/api/users/@me", {
    headers: { authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    return jsonResponse({ ok: true, authenticated: false, user: null });
  }

  const user = await res.json();

  return jsonResponse({
    ok: true,
    authenticated: true,
    user,
  });
}

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      const pathname = url.pathname;

      if (request.method === "OPTIONS") {
        return corsOptions();
      }

      if (pathname === "/api/discord/auth") {
        return handleDiscordAuth(request, env);
      }

      if (pathname === "/api/discord/callback") {
        return handleDiscordCallback(request, env);
      }

      if (pathname === "/api/discord/logout") {
        return handleDiscordLogout();
      }

      if (pathname === "/api/discord/me") {
        return handleDiscordMe(request);
      }

      if (pathname.startsWith("/api/")) {
        if (!env.HOTSPOT_STORE) {
          return jsonResponse({
            ok: false,
            error: "HOTSPOT_STORE binding is missing.",
          }, 500);
        }

        const id = env.HOTSPOT_STORE.idFromName("global");
        const obj = env.HOTSPOT_STORE.get(id);
        return obj.fetch(request);
      }

      if (isPageRoute(pathname)) {
        return serveAsset(request, env, "/index.html");
      }

      const assetResponse = await serveAsset(request, env);

      if (assetResponse.status !== 404) {
        return assetResponse;
      }

      const acceptsHtml = request.headers.get("accept")?.includes("text/html");
      if (acceptsHtml) {
        return serveAsset(request, env, "/index.html");
      }

      return assetResponse;
    } catch (err) {
      return jsonResponse({
        ok: false,
        error: "Worker threw exception.",
        message: err && err.message ? err.message : String(err),
        stack: err && err.stack ? err.stack : undefined,
      }, 500);
    }
  },
};
