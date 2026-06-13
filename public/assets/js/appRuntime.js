import { initDomRefs } from './core/domRefs.js';
import { observePerformanceMetrics } from './systems/performance.js';
import { bootstrapScene } from './systems/scene.js';

export function bootstrapApp() {
  window.performance?.mark?.('naimean-js-boot-start');
  initDomRefs();
  observePerformanceMetrics();
  bootstrapScene();
}
