import { state, subscribe } from './state.js';
import { draw } from './renderer.js';
import { bindUI } from './ui.js';
import { loadImage } from './images.js';
import  { initInsignePalette } from './insignes.js';
import { initDisciplines } from './disciplines.js';
import { initDragAndDrop } from './drag-handler.js';

/**
 * The main function to initialize the application.
 * This will only be called after the DOM is fully loaded.
 */
function main() {
    const canvas = document.getElementById('myCanvas');
    if (!canvas) {
        console.error("Canvas element not found!");
        return;
    }
    const ctx = canvas.getContext('2d', { alpha: true });

    const rerender = () => draw(canvas, ctx, state);
    subscribe(rerender);
    window.addEventListener('resize', rerender);

    bindUI();
    initDragAndDrop(canvas);

    Promise.all([
        initDisciplines('disciplineSelect'),
        initInsignePalette('insigne-list', 'insigne-search')
    ]).finally(() => {
        // Preload images from state (e.g., loaded from localStorage)
        preloadImages().finally(rerender);
    });
}

// --- Image Management ---
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
  } finally {
    // A redraw will be triggered by the state update (notify)
  }
}

// --- Application Entry Point ---
// Wait for the HTML to be fully parsed before running the main script.
window.addEventListener('DOMContentLoaded', main);