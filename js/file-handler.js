import { state, notify, designState } from './state.js';
import { preloadImages } from './image-service.js';
import { designFilename, downloadBlob } from './utils.js';

export function exportState() {
    const json = JSON.stringify(designState(), null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    downloadBlob(blob, designFilename(state.discipline, 'json'));
}

export function importState(file) {
    if (!file) {
        return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const loadedState = JSON.parse(e.target.result);

            state.gridWmm = loadedState.gridWmm;
            state.gridHmm = loadedState.gridHmm;
            state.marginMm = loadedState.marginMm;
            
            const disciplineSelect = document.getElementById('disciplineSelect');
            if (loadedState.discipline) {
                disciplineSelect.value = loadedState.discipline;
                disciplineSelect.dispatchEvent(new Event('change'));
            }

            state.materials = loadedState.materials || [];
            state.moivres = loadedState.moivres || [];
            state.images = loadedState.images || [];
            
            state.selectedInsigne = null;
            state.selectedMaterial = null;
            state.selectedMoivre = null;

            await preloadImages();
            notify();

        } catch (error) {
            console.error("Failed to parse or load the state file:", error);
            alert("Error: Could not load the file. It might be corrupted or in the wrong format.");
        }
    };
    reader.readAsText(file);
}