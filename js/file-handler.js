import { state, notify, designState, applyImportedDesign } from './state.js';
import { preloadImages } from './image-service.js';
import { designFilename, downloadBlob } from './utils.js';
import { showError } from './messages.js';

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

            const disciplineSelect = document.getElementById('disciplineSelect');
            if (loadedState.discipline) {
                disciplineSelect.value = loadedState.discipline;
                disciplineSelect.dispatchEvent(new Event('change'));
            }

            applyImportedDesign(loadedState);

            state.selectedInsigne = null;
            state.selectedMaterial = null;
            state.selectedMoivre = null;

            await preloadImages();
            notify();

        } catch (error) {
            // English detail for whoever is debugging, French for whoever is
            // holding the file — they can act on this by picking another one.
            console.error("Failed to parse or load the state file:", error);
            showError(
                "Ce fichier n'a pas pu être ouvert. Il est peut-être endommagé, " +
                "ou il ne s'agit pas d'un circulaire exporté depuis Fal Designer."
            );
        }
    };
    reader.readAsText(file);
}