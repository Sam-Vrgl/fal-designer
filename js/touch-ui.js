import { state, notify } from './state.js';

export function initTouchUI(canvasContainer) {
    const paletteContainer = document.getElementById('palette-container');
    const inspectorContainer = document.getElementById('inspector-container');
    const mainContent = document.getElementById('main-content-wrapper');

    const togglePaletteBtn = document.getElementById('toggle-palette-btn');
    const toggleInspectorBtn = document.getElementById('toggle-inspector-btn');

    if (!togglePaletteBtn || !toggleInspectorBtn) return;

    const adjustCanvasView = () => {
        const visibleHeightVh = 40;
        const visibleHeightPx = canvasContainer.clientHeight * (visibleHeightVh / 100);

        const contentHeightMm = state.gridHmm + (2 * state.marginMm);
        const contentHeightPx = contentHeightMm * state.mmToPx * state.viewScale;

        state.viewOffsetY = (visibleHeightPx - contentHeightPx) / 2;
        
        notify();
    };

    // Opening either drawer closes the other, and every route in or out has to
    // leave aria-expanded saying what the button actually did — a toggle that
    // reports the wrong state is worse to a screen reader than a silent one.
    const drawers = [
        { button: togglePaletteBtn, panel: paletteContainer },
        { button: toggleInspectorBtn, panel: inspectorContainer },
    ];

    const setOpen = (drawer, open) => {
        drawer.panel.classList.toggle('open', open);
        drawer.button.setAttribute('aria-expanded', String(open));
    };

    const closeAll = () => drawers.forEach((drawer) => setOpen(drawer, false));

    for (const drawer of drawers) {
        drawer.button.addEventListener('click', (e) => {
            e.stopPropagation();
            const open = !drawer.panel.classList.contains('open');
            closeAll();
            setOpen(drawer, open);
            if (open) adjustCanvasView();
        });
    }

    mainContent.addEventListener('click', closeAll);
}