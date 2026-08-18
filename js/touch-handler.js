// js/touch-handler.js

import { state, notify } from './state.js';

function getTouchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

function getMidpoint(touches) {
    return {
        x: (touches[0].clientX + touches[1].clientX) / 2,
        y: (touches[0].clientY + touches[1].clientY) / 2,
    };
}

// Two-finger pinch only. Single-pointer input of every kind — mouse, pen and
// one finger — goes through initCanvasInput (input-handler.js), so nothing here
// runs for a one-finger drag and the two never double-handle the same gesture.
export function initPinchZoom(canvas) {
    const container = canvas.parentElement;
    let lastTouchDistance = null;

    container.addEventListener('touchstart', (event) => {
        if (event.touches.length < 2) return;
        event.preventDefault();
        lastTouchDistance = getTouchDistance(event.touches);
    }, { passive: false });

    container.addEventListener('touchmove', (event) => {
        if (event.touches.length < 2 || lastTouchDistance === null) return;
        event.preventDefault();

        const newTouchDistance = getTouchDistance(event.touches);
        const zoomFactor = newTouchDistance / lastTouchDistance;
        lastTouchDistance = newTouchDistance;

        const midpoint = getMidpoint(event.touches);
        state.viewOffsetX -= (midpoint.x - state.viewOffsetX) * (zoomFactor - 1);
        state.viewOffsetY -= (midpoint.y - state.viewOffsetY) * (zoomFactor - 1);
        state.viewScale *= zoomFactor;
        notify();
    }, { passive: false });

    container.addEventListener('touchend', (event) => {
        if (event.touches.length < 2) lastTouchDistance = null;
    });
}
