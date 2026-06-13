import { PERFORMANCE_METRIC_ORDER, PERFORMANCE_PANEL_QUERY_KEY, PERFORMANCE_PANEL_STYLES } from '../core/constants.js';
import { state } from '../core/state.js';

const perfApi = window.performance;
const searchParams = new URLSearchParams(window.location.search);
const isPerformancePanelEnabled = searchParams.get(PERFORMANCE_PANEL_QUERY_KEY) === '1';

function ensurePerformancePanel() {
  if (!isPerformancePanelEnabled || state.performancePanelEl || !document.body) {
    return;
  }
  state.performancePanelEl = document.createElement('aside');
  state.performancePanelEl.setAttribute('aria-hidden', 'true');
  state.performancePanelEl.style.cssText = PERFORMANCE_PANEL_STYLES;
  document.body.appendChild(state.performancePanelEl);
}

function renderPerformancePanel() {
  if (!isPerformancePanelEnabled) {
    return;
  }
  ensurePerformancePanel();
  if (!state.performancePanelEl) {
    return;
  }
  const metricsByName = window.__NAIMEAN_PERFORMANCE__?.metrics ?? {};
  state.performancePanelEl.innerHTML = `
    <div style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.72;margin-bottom:6px;">Performance</div>
    ${PERFORMANCE_METRIC_ORDER.map((name) => {
      const metric = metricsByName[name];
      const value = metric ? `${metric.value.toFixed(1)} ms` : '…';
      const state = metric?.provisional ? ' <span style="opacity:0.6;">(live)</span>' : '';
      return `<div style="display:flex;justify-content:space-between;gap:12px;"><strong>${name}</strong><span>${value}${state}</span></div>`;
    }).join('')}
  `;
}

function updatePerformanceMetric(name, value, { provisional = false } = {}) {
  if (!Number.isFinite(value)) {
    return;
  }
  const nextMetric = {
    name,
    value: Math.round(value * 10) / 10,
    provisional
  };
  const metrics = {
    ...(window.__NAIMEAN_PERFORMANCE__?.metrics ?? {}),
    [name]: nextMetric
  };
  window.__NAIMEAN_PERFORMANCE__ = {
    enabled: isPerformancePanelEnabled,
    metrics
  };
  if (isPerformancePanelEnabled) {
    console.info(`[perf] ${name}: ${nextMetric.value.toFixed(1)} ms`);
  }
  renderPerformancePanel();
}

function finalizePerformanceObservers() {
  if (state.performanceObserversFinalized) {
    return;
  }
  state.performanceObserversFinalized = true;
  if (state.latestLcpEntry) {
    updatePerformanceMetric('LCP', state.latestLcpEntry.startTime);
  }
  if (state.largestInteractionDuration > 0) {
    updatePerformanceMetric('INP', state.largestInteractionDuration);
  }
}

function observePerformanceMetrics() {
  const navigationEntry = perfApi?.getEntriesByType?.('navigation')?.[0];
  // activationStart is the Web Vitals baseline for prerender/BFCache restores;
  // regular navigations continue to use the navigation start time (0).
  const activationStart = Number.isFinite(navigationEntry?.activationStart)
    ? navigationEntry.activationStart
    : 0;
  const ttfbStart = activationStart > 0
    ? activationStart
    : (Number.isFinite(navigationEntry?.startTime) ? navigationEntry.startTime : 0);
  const ttfb = navigationEntry
    ? navigationEntry.responseStart - ttfbStart
    : NaN;
  updatePerformanceMetric('TTFB', ttfb);

  if (typeof window.PerformanceObserver !== 'function') {
    return;
  }

  try {
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      state.latestLcpEntry = entries[entries.length - 1] || state.latestLcpEntry;
      if (state.latestLcpEntry) {
        updatePerformanceMetric('LCP', state.latestLcpEntry.startTime, { provisional: true });
      }
    });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch (_) {}

  try {
    const inpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry?.interactionId || !Number.isFinite(entry.duration)) {
          continue;
        }
        if (entry.duration > state.largestInteractionDuration) {
          state.largestInteractionDuration = entry.duration;
          updatePerformanceMetric('INP', state.largestInteractionDuration, { provisional: true });
        }
      }
    });
    inpObserver.observe({ type: 'event', buffered: true, durationThreshold: 16 });
  } catch (_) {}

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      finalizePerformanceObservers();
    }
  });
  window.addEventListener('pagehide', finalizePerformanceObservers, { once: true });
}

export { ensurePerformancePanel, renderPerformancePanel, updatePerformanceMetric, finalizePerformanceObservers, observePerformanceMetrics };
