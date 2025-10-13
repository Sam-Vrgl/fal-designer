import { state, notify } from './state.js';
import { preloadImages } from './main.js';

/**
 * Normalizes a string by removing accents and non-alphanumeric characters.
 * @param {string} str The string to sanitize.
 * @returns {string} The sanitized string.
 */
function sanitizeString(str) {
    if (!str) return '';
    // Normalize to separate base letters from accents
    return str.normalize('NFD')
              // Remove accent characters
              .replace(/[\u0300-\u036f]/g, '')
              // Remove spaces, apostrophes, and other non-alphanumeric characters
              .replace(/['\s\W]/g, '')
              .toLowerCase();
}

/**
 * Generates a timestamp in YYYY-MM-DD_HH-MM format.
 * @returns {string} The formatted timestamp.
 */
function getTimestamp() {
    const d = new Date();
    const pad = (n) => n.toString().padStart(2, '0');
    
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());

    return `${year}-${month}-${day}_${hours}-${minutes}`;
}

export function exportState() {
    const disciplineSelect = document.getElementById('disciplineSelect');
    const discipline = sanitizeString(disciplineSelect.value) || 'design';
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