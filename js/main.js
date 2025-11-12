import { state, subscribe } from './state.js';
import { draw } from './renderer.js';
import { bindUI } from './ui.js';
import { loadImage } from './images.js';
import  { initInsignePalette } from './insignes.js';
import { initDisciplines } from './disciplines.js';
import { initDragAndDrop } from './drag-handler.js';
import { initTouchControls } from './touch-handler.js';
import { initTouchUI } from './touch-ui.js';

const APP_VERSION = "0.3.3";

async function main() {
    const year = new Date().getFullYear();
    document.getElementById('copyright').textContent = `© ${year} Fal Designer`;
    document.getElementById('version-display-footer').textContent = `v${APP_VERSION}`;

    const aboutBtn = document.getElementById('about-btn');
    const welcomeModalOverlay = document.getElementById('welcome-modal-overlay');
    const aboutModalOverlay = document.getElementById('about-modal-overlay');
    const closeModalBtns = document.querySelectorAll('.close-modal-btn');

    aboutBtn.addEventListener('click', () => {
        aboutModalOverlay.style.display = 'flex';
    });

    closeModalBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            welcomeModalOverlay.style.display = 'none';
            aboutModalOverlay.style.display = 'none';
        });
    });

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.style.display = 'none';
            }
        });
    });

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
    
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    if (isTouchDevice) {
        initTouchControls(canvas);
        initTouchUI(canvas.parentElement);
    } else {
        initDragAndDrop(canvas);
    }

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