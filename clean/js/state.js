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
  materials: [],
  images: [
    // ... initial images ...
  ],
  selectedInsigne: null,
  isDragging: false,
  dragOffsetX: 0,
  dragOffsetY: 0,
  selectedMaterial: null,
  isDraggingMaterial: false,
  dragMaterialOffsetX: 0,
  dragMaterialOffsetY: 0,
};

const listeners = new Set();
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function notify() { for (const fn of listeners) fn(); }