import { initDomRefs } from './core/domRefs.js';
import './core/media.js';
import './systems/performance.js';
import './systems/hotspots.js';
import './systems/monitors.js';
import './systems/dvd.js';
import './systems/cornerScore.js';
import './systems/aquarium.js';
import './systems/login.js';
import './systems/tools.js';
import './systems/flipClock.js';
import './ui/overlays.js';
import './systems/leftMonitorCards.js';
import { observePerformanceMetrics } from './systems/performance.js';
import { bootstrapScene } from './systems/scene.js';

export function bootstrapApp() {
  try {
    window.performance?.mark?.('naimean-js-boot-start');
    initDomRefs();
    observePerformanceMetrics();
    bootstrapScene();
  } catch (error) {
    console.error('[Naimean] App bootstrap failed:', error);
    // Ensure scene is visible even if bootstrap fails
    document.body.classList.remove('scene-loading');
    document.body.classList.add('scene-ready');
    throw error;
  }
}
