import { state, notify } from './state.js';
import { preloadImages } from './main.js';

function getTimestamp() {
    const d = new Date();
    const pad = (n) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

export function exportState() {
    const disciplineSelect = document.getElementById('disciplineSelect');
    const discipline = disciplineSelect.value.replace(/[^a-z0-9]/gi, '-').toLowerCase() || 'design';
    const timestamp = getTimestamp();
    const filename = `fal-design-${discipline}-${timestamp}.json`;

    const stateToSave = {
        gridWmm: state.gridWmm,
        gridHmm: state.gridHmm,
        marginMm: state.marginMm,
        discipline: disciplineSelect.value,
        materials: state.materials,
        images: state.images,
    };

    const jsonString = JSON.stringify(stateToSave, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
            state.images = loadedState.images || [];
            
            state.selectedInsigne = null;
            state.selectedMaterial = null;

            await preloadImages(state.images);
            notify();

        } catch (error) {
            console.error("Failed to parse or load the state file:", error);
            alert("Error: Could not load the file. It might be corrupted or in the wrong format.");
        }
    };
    reader.readAsText(file);
}