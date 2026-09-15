// js/view.js

import { state, notify } from './state.js';

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

export function preserveCentre(container, previous) {
    if (!container || !previous) return;
    if (container.clientWidth === 0 || previous.width === 0) return;

    state.viewOffsetX += (container.clientWidth - previous.width) / 2;
    state.viewOffsetY += (container.clientHeight - previous.height) / 2;
    notify();
}

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
