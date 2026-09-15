import { state, notify, designState, applyImportedDesign, resetHistory } from './state.js';
import { preloadImages } from './image-service.js';
import { designFilename, downloadBlob } from './utils.js';
import { showError } from './messages.js';
import { isKnownDiscipline, applyDiscipline } from './disciplines.js';

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

            const warnings = applyImportedDesign(loadedState);

            if (loadedState.discipline) {
                if (isKnownDiscipline(loadedState.discipline)) {
                    applyDiscipline(loadedState.discipline);
                } else {
                    warnings.push(`Discipline inconnue « ${loadedState.discipline} » ignorée.`);
                }
            }

            state.selectedInsigne = null;
            state.selectedMaterial = null;
            state.selectedMoivre = null;

            resetHistory();

            await preloadImages();
            notify();

            if (warnings.length > 0) {
                showError(
                    "Le fichier a été importé, mais certains éléments ont été ignorés :\n" +
                    warnings.join('\n')
                );
            }

        } catch (error) {
            console.error("Failed to parse or load the state file:", error);
            showError(
                "Ce fichier n'a pas pu être ouvert. Il est peut-être endommagé, " +
                "ou il ne s'agit pas d'un circulaire exporté depuis Fal Designer."
            );
        }
    };
    reader.readAsText(file);
}