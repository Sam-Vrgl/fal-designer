// js/main.js

import { state, subscribe, shouldSeedDefaultDesign, shouldShowWelcome, markWelcomeSeen } from './state.js';
import { prefetchJson } from './data.js';
import { draw } from './renderer.js';
import { bindUI } from './ui.js';
import { preloadImages } from './image-service.js';
import { InsignePaletteService } from './insignes.js';
import { initDisciplines } from './disciplines.js';
import { seedDefaultDesign } from './default-design.js';
import { initCanvasInput } from './input-handler.js';
import { initPinchZoom } from './touch-handler.js';
import { initTouchUI } from './touch-ui.js';
import { showModal, hideModal } from './messages.js';
import { fitToView, preserveCentre, measure, isDesignVisible } from './view.js';

const APP_VERSION = "1.4.1";

async function main() {
    const year = new Date().getFullYear();
    document.getElementById('copyright').textContent = `© ${year} Fal Designer`;
    document.getElementById('version-display-footer').textContent = `v${APP_VERSION}`;

    const aboutBtn = document.getElementById('about-btn');
    const aboutModal = document.getElementById('about-modal');

    aboutBtn.addEventListener('click', () => showModal(aboutModal));

    document.querySelectorAll('.close-modal-btn').forEach(btn => {
        btn.addEventListener('click', () => hideModal(btn.closest('dialog')));
    });

    document.querySelectorAll('dialog').forEach(dialog => {
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) hideModal(dialog);
        });
    });

    const welcomeModal = document.getElementById('welcome-modal');
    if (shouldShowWelcome()) {
        welcomeModal.addEventListener('close', markWelcomeSeen, { once: true });
        showModal(welcomeModal);
    }

    prefetchJson('./disciplines.json', './insignes-list.json');
    if (shouldSeedDefaultDesign()) prefetchJson('./default-design.json');

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
    
    initCanvasInput(canvas);
    initPinchZoom(canvas);
    initTouchUI(canvas.parentElement);

    observeCanvasBox(canvas.parentElement);

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

function observeCanvasBox(container) {
    if (!container || typeof ResizeObserver === 'undefined') return;

    let previous = null;
    const observer = new ResizeObserver(() => {
        if (container.clientWidth === 0) return;

        if (previous === null) {
            fitToView(container);
        } else if (container.clientWidth !== previous.width || container.clientHeight !== previous.height) {
            preserveCentre(container, previous);
            if (!isDesignVisible(container)) fitToView(container);
        }

        previous = measure(container);
    });

    observer.observe(container);
}

window.addEventListener('DOMContentLoaded', () => {
    main().catch((error) => console.error("Fal Designer failed to start:", error));
});