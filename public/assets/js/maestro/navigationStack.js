/** MAESTRO one-screen navigation stack. */
export const MAESTRO_HOME_SCREEN = 'home';

const stack = [MAESTRO_HOME_SCREEN];
const listeners = new Set();

function notify() {
  const snapshot = getNavigationState();
  listeners.forEach((handler) => handler(snapshot));
}

export function pushScreen(screenId, params = {}) {
  stack.push({ screenId, params });
  notify();
  return getNavigationState();
}

export function replaceScreen(screenId, params = {}) {
  stack.splice(stack.length - 1, 1, { screenId, params });
  notify();
  return getNavigationState();
}

export function back() {
  if (stack.length > 1) stack.pop();
  notify();
  return getNavigationState();
}

export function resetToHome() {
  stack.splice(0, stack.length, MAESTRO_HOME_SCREEN);
  notify();
  return getNavigationState();
}

export function getCurrentScreen() {
  const entry = stack[stack.length - 1];
  return typeof entry === 'string' ? { screenId: entry, params: {} } : entry;
}

export function getNavigationState() {
  return {
    current: getCurrentScreen(),
    canGoBack: stack.length > 1,
    stack: stack.map((entry) => (typeof entry === 'string' ? { screenId: entry, params: {} } : entry)),
  };
}

export function subscribeNavigation(handler) {
  listeners.add(handler);
  handler(getNavigationState());
  return () => listeners.delete(handler);
}

export const navigationStack = {
  pushScreen,
  replaceScreen,
  back,
  resetToHome,
  getCurrentScreen,
  getNavigationState,
  subscribeNavigation,
};
