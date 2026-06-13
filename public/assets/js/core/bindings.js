import { state } from './state.js';
import { dom } from './domRefs.js';

let bound = false;

function bindObjectGlobals(object) {
  Object.keys(object).forEach((key) => {
    Object.defineProperty(globalThis, key, {
      configurable: true,
      enumerable: false,
      get() {
        return object[key];
      },
      set(value) {
        object[key] = value;
      }
    });
  });
}

export function bindRuntimeGlobals() {
  if (bound) return;
  bound = true;
  bindObjectGlobals(state);
  bindObjectGlobals(dom);
}
