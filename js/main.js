// js/main.js

import { state, subscribe, shouldSeedDefaultDesign } from './state.js';
import { draw } from './renderer.js';
import { bindUI } from './ui.js';
import { preloadImages } from './image-service.js';
import { InsignePaletteService } from './insignes.js';
import { initDisciplines } from './disciplines.js';
import { seedDefaultDesign } from './default-design.js';
import { initDragAndDrop } from './drag-handler.js';
import { initTouchControls } from './touch-handler.js';
import { initTouchUI } from './touch-ui.js';

const APP_VERSION = "0.4.1";

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

    const insignePalette = new InsignePaletteService('insigne-list', 'insigne-search');
    
    if (shouldSeedDefaultDesign()) {
        await seedDefaultDesign();
    }

    const disciplines = await initDisciplines('disciplineSelect');
    
    bindUI(disciplines, insignePalette);
    
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    if (isTouchDevice) {
        initTouchControls(canvas);
        initTouchUI(canvas.parentElement);
    } else {
        initDragAndDrop(canvas);
    }

    Promise.all([
        insignePalette.init()
    ]).finally(() => {
        preloadImages().finally(rerender);
    });
}

window.addEventListener('DOMContentLoaded', main);