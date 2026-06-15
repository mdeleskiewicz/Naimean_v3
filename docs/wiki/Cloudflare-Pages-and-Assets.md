# Cloudflare Pages and Assets

## What Is Cloudflare Pages?

**Cloudflare Pages** is Cloudflare's static site hosting platform. You point it at a folder full of HTML, CSS, JavaScript, images, and videos, and Cloudflare serves those files globally from its edge network — no web server configuration required.

In older Cloudflare setups, Pages and Workers were separate products. In this project they are combined: the Worker runs first on every request, and then can delegate to the **Assets** service to serve static files.

---

## What Are "Assets"?

The **Assets** binding is how the Worker accesses the static files in the `public/` folder. When the Worker calls `env.ASSETS.fetch(request)`, Cloudflare's infrastructure finds the matching file in the `public/` directory and returns it as an HTTP response — just like a traditional web server would.

Configured in `wrangler.toml`:

```toml
[assets]
directory = "public"       # local folder deployed as static files
binding = "ASSETS"         # binding name in env (env.ASSETS)
run_worker_first = ["/*"]  # run the Worker on ALL paths before checking assets
```

The key line is `run_worker_first = ["/*"]`. Without this, Cloudflare would serve matching static files directly without calling the Worker at all. With it, **every request goes through `src/worker.js` first** — allowing the worker to add security headers, enforce auth, rewrite paths, etc. before the file is returned.

---

## How This Project Uses Assets

### Serving HTML Pages

For most page requests (anything not starting with `/api/` and not a static binary), the Worker eventually calls the `serveAsset` function:

```js
async function serveAsset(request, env, pathname) {
  // ...
  const upstream = await env.ASSETS.fetch(assetRequest);
  // ... add cache headers, security headers ...
  return new Response(upstream.body, { ... });
}
```

This fetches the file from the Assets store and returns it with additional HTTP headers applied.

### Path Aliasing

The Worker translates certain URLs before asking Assets for the file:

| Requested URL | File actually served |
|---|---|
| `/` or `/den` or `/den.html` | `public/index.html` |
| `/mame-gui`, `/mame_gui`, `/mame_gui.html` | `public/mame-gui.html` |

This is done in `serveAsset` using `INDEX_ALIAS_PATHS` and `ASSET_ALIAS_PATHS`.

### Static File Bypass

Binary files (`.mp4`, `.png`, `.gif`, `.jpg`, `.css`, `.mp3`, `.woff2`, etc.) bypass all the routing logic entirely and go straight to Assets for performance:

```js
if (shouldBypassStaticAsset(pathname)) {
  return env.ASSETS.fetch(request);
}
```

This avoids running unnecessary auth checks for images and videos.

### Cache Headers

The Worker applies different cache policies depending on the file type:

| File type | Cache policy | Why |
|---|---|---|
| HTML pages | `no-store` (never cached) | Pages must always be fresh |
| Versioned assets (e.g. `image.v20260424.png`) | `max-age=31536000, immutable` (cached for 1 year) | Filename includes version, so content never changes |
| Other static files | `max-age=0, must-revalidate` | Short-lived cache |

### `_redirects` File

The `public/_redirects` file is a Cloudflare Pages convention for declaring URL redirects without writing JavaScript:

```
/den / 301
/den.html / 301
/v2 / 301
/mame_gui /mame-gui.html 301
```

However, because `run_worker_first` is enabled on all paths, these redirects are handled by the Worker's own routing logic first. The `_redirects` file acts as a fallback for any redirects the Worker doesn't handle.

---

## The `public/` Directory Structure

```
public/
├── index.html          ← The main "Den" room (the home page)
├── commodore.html      ← Commodore 64 room
├── chapel.html         ← The Chapel room
├── antechamber.html    ← The Antechamber room
├── noahs-arcade.html   ← Noah's Arcade
├── notes.html          ← Notes app (auth-gated)
├── mame-gui.html       ← MAME GUI (auth-gated)
├── calendar.html       ← Calendar (auth-gated)
├── recombobulator.html ← The Recombobulator
├── _redirects          ← URL redirect rules
├── api-client.js       ← Shared JavaScript for API calls
├── api/                ← Placeholder files for API routes
└── assets/
    ├── images/         ← Room background images, PNGs
    ├── video/          ← MP4 video clips
    │   └── shrimp/     ← Shrimp aquarium clips
    ├── GIF/            ← Animated GIFs (e.g. big TV screensavers)
    └── audio/          ← Sound files
```

---

## Key Concepts for Learning

| Term | Plain-English meaning |
|---|---|
| **Static site** | A website made of pre-built files (HTML, images, JS) with no server dynamically generating pages |
| **Assets binding** | The `env.ASSETS` object in the Worker — lets you fetch any file from the `public/` folder |
| **`run_worker_first`** | Configuration that forces the Worker to run before any static file is returned |
| **Cache-Control** | An HTTP header that tells browsers and CDNs how long to store a file |
| **`_redirects`** | A Cloudflare Pages convention file for URL redirect rules |

---

## Further Reading

- [Cloudflare Pages — official docs](https://developers.cloudflare.com/pages/)
- [Workers + Assets (hybrid mode)](https://developers.cloudflare.com/workers/static-assets/)
- [Cloudflare Pages `_redirects` file](https://developers.cloudflare.com/pages/configuration/redirects/)
