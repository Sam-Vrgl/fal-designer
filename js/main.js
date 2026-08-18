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
    const aboutModalOverlay = document.getElementById('about-modal-overlay');

    aboutBtn.addEventListener('click', () => showModal(aboutModalOverlay));

    // Close the modal the button is actually inside, rather than naming each
    // one here. There are three now, and the error modal is opened from modules
    // that have no business being wired up in startup.
    document.querySelectorAll('.close-modal-btn').forEach(btn => {
        btn.addEventListener('click', () => hideModal(btn.closest('.modal-overlay')));
    });

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) hideModal(overlay);
        });
    });

    // Shown from here rather than being visible by default, so it cannot appear
    // for a returning visitor while the script is still loading.
    const welcomeModalOverlay = document.getElementById('welcome-modal-overlay');
    if (shouldShowWelcome()) {
        showModal(welcomeModalOverlay);
        // Dismissing it is the acknowledgement, by either route out.
        welcomeModalOverlay.querySelector('.close-modal-btn')?.addEventListener('click', markWelcomeSeen);
        welcomeModalOverlay.addEventListener('click', (e) => {
            if (e.target === welcomeModalOverlay) markWelcomeSeen();
        });
    }

    // Neither depends on the other, so start both now rather than letting each
    // wait for the one before it. Whoever needs one awaits the request already
    // in flight. The seed design is only fetched on a first visit.
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

    // A window resize does not change the container box when a drawer opens, and
    // a container box change does not happen when the window moves to a display
    // with a different pixel ratio. The observer covers the first, this covers
    // the second; both are cheap now that sizing and rendering are both guarded.
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

    observeCanvasBox(canvas.parentElement);

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

// Fit once, when the first real layout arrives, then hold the user's view
// steady through later size changes rather than snapping back to fit.
//
// Holding the centre is preferred over re-fitting because re-fitting throws
// away whatever the user had zoomed into, and because it would fight
// touch-ui.js, which already recentres vertically when a drawer opens. But it
// is only a preference: if a size change leaves the design entirely off screen
// there is nothing to hold on to, and on mobile no toolbar to recover with, so
// fitting is the right answer there.
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