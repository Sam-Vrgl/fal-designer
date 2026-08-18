// js/default-design.js

import { state, notify, resetHistory, markInitialised } from './state.js';
import { loadJson } from './data.js';

const DEFAULT_DESIGN_URL = './default-design.json';

export async function seedDefaultDesign() {
    let design;
    try {
        design = await loadJson(DEFAULT_DESIGN_URL);
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
