// js/input-handler.js

import {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleWheel
} from './pointer-handler.js';

export function initCanvasInput(canvas) {
    const container = canvas.parentElement;
    const activePointers = new Set();

    container.addEventListener('pointerdown', (event) => {
        if (event.target !== canvas) return;

        activePointers.add(event.pointerId);

        if (activePointers.size > 1) {
            handlePointerUp();
            return;
        }

        canvas.setPointerCapture?.(event.pointerId);
        handlePointerDown(event, container);
    });

    container.addEventListener('pointermove', (event) => {
        if (activePointers.size > 1) return;
        handlePointerMove(event, container);
    });

    const endPointer = (event) => {
        activePointers.delete(event.pointerId);
        if (activePointers.size === 0) handlePointerUp();
    };

    container.addEventListener('pointerup', endPointer);
    container.addEventListener('pointercancel', endPointer);

    container.addEventListener('contextmenu', (event) => event.preventDefault());

    container.addEventListener('wheel', (event) => {
        handleWheel(event, container);
    }, { passive: false });
}
