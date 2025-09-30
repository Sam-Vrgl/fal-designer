// Simple shared state + pub/sub
export const state = {
  mmToPx: 3.7795275591, // px per mm (96DPI)
  gridWmm: 700,
  gridHmm: 38,
  marginMm: 10,
  minorStepMm: 1,
  majorStepMm: 10,
  helper: {
    showV: true,
    showH: true,
    color: '#666666',
    thickness: 3
  },
  images: [
    // Example entries (url + placement opts). Start empty if you want.
    // { url: './assets/logo.png', x_mm: 20, y_mm: 5, heightPct: 0.4, anchor: 'tl', behind: false }
    { url: '../../assets/insignes/chiffres/petit/chiffre-1-10-mm.png', x_mm: 1, y_mm: 1, heightPct: 1, anchor: 'tl', behind: false }
  ]
};

const listeners = new Set();
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function notify() { for (const fn of listeners) fn(); }
