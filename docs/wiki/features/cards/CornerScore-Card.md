# CornerScore Card

## User Experience

The CornerScore card is the most data-rich left-monitor card.

- It appears when the DVD logo lands in a valid big-TV corner while scoring is enabled.
- The left monitor switches to a four-quadrant dashboard:
  - current run score/time
  - personal best score/time
  - server high score + initials
  - aggregate server score/bounce totals
- The right monitor switches into CornerScore mode at the same time.
- The whiteboard score control can also surface the card while toggling the big-TV stats panel.

## Trigger Paths

### `/home/runner/work/Naimean_v3/Naimean_v3/public/assets/js/systems/dvd.js`

- A goal-corner hit increments the score, enables CornerScore mode, and calls `state._cb.triggerCornerScoreCard?.()`.
- The same path wakes or refreshes the right monitor and triggers the middle-monitor stats transition.

### `/home/runner/work/Naimean_v3/Naimean_v3/public/assets/js/systems/hotspots.js`

- Clicking the whiteboard CornerScore control calls `triggerCornerScoreCard` and then shows the big-TV high-score stats overlay.

## Code by File

### `/home/runner/work/Naimean_v3/Naimean_v3/public/assets/js/ui/overlays.js`

- Builds the four-quadrant card DOM in the left monitor window.
- The card sections are labeled `Current Run`, `Personal Best`, `High Score`, and `Server Stats`.
- Also creates the legacy personal-best overlay and the related big-TV stats widgets that still participate in CornerScore UX.

### `/home/runner/work/Naimean_v3/Naimean_v3/public/assets/js/systems/leftMonitorCards.js`

- `showCornerScoreCard()` activates the card surface.
- `updateCornerScoreCardData()` hydrates all four quadrants from runtime state:
  - `cornerScoreValue`
  - `cornerScoreElapsed`
  - `cornerScorePersonalBest`
  - `cornerScorePersonalBestTime`
  - `cornerScoreHighScore`
  - `cornerScoreHighScoreInitials`
  - `cornerScoreServerTotalScores`
  - `cornerScoreServerTotalBounces`
- `triggerCornerScoreCard()` only shows the card when `state.isDvdCornerCountEnabled` is already true.

### `/home/runner/work/Naimean_v3/Naimean_v3/public/assets/js/systems/cornerScore.js`

- `activateRightMonitorCornerScoreMode()` marks the right monitor as active CornerScore output and resyncs the DVD/overlay state.
- The module also owns initials prompts, run stats, personal-best persistence, and server updates that feed the card.

### `/home/runner/work/Naimean_v3/Naimean_v3/test/corner-score-flow.test.js`

- Covers the score-trigger flow, high-score handling, and the rule that passive score hydration must not pre-activate the right monitor.

## Related Pages

- [Commodore Power Button](../Commodore-Power-Button.md)
- [Card Orchestrator](Card-Orchestrator.md)
