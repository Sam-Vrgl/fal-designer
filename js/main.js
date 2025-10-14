import { state, subscribe } from './state.js';
import { draw } from './renderer.js';
import { bindUI } from './ui.js';
import { loadImage } from './images.js';
import  { initInsignePalette } from './insignes.js';
import { initDisciplines } from './disciplines.js';
import { initDragAndDrop } from './drag-handler.js';


async function main() {
    const canvas = document.getElementById('myCanvas');
    if (!canvas) {
        console.error("Canvas element not found!");
        return;
    }
    const ctx = canvas.getContext('2d', { alpha: true });

    const rerender = () => draw(canvas, ctx, state);
    subscribe(rerender);
    window.addEventListener('resize', rerender);

    const disciplines = await initDisciplines('disciplineSelect');
    bindUI(disciplines);
    initDragAndDrop(canvas);

    Promise.all([
        initInsignePalette('insigne-list', 'insigne-search')
    ]).finally(() => {
        preloadImages().finally(rerender);
    });
}

const imgCache = new Map();
export function getCachedImage(url) { return imgCache.get(url) || null; }

export async function preloadImages(list = state.images) {
  await Promise.allSettled(list.map(async (it) => {
    if (it.url && !imgCache.has(it.url)) {
      try {
        const img = await loadImage(it.url);
        imgCache.set(it.url, img);
      } catch (e) {
        console.error(`Failed to preload image: ${it.url}`, e);
      }
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
  } catch (error) {
    console.error(`Could not load image at ${placement.url}. Removing it from the design.`, error);
        state.images = state.images.filter(img => img !== placement);
  }
}

window.addEventListener('DOMContentLoaded', main);