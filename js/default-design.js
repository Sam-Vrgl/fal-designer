// js/default-design.js

import { state, notify, resetHistory, markInitialised } from './state.js';

const DEFAULT_DESIGN_URL = './default-design.json';

export async function seedDefaultDesign() {
    let design;
    try {
        const response = await fetch(DEFAULT_DESIGN_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        design = await response.json();
    } catch (e) {
        console.error("Could not load the default design:", e);
        return;
    }

    state.gridWmm = design.gridWmm ?? state.gridWmm;
    state.gridHmm = design.gridHmm ?? state.gridHmm;
    state.marginMm = design.marginMm ?? state.marginMm;
    state.discipline = design.discipline ?? state.discipline;
    state.materials = design.materials || [];
    state.moivres = design.moivres || [];
    state.images = design.images || [];

    resetHistory();
    markInitialised();
    notify();
}
