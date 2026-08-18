// js/main.js

import { state, subscribe, shouldSeedDefaultDesign } from './state.js';
import { draw } from './renderer.js';
import { bindUI } from './ui.js';
import { preloadImages } from './image-service.js';
import { InsignePaletteService } from './insignes.js';
import { initDisciplines } from './disciplines.js';
import { seedDefaultDesign } from './default-design.js';
import { initCanvasInput } from './input-handler.js';
import { initPinchZoom } from './touch-handler.js';
import { initTouchUI } from './touch-ui.js';

const APP_VERSION = "1.4.1";

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
    
    // Bound unconditionally. Device class is not a reliable proxy for either
    // capability or layout: a touch laptop needs wheel zoom, and a narrow
    // non-touch window gets the drawer layout from a width media query.
    initCanvasInput(canvas);
    initPinchZoom(canvas);
    initTouchUI(canvas.parentElement);

    // Both steps are best-effort: a failed palette or a missing image should
    // still leave a usable canvas, so each is caught rather than allowed to
    // abandon startup.
    try {
        await insignePalette.init();
    } catch (error) {
        console.error("Could not build the insigne palette:", error);
    }

    try {
        await preloadImages();
    } catch (error) {
        console.error("Some images could not be preloaded:", error);
    }

    rerender();
}

window.addEventListener('DOMContentLoaded', () => {
    main().catch((error) => console.error("Fal Designer failed to start:", error));
});