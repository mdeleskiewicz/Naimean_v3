export class HotspotStore {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    return new Response(
      JSON.stringify({
        ok: true,
        worker: "api-alive",
        time: new Date().toISOString(),
      }),
      { headers: { "content-type": "application/json" } }
    );
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      const id = env.HOTSPOT_STORE.idFromName("global");
      return env.HOTSPOT_STORE.get(id).fetch(request);
    }

    return new Response(
      `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Naimean Debug</title>
</head>
<body style="background:#050814;color:#39ff14;font-family:monospace;padding:40px">
  <h1>Naimean Worker Loaded</h1>
  <p>No redirect happened.</p>
  <p>Worker is serving hardcoded HTML.</p>
</body>
</html>`,
      {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store",
          "x-naimean-worker": "hardcoded-html-debug",
        },
      }
    );
  },
};
