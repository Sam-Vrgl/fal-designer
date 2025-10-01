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
  disciplineColors: [],
  disciplineMaterial: null,
  images: [
    // Example entries (url + placement opts). Start empty if you want.
    // { url: './assets/logo.png', x_mm: 20, y_mm: 5, heightPct: 0.4, anchor: 'tl', behind: false }
    { url: './assets/insignes/chiffres/petit/chiffre-1-10-mm.png', x_mm: 1, y_mm: 3, heightPct: 0.7 },
    { url: './assets/insignes/chiffres/petit/chiffre-2-10-mm.png', x_mm: 30, y_mm: 3, heightPct: 0.7 },
    { url: './assets/insignes/chiffres/petit/chiffre-3-10-mm.png', x_mm: 60, y_mm: 3, heightPct: 0.7 },
    { url: './assets/insignes/chiffres/petit/chiffre-4-10-mm.png', x_mm: 90, y_mm: 3, heightPct: 0.7 },
    { url: './assets/insignes/chiffres/petit/chiffre-5-10-mm.png', x_mm: 120, y_mm: 3, heightPct: 0.7 },
    { url: './assets/insignes/chiffres/petit/chiffre-6-10-mm.png', x_mm: 150, y_mm: 3, heightPct: 0.7 },
    { url: './assets/insignes/chiffres/petit/chiffre-7-10-mm.png', x_mm: 180, y_mm: 3, heightPct: 0.7 },
    { url: './assets/insignes/chiffres/petit/chiffre-8-10-mm.png', x_mm: 210, y_mm: 3, heightPct: 0.7 },
    { url: './assets/insignes/chiffres/petit/chiffre-9-10-mm.png', x_mm: 240, y_mm: 3, heightPct: 0.7 },
    { url: './assets/insignes/chiffres/petit/chiffre-0-10-mm.png', x_mm: 270, y_mm: 3, heightPct: 0.7 },
    { url: './assets/insignes/filiere/ecole-ingenieur.png', x_mm: 314.5, y_mm: 1, heightPct: 0.9 },
  ]
};

const listeners = new Set();
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function notify() { for (const fn of listeners) fn(); }