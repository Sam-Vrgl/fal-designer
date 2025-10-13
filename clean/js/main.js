import { state, subscribe, notify } from './state.js';
import { draw } from './renderer.js';
import { bindUI } from './ui.js';
import { loadImage } from './images.js';
import { initInsignePalette } from './insignes.js';
import { initDisciplines } from './disciplines.js';
import { initDragAndDrop } from './drag-handler.js';

const canvas = document.getElementById('myCanvas');
const ctx = canvas.getContext('2d', { alpha: true });

const imgCache = new Map();
export function getCachedImage(url) { return imgCache.get(url) || null; }

export async function preloadImages(list = state.images) {
  await Promise.allSettled(list.map(async (it) => {
    if (!imgCache.has(it.url)) {
      const img = await loadImage(it.url);
      imgCache.set(it.url, img);
    }
  }));
}

export async function addImage(placement) {
  state.images.push(placement);
  try {
    if (!imgCache.has(placement.url)) {
      const img = await loadImage(placement.url);
      imgCache.set(placement.url, img);
    }
  } finally {
    rerender();
  }
}

const rerender = () => draw(canvas, ctx, state);
subscribe(rerender);
window.addEventListener('resize', rerender);

bindUI();
initDragAndDrop(canvas);

Promise.all([
    initDisciplines('disciplineSelect'), // This can be repurposed or removed if discipline selection changes
    initInsignePalette('insigne-list', 'insigne-search')
]).finally(() => {
    preloadImages().finally(rerender);
});