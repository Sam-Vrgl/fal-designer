// js/input-handler.js

import {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleWheel
} from './pointer-handler.js';

// One binding for mouse, pen and touch. Pointer Events normalise all three, so
// there is no device-class branch here: a hybrid laptop gets drag *and* wheel
// zoom, which the old mouse/touch split made mutually exclusive.
//
// Two-finger gestures are left to initPinchZoom (touch-handler.js); this module
// only tracks how many pointers are down so it can stand aside when one starts.
export function initCanvasInput(canvas) {
    const container = canvas.parentElement;
    const activePointers = new Set();

    container.addEventListener('pointerdown', (event) => {
        if (event.target !== canvas) return;

        activePointers.add(event.pointerId);

        // A second pointer means a pinch is beginning. Abandon whatever drag the
        // first one started and let the pinch handler take over.
        if (activePointers.size > 1) {
            handlePointerUp();
            return;
        }

        // Capture so a drag survives the pointer leaving the canvas. Captured
        // events still bubble to the container, so the listeners below keep
        // firing without needing window-level handlers.
        canvas.setPointerCapture?.(event.pointerId);
        handlePointerDown(event, container);
    });

    container.addEventListener('pointermove', (event) => {
        if (activePointers.size > 1) return;
        // Dropping from two pointers back to one deliberately does not resume
        // the drag: its origin was discarded when the pinch began, so resuming
        // would snap the canvas to a stale offset. The remaining pointer idles
        // until it is lifted and placed again.
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
