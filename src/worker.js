import { jsonResponse, JSON_HEADERS } from './core/utils';

// ─── Durable Object Class Wrapper ─────────────────────────────────────────────
export class HotspotStore {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    const url = new URL(request.url);
    const { pathname } = url;

    // Wrapped logic to avoid top-level return
    const initResult = await this.handleInitialization(pathname);
    if (initResult) return initResult;

    // Continue from HotspotStore.fetch
    const isUserPreferences = pathname === '/api/user-preferences';
    const roomStateMatch = pathname.match(/^\/api\/room-state\/([^/]+)$/);

    if (request.method === 'OPTIONS' && (isUserPreferences || roomStateMatch)) {
      const methods = 'GET, PUT, OPTIONS';
      return new Response(null, {
        status: 204,
        headers: { ...JSON_HEADERS, 'access-control-allow-methods': methods }
      });
    }

    // ... [Include your isUserPreferences and roomStateMatch handlers here] ...

    return jsonResponse({ error: 'Method not allowed.' }, 405);
  }

  // --- Helper methods ---
  async handleInitialization(pathname) {
    if (pathname === '/api/fetch-drive-notes') {
      const FOLDER_ID = '13mnHEVznrsh_Lw1RZNhK7wWDV57ZRXyb';
      const API_KEY = this.env.GOOGLE_DRIVE_API_KEY;
      const res = await fetch(`https://www.googleapis.com/drive/v3/files?q='${FOLDER_ID}'+in+parents&key=${API_KEY}`);
      const data = await res.json();
      return jsonResponse(data.files || []);
    }
    return null;
  }

  userIdFromRequest(request) {
    return "default-user";
  }

  async parseJsonBody(request) {
    try {
      return { body: await request.json(), error: null };
    } catch (e) {
      return { body: null, error: jsonResponse({ error: 'Invalid JSON' }, 400) };
    }
  }
}
// ─── Main worker entry router ──────────────────────────────────────────────────
  // Note: Place any additional helper methods (like Aquarium, proxy, etc.) here if needed.

} // End of HotspotStore class

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;

    // Static Asset Routing
    // Serving static assets directly from ASSETS binding
    if (pathname.startsWith('/assets/')) {
        return env.ASSETS.fetch(request);
    }

    // Direct requests to the Durable Object
    const id = env.HOTSPOT_STORE.idFromName('global');
    const obj = env.HOTSPOT_STORE.get(id);
    return obj.fetch(request);
  }
};
