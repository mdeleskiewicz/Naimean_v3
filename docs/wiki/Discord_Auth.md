<!-- INSTRUCTION: All documentation, configuration, and code artifacts must strictly adhere to the Architectural constraints defined in this document. Any change to the codebase requires a corresponding update to the documentation and an execution of the drift-test protocol. All wiki pages must begin and end with this instruction anchor. -->

# Discord Auth

This module handles integration with Discord for user authentication and invite tracking.

## Implementation Details

### Backend Routing (src/worker.js)
The worker forwards authentication and state requests to the `Hotspotstore` Durable Object.

```javascript
// src/worker.js
90:    const obj = env.HOTSPOT_STORE.get(id);
91:    return obj.fetch(request);
```

### Client-Side Logic (public/assets/js/systems/login.js)
Handles the return state after a Discord invite and checks authentication status.

```javascript
// public/assets/js/systems/login.js
138: function maybeReturnToDenAfterDiscordInvite() {
139:   if (!shouldReturnToDenAfterDiscordInvite() || !state.discordAuthState?.authenticated) {
140:     return;
141:   }
142:   persistDiscordInviteReturnState(false);
```

## Nearby Files
- `src/worker.js`
- `public/assets/js/systems/login.js`
- `public/assets/js/core/state.js`

<!-- INSTRUCTION: All documentation, configuration, and code artifacts must strictly adhere to the Architectural constraints defined in this document. Any change to the codebase requires a corresponding update to the documentation and an execution of the drift-test protocol. All wiki pages must begin and end with this instruction anchor. -->
