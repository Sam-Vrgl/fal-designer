// js/touch-handler.js

import { state, notify } from './state.js';
import { 
    handlePointerDown, 
    handlePointerMove, 
    handlePointerUp 
} from './pointer-handler.js';

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

export function initTouchControls(canvas) {
    const container = canvas.parentElement;
    let lastTouchDistance = null;

    container.addEventListener('touchstart', (event) => {
        if (event.target === canvas) {
            event.preventDefault();
        }

        if (event.touches.length === 1) {
            handlePointerDown(event, container);
        } else if (event.touches.length >= 2) {
            // Stop any 1-finger drag/pan
            handlePointerUp(); 
            lastTouchDistance = getTouchDistance(event.touches);
        }
    }, { passive: false });

    container.addEventListener('touchmove', (event) => {
        event.preventDefault();

        if (event.touches.length === 1) {
            handlePointerMove(event, container);
        } else if (event.touches.length >= 2 && lastTouchDistance) {
            // Handle 2-finger pinch-to-zoom
            const newTouchDistance = getTouchDistance(event.touches);
            const zoomFactor = newTouchDistance / lastTouchDistance;
            lastTouchDistance = newTouchDistance;
            
            const midpoint = getMidpoint(event.touches);
            state.viewOffsetX -= (midpoint.x - state.viewOffsetX) * (zoomFactor - 1);
            state.viewOffsetY -= (midpoint.y - state.viewOffsetY) * (zoomFactor - 1);
            state.viewScale *= zoomFactor;
            notify();
        }
    }, { passive: false });

    container.addEventListener('touchend', (event) => {
        if (event.touches.length === 0) {
            // Last finger was lifted
            handlePointerUp();
        }
        lastTouchDistance = null;
    });
}