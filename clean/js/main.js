import { state, subscribe, notify } from './state.js';
import { draw } from './renderer.js';
import { bindUI } from './ui.js';
import { loadImage } from './images.js';
import { initDisciplines } from './disciplines.js';
import { initDragAndDrop } from './drag-handler.js';

const canvas = document.getElementById('myCanvas');
const ctx = canvas.getContext('2d', { alpha: true });


// simple in-memory cache: url -> HTMLImageElement
const imgCache = new Map();
export function getCachedImage(url) { return imgCache.get(url) || null; }

// List of available insignes
const insignes = [
  './assets/insignes/chiffres/petit/chiffre-1-10-mm.png',
  './assets/insignes/chiffres/petit/chiffre-2-10-mm.png',
  './assets/insignes/chiffres/petit/chiffre-3-10-mm.png',
  './assets/insignes/chiffres/petit/chiffre-4-10-mm.png',
  './assets/insignes/chiffres/petit/chiffre-5-10-mm.png',
  './assets/insignes/chiffres/petit/chiffre-6-10-mm.png',
  './assets/insignes/chiffres/petit/chiffre-7-10-mm.png',
  './assets/insignes/chiffres/petit/chiffre-8-10-mm.png',
  './assets/insignes/chiffres/petit/chiffre-9-10-mm.png',
  './assets/insignes/filiere/ecole-ingenieur.png',
];

export function getInsignes() {
    return insignes;
}


async function preloadImages(list = state.images) {
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

canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const totalCssW = (state.gridWmm + 2 * state.marginMm) * state.mmToPx;
    const scaleCss = Math.min(
        window.innerWidth / totalCssW,
        window.innerHeight / ((state.gridHmm + 2 * state.marginMm) * state.mmToPx)
    );
    
    const canvasX = x / scaleCss;
    const canvasY = y / scaleCss;

    const originX = state.marginMm * state.mmToPx;
    const originY = state.marginMm * state.mmToPx;

    const gridX = (canvasX - originX) / state.mmToPx;
    const gridY = (canvasY - originY) / state.mmToPx;

    let clickedInsigne = null;
    for (let i = state.images.length - 1; i >= 0; i--) {
        const insigne = state.images[i];
        const img = getCachedImage(insigne.url);
        if (!img) continue;

        const natAspect = img.naturalWidth / img.naturalHeight;
        const h_mm = (insigne.heightPct * state.gridHmm);
        const w_mm = h_mm * natAspect;
        
        const left_mm = insigne.x_mm;
        const top_mm = insigne.y_mm;

        if (gridX >= left_mm && gridX <= left_mm + w_mm && gridY >= top_mm && gridY <= top_mm + h_mm) {
            clickedInsigne = insigne;
            break;
        }
    }
    
    state.selectedInsigne = clickedInsigne;
    notify();
});


bindUI();

initDragAndDrop(canvas);

initDisciplines('disciplineSelect').finally(() => {
    preloadImages().finally(rerender);
});