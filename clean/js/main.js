import { state, subscribe } from './state.js';
import { draw } from './renderer.js';
import { bindUI } from './ui.js';
import { loadImage } from './images.js';

const canvas = document.getElementById('myCanvas');
const ctx = canvas.getContext('2d', { alpha: true });


// simple in-memory cache: url -> HTMLImageElement
const imgCache = new Map();
export function getCachedImage(url) { return imgCache.get(url) || null; }

async function preloadImages(list = state.images) {
  await Promise.allSettled(list.map(async (it) => {
    if (!imgCache.has(it.url)) {
      const img = await loadImage(it.url);
      imgCache.set(it.url, img);
    }
  }));
}

// expose a small helper to add images at runtime
export async function addImage(placement) {
  state.images.push(placement);     // { url, x_mm, y_mm, heightPct?, width_mm?, height_mm?, aspect?, anchor?, behind? }
  try {
    if (!imgCache.has(placement.url)) {
      const img = await loadImage(placement.url);
      imgCache.set(placement.url, img);
    }
  } finally {
    rerender(); // draw even if a load failed (other things still show)
  }
}

// Redraw on state changes & resize
const rerender = () => draw(canvas, ctx, state);
subscribe(rerender);
window.addEventListener('resize', rerender);

// Bind UI <-> state and do initial draw
bindUI();
preloadImages().finally(rerender);


