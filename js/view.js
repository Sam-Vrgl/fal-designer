// js/view.js
//
// Camera operations. Kept out of renderer.js, which only draws, and out of
// ui.js, which only binds DOM.

import { state, notify } from './state.js';

// Leave a little air around the design when fitting.
const FIT_PADDING = 0.95;

function contentSizePx() {
    return {
        width: (state.gridWmm + 2 * state.marginMm) * state.mmToPx,
        height: (state.gridHmm + 2 * state.marginMm) * state.mmToPx,
    };
}

export function fitToView(container) {
    if (!container || container.clientWidth === 0) return;

    const { width, height } = contentSizePx();
    if (!(width > 0) || !(height > 0)) return;

    const scale = Math.min(container.clientWidth / width, container.clientHeight / height) * FIT_PADDING;
    if (!Number.isFinite(scale) || scale <= 0) return;

    state.viewScale = scale;
    state.viewOffsetX = (container.clientWidth - width * scale) / 2;
    state.viewOffsetY = (container.clientHeight - height * scale) / 2;
    notify();
}

// Keep whatever was in the middle of the canvas in the middle after the box
// changes size, instead of letting the design drift towards a corner.
//
// The world point at the centre is (centre - offset) / scale, so holding it
// still across a resize means shifting the offset by half the size delta.
export function preserveCentre(container, previous) {
    if (!container || !previous) return;
    if (container.clientWidth === 0 || previous.width === 0) return;

    state.viewOffsetX += (container.clientWidth - previous.width) / 2;
    state.viewOffsetY += (container.clientHeight - previous.height) / 2;
    notify();
}

// Is any part of the design still inside the visible box?
//
// This is the escape hatch for the one case holding the centre cannot cover.
// On mobile the zoom toolbar is display: none, so a design pushed entirely off
// screen leaves the user with nothing to press — which is the "no recovery"
// the issue names. Cheap to ask, and only acted on when the answer is no.
export function isDesignVisible(container) {
    if (!container || container.clientWidth === 0) return true;

    const { width, height } = contentSizePx();
    const left = state.viewOffsetX;
    const top = state.viewOffsetY;
    const right = left + width * state.viewScale;
    const bottom = top + height * state.viewScale;

    return right > 0 && left < container.clientWidth
        && bottom > 0 && top < container.clientHeight;
}

export function measure(container) {
    return { width: container.clientWidth, height: container.clientHeight };
}
