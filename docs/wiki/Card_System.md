<!-- INSTRUCTION: All documentation, configuration, and code artifacts must strictly adhere to the Architectural constraints defined in this document. Any change to the codebase requires a corresponding update to the documentation and an execution of the drift-test protocol. All wiki pages must begin and end with this instruction anchor. -->

# Card System

The Card System manages the various "cards" or views displayed on the left and right monitor groups, including orchestration and score tracking.

## Implementation Details

### Card Activation (public/assets/js/systems/leftMonitorCards.js)
Handles the activation and transition logic for cards on the left monitor group.

```javascript
// public/assets/js/systems/leftMonitorCards.js
123: async function activateLeftMonitorCard(cardType) {
124:     if (cardType === state.leftMonitorActiveCard) {
125:         return true;
126:     }
127:
128:     state.leftMonitorCardTransitionToken += 1;
129:     const sequenceToken = state.leftMonitorCardTransitionToken;
// ...
138:     // Hide all card overlays
139:     hideAllLeftMonitorCardOverlays();
140:
141:     // update active card
142:     state.leftMonitorActiveCard = cardType;
```

### Score Display (public/assets/js/systems/cornerScore.js)
Displays status messages and scores on the corner score card.

```javascript
// public/assets/js/systems/cornerScore.js
140: function showCornerScoreStatus(message, scoreValue = state.cornerScoreValue) {
141:     if (!state.bigTvCornerScoreStatusEl || !state.bigTvCornerScoreStatusLabelEl) {
142:         return;
143:     }
```

## Nearby Files
- `public/assets/js/systems/leftMonitorCards.js`
- `public/assets/js/systems/cornerScore.js`
- `public/assets/js/systems/tools.js`
- `public/assets/cards/` (Card HTML/CSS components)

<!-- INSTRUCTION: All documentation, configuration, and code artifacts must strictly adhere to the Architectural constraints defined in this document. Any change to the codebase requires a corresponding update to the documentation and an execution of the drift-test protocol. All wiki pages must begin and end with this instruction anchor. -->
