// The key for storing the state in localStorage
const LOCAL_STORAGE_KEY = 'falDesignerState';

// The default state of the application
const defaultState = {
  mmToPx: 3.7795275591,
  gridWmm: 700,
  gridHmm: 38,
  marginMm: 10,
  minorStepMm: 1,
  majorStepMm: 10,
  helper: { showV: true, showH: true, color: '#666666', thickness: 3 },
  disciplineColors: [],
  disciplineMaterial: null,
  materials: [],
  moivres: [],
  images: [],
  viewScale: 1.0,
  viewOffsetX: 0,
  viewOffsetY: 0,
  currentMode: 'select',
  insigneToPlace: null,
  isSnapping: false,
  selectedInsigne: null,
  isDragging: false,
  dragOffsetX: 0,
  dragOffsetY: 0,
  selectedMaterial: null,
  isDraggingMaterial: false,
  dragMaterialOffsetX: 0,
  dragMaterialOffsetY: 0,
  selectedMoivre: null,
  isDraggingMoivre: false,
  dragMoivreOffsetX: 0,
};

// Main application state
export let state = { ...defaultState };

/**
 * Saves the current state to localStorage.
 * Only serializable properties are saved.
 */
function saveState() {
    try {
        const stateToSave = {
            gridWmm: state.gridWmm,
            gridHmm: state.gridHmm,
            marginMm: state.marginMm,
            helper: state.helper,
            disciplineColors: state.disciplineColors,
            disciplineMaterial: state.disciplineMaterial,
            materials: state.materials,
            moivres: state.moivres,
            images: state.images,
            viewScale: state.viewScale,
            viewOffsetX: state.viewOffsetX,
            viewOffsetY: state.viewOffsetY,
        };
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (error) {
        console.error("Could not save state to localStorage:", error);
    }
}

/**
 * Loads the state from localStorage and merges it with the default state.
 * If loading fails, it resets to the default state.
 */
function loadState() {
    try {
        const savedStateJSON = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedStateJSON) {
            const savedState = JSON.parse(savedStateJSON);
            // Merge the loaded state into the default state to ensure
            // all properties are present, even after updates.
            state = { ...defaultState, ...savedState };
        }
    } catch (error) {
        console.error("Failed to load or parse state from localStorage. Resetting to default.", error);
        // If parsing fails, reset to a clean state
        state = { ...defaultState };
        localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
}

/**
 * Clears the saved state from localStorage and reloads the page.
 */
export function resetState() {
    if (confirm("Are you sure you want to reset your design? This will clear all saved data.")) {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        window.location.reload();
    }
}

// Pub/Sub system
const listeners = new Set();
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function notify() {
    for (const fn of listeners) fn();
    saveState(); // Save state on every notification
}

// --- Initial Load ---
loadState();