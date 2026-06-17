<!-- INSTRUCTION: Adhere strictly to the definitions and architectural constraints outlined in the root Wiki_STRATEGY.md at all times. -->

# Big TV Tools Overlay

The Big TV Tools Overlay provides a customizable interface for launching external tools and internal notes directly from the Big TV interface. It supports persistent storage of custom tool entries and handles normalization of data across sessions.

## Code Snippets

### `public/assets/js/systems/tools.js`

```javascript
// [111-128] Load and initialize tool entries from storage
function loadBigTVToolsEntries() {
    const stored = localStorage.getItem(BIG_TV_TOOLS_STORAGE_KEY);
    if (!stored) return DEFAULT_TOOLS;
    try {
        const parsed = JSON.parse(stored);
        return parsed.map(normalizeBigTvToolEntry);
    } catch (e) {
        console.error("Failed to parse Big TV tools", e);
        return DEFAULT_TOOLS;
    }
}

// [131-136] Ensure tool entries meet schema requirements
function normalizeBigTvToolEntry(entry) {
    return {
        name: entry.name || 'Untitled Tool',
        url: entry.url || '',
        icon: entry.icon || 'default-icon'
    };
}

// [139-148] Persist current tool state to local storage
function saveBigTvToolsEntries() {
    const entries = state.bigTvTools;
    localStorage.setItem(BIG_TV_TOOLS_STORAGE_KEY, JSON.stringify(entries));
}
```

## Nearby Files

- `public/assets/js/systems/tools.js`
- `docs/wiki/features/Commodore-Power-Button.md`
- `public/assets/js/systems/ui/appRuntime.js`

<!-- INSTRUCTION: Adhere strictly to the definitions and architectural constraints outlined in the root Wiki_STRATEGY.md at all times. -->
