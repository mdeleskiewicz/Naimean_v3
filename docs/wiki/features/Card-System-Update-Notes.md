# Card System Update Notes

## Requested Backlog Issues

Issue creation was attempted through the available CLI, but this workspace token is currently invalid for issue creation.  
Use the issue drafts below in GitHub Issues for `naimean/Naimean_v3`.

1. **Session save-state for cards/monitors**
   - Persist: `leftMonitorActiveCard`, `leftMonitorSelectedState`, `rightMonitorDisplayMode`, `isCommodorePoweringOn`
   - Restore on `pageshow` and normal reload
   - Include storage schema versioning and stale-state invalidation

2. **Card Orchestrator architecture**
   - Add central card orchestrator that owns per-card zone recipes
   - Route card trigger callbacks through orchestrator entry points
   - Keep behavior backward-compatible while unifying trigger flow

3. **Middle monitor card content system**
   - Add middle monitor content layer/card module
   - Implement shrimp card middle-monitor loop for uploaded Kid Dancing GIF
   - Add monitor-specific interruption/static support for middle monitor

4. **Numbered static interruption variants**
   - Implement random static segment profiles:
     - Full length
     - Half length from midpoint
     - Quarter length from 25/50/75%
     - Eighth length from 25/50/75%
   - Apply interruption rules consistently before target card activation

5. **Right monitor per-card content**
   - GitHub card: show uploaded `download.png` cloudflare image on right monitor
   - Shrimp card: right monitor auth-aware Aquarium GUI entry behavior
   - Preserve existing monitor interruption sequencing

## Progress in This Change

- Started workstream **#2 Card Orchestrator architecture**.
- Added `public/assets/js/cards/cardOrchestrator.js`.
- Centralized card-trigger callbacks into orchestrator-managed entry points:
  - `triggerCornerScoreCard`
  - `triggerDiscordCard`
  - `triggerGithubCard`
  - `triggerLoggedInCard`
  - `triggerShrimpCard`
  - `triggerPowerOnCard`
  - `triggerPowerOffCard`
- Wired app bootstrap to load orchestrator after existing card/overlay systems.
- Wired power-button hotspot to orchestrator-first callback path.
