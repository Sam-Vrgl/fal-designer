const LOCAL_STORAGE_KEY = 'falDesignerState';
const INIT_MARKER_KEY = 'falDesignerInitialised';

let loadedFromStorage = false;
let undoStack = [];
let redoStack = [];
const HISTORY_LIMIT = 50;

const defaultState = {
  mmToPx: 3.7795275591,
  gridWmm: 700,
  gridHmm: 38,
  marginMm: 10,
  minorStepMm: 1,
  majorStepMm: 10,
  helper: { showV: false, showH: false, color: '#666666', thickness: 3 },
  snapEnabled: true,
  discipline: '',
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

export let state = { ...defaultState };

function createSnapshot() {
    return {
        materials: JSON.parse(JSON.stringify(state.materials)),
        moivres: JSON.parse(JSON.stringify(state.moivres)),
        images: JSON.parse(JSON.stringify(state.images)),
    };
}

function restoreFromSnapshot(snapshot) {
    if (!snapshot) return;
    state.materials = snapshot.materials;
    state.moivres = snapshot.moivres;
    state.images = snapshot.images;
    
    state.selectedInsigne = null;
    state.selectedMaterial = null;
    state.selectedMoivre = null;

    notify();
}

export function resetHistory() {
    undoStack = [createSnapshot()];
    redoStack = [];
}

export function recordStateForUndo() {
    redoStack = [];
    undoStack.push(createSnapshot());
    if (undoStack.length > HISTORY_LIMIT) {
        undoStack.shift();
    }
}

export function undo() {
    if (undoStack.length < 2) return;
    const currentState = undoStack.pop();
    redoStack.push(currentState);
    const previousState = undoStack[undoStack.length - 1];
    restoreFromSnapshot(previousState);
}

export function redo() {
    if (redoStack.length === 0) return;
    const nextState = redoStack.pop();
    undoStack.push(nextState);
    restoreFromSnapshot(nextState);
}

function saveState() {
    try {
        const persistentImages = state.images.filter(img => !img.sessionOnly);

        const stateToSave = {
            gridWmm: state.gridWmm,
            gridHmm: state.gridHmm,
            marginMm: state.marginMm,
            helper: state.helper,
            snapEnabled: state.snapEnabled,
            discipline: state.discipline,
            disciplineColors: state.disciplineColors,
            disciplineMaterial: state.disciplineMaterial,
            materials: state.materials,
            moivres: state.moivres,
            images: persistentImages,
            viewScale: state.viewScale,
            viewOffsetX: state.viewOffsetX,
            viewOffsetY: state.viewOffsetY,
        };
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (error) {
        console.error("Could not save state to localStorage:", error);
    }
}

function loadState() {
    try {
        const savedStateJSON = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedStateJSON) {
            const savedState = JSON.parse(savedStateJSON);
            state = { ...defaultState, ...savedState };
            loadedFromStorage = true;
            undoStack = [createSnapshot()];
        } else {
            undoStack = [createSnapshot()];
        }
    } catch (error) {
        console.error("Failed to load or parse state from localStorage. Resetting to default.", error);
        state = { ...defaultState };
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        undoStack = [createSnapshot()];
    }
}

export function shouldSeedDefaultDesign() {
    if (loadedFromStorage) return false;
    try {
        return localStorage.getItem(INIT_MARKER_KEY) === null;
    } catch (error) {
        console.error("Could not read the initialisation marker:", error);
        return false;
    }
}

export function markInitialised() {
    try {
        localStorage.setItem(INIT_MARKER_KEY, '1');
    } catch (error) {
        console.error("Could not save the initialisation marker:", error);
    }
}

export function resetState() {
    if (confirm("Êtes-vous sûr de vouloir réinitialiser le circulaire? Toutes les données seront effacées.")) {
        // Stop any pending or flush-triggered write, otherwise the state we are
        // about to clear gets saved straight back during unload.
        suspendPersistence();
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        markInitialised();
        window.location.reload();
    }
}

const listeners = new Set();
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }

const SAVE_DEBOUNCE_MS = 500;

let renderHandle = null;
let saveTimer = null;
let persistenceSuspended = false;

function runListeners() {
    renderHandle = null;
    for (const fn of listeners) fn();
}

function clearSaveTimer() {
    if (saveTimer !== null) {
        clearTimeout(saveTimer);
        saveTimer = null;
    }
}

// Write immediately, cancelling any pending debounce. Used when the page is
// going away and a trailing timer would never fire.
function flushSave() {
    if (persistenceSuspended) return;
    if (saveTimer === null) return;
    clearSaveTimer();
    saveState();
}

// Permanently disable persistence for the remaining life of the page.
function suspendPersistence() {
    persistenceSuspended = true;
    clearSaveTimer();
}

// Coalesces a burst of calls into one render per frame and one write per
// quiet period. A drag emitting 60 notify() calls a second now costs one
// repaint per frame and a single serialisation once the pointer settles.
export function notify() {
    if (renderHandle === null) {
        renderHandle = requestAnimationFrame(runListeners);
    }

    if (persistenceSuspended) return;
    clearSaveTimer();
    saveTimer = setTimeout(() => {
        saveTimer = null;
        saveState();
    }, SAVE_DEBOUNCE_MS);
}

// pagehide covers navigation and tab close; visibilitychange is the one that
// actually fires when a mobile browser backgrounds the page.
window.addEventListener('pagehide', flushSave);
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushSave();
});

loadState();
