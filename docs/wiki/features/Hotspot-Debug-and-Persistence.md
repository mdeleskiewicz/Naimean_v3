<!-- INSTRUCTION: Adhere strictly to the definitions and architectural constraints outlined in the root Wiki_STRATEGY.md at all times. -->

# Hotspot Debug + Persistence

The Hotspot Debug + Persistence module enables real-time editing and saving of hotspot coordinates and dimensions. Access to the saving functionality is protected by a password-based debug mode, and data is persisted to both legacy and modern server endpoints with built-in retry logic.

## Code Snippets

### `public/assets/js/systems/hotspots.js`

```javascript
// [94-95] Debug password constants for save access
const DEBUG_SAVE_PASSWORD_KEY = 'naimean-debug';
const DEBUG_SAVE_PASSWORD_CIPHER = [90, 87, 91, 84, 85];

// [101-118] Verify user permission before allowing save
function ensureDebugSaveAccess() {
    const password = prompt("Enter save password:");
    // ... logic to verify against cipher
}

// [86-113] Persist hotspot configuration to legacy server with retry mechanism
async function postHotspotsToLegacyServer(hotspots) {
    // ... logic for fetch with RETRY_ATTEMPTS
}

// [116-126] Persist hotspot configuration to modern API endpoint
async function postHotspotsToServer(hotspots) {
    // ... logic for fetch to HOTSPOT_API_PATH
}

// [220-236] Extract current runtime hotspot state from DOM for persistence
function getSavedHotspotsFromDom() {
    return Array.from(document.querySelectorAll('.hotspot')).map(el => ({
        id: el.id,
        top: el.style.top,
        left: el.style.left,
        // ... width, height
    }));
}
```

## Nearby Files

- `public/assets/js/systems/hotspots.js`
- `public/assets/js/core/constants.js`
- `docs/wiki/features/Big-TV-Tools.md`

<!-- INSTRUCTION: Adhere strictly to the definitions and architectural constraints outlined in the root Wiki_STRATEGY.md at all times. -->
