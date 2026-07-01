# MAESTRO v1 Patch

MAESTRO is the Naimean room orchestrator. This patch is intentionally small and non-invasive.

## What this adds

- `sceneBus.js` — trigger/event bus
- `maestro.js` — root orchestrator exposed as `window.MAESTRO`
- `navigationStack.js` — one-screen/back-stack model
- `sourceManager.js` — Apple Music, Spotify, SoundCloud, Naimean source selector
- `queueManager.js` — muted-by-default playback/queue state
- `fixtureManager.js` — fixture registry for lighting-capable room objects
- `displayRouter.js` — Big Screen / Left Monitor quadrant / Center Monitor routing model

## V1 scope

V1 is only wiring the architecture. It does not yet implement real provider OAuth or music playback.

Active source model:

- Apple Music — planned
- Spotify — planned
- SoundCloud — planned
- Naimean — active, server saved files

Naimean sections:

- Songs — enabled
- Playlists, Videos, Reels, Movies, TV Shows, Photos, Pictures, Ringtones — visible roadmap items, greyed/disabled until wired

## Runtime test

Open the site and run:

```js
window.MAESTRO.getState()
window.MAESTRO.selectSource('naimean')
window.MAESTRO.queueMedia({ title: 'Test Song', artist: 'Naimean' })
window.MAESTRO.playMedia({ title: 'Test Song', artist: 'Naimean' }, { id: 'matt', name: 'Matt' })
window.MAESTRO.mute()
window.MAESTRO.unmute(35)
```

## Migration pattern

Old one-off pattern:

```js
hotspotClick -> directly change monitor/card/effect
```

New MAESTRO pattern:

```js
hotspotClick -> sceneBus.emit(trigger) -> MAESTRO decides -> cards/fixtures react
```
