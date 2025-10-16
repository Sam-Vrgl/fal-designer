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

    togglePaletteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = paletteContainer.classList.contains('open');
        inspectorContainer.classList.remove('open');
        if (!isOpen) {
            paletteContainer.classList.add('open');
            adjustCanvasView();
        } else {
            paletteContainer.classList.remove('open');
        }
    });

    toggleInspectorBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = inspectorContainer.classList.contains('open');
        paletteContainer.classList.remove('open');
        if (!isOpen) {
            inspectorContainer.classList.add('open');
            adjustCanvasView();
        } else {
            inspectorContainer.classList.remove('open');
        }
    });

    mainContent.addEventListener('click', () => {
        paletteContainer.classList.remove('open');
        inspectorContainer.classList.remove('open');
    });
}