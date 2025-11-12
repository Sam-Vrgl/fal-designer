// js/drag-handler.js

import { 
    handlePointerDown, 
    handlePointerMove, 
    handlePointerUp, 
    handleWheel 
} from './pointer-handler.js';

export function initDragAndDrop(canvas) {
    const container = canvas.parentElement;

    container.addEventListener('mousedown', (event) => {
        if (event.target !== canvas) return;
        handlePointerDown(event, container);
    });

    window.addEventListener('mousemove', (event) => {
        handlePointerMove(event, container);
    });

    window.addEventListener('mouseup', () => {
        handlePointerUp();
    });
    
    container.addEventListener('contextmenu', e => e.preventDefault());
    
    container.addEventListener('wheel', (event) => {
        handleWheel(event, container);
    }, { passive: false });
}