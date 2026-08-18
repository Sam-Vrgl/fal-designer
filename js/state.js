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

// The whole design, plus the resolved discipline colours the renderer needs.
// Colours are derived from disciplines.json, but carrying them means a restore
// is self-consistent without having to re-resolve anything.
function historyState() {
    return {
        ...designState({ includeSessionImages: true }),
        disciplineColors: state.disciplineColors,
        disciplineMaterial: state.disciplineMaterial,
    };
}

function createSnapshot() {
    return structuredClone(historyState());
}

function restoreFromSnapshot(snapshot) {
    if (!snapshot) return;

    // Clone on the way out as well as in. Assigning the stored arrays directly
    // would leave state and the history entry sharing objects, so the next drag
    // would mutate the very entry the user is standing on.
    Object.assign(state, structuredClone(snapshot));

    // Selections point into the arrays that were just replaced, so any held
    // reference is now an orphan the user could still drag.
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
    const snapshot = createSnapshot();

    const previous = undoStack[undoStack.length - 1];
    if (previous && JSON.stringify(previous) === JSON.stringify(snapshot)) return;

    redoStack = [];
    undoStack.push(snapshot);
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

// Session-only images live in blob: URLs that die with the page, so they are
// never written to storage or to an exported file.
function persistentImages() {
    return state.images.filter(img => !img.sessionOnly);
}

// The portable design: geometry and content, no view or interface state.
// This is exactly what an exported .json file contains, and what undo needs
// to restore. Anything added here is picked up by save, export and history
// together, which is the point of it being one definition.
export function designState({ includeSessionImages = false } = {}) {
    return {
        gridWmm: state.gridWmm,
        gridHmm: state.gridHmm,
        marginMm: state.marginMm,
        discipline: state.discipline,
        materials: state.materials,
        moivres: state.moivres,
        // Session images are dead outside this page, so they are left out of
        // anything that outlives it. Undo lives inside the page and must keep
        // them, or undoing after placing one would silently delete it.
        images: includeSessionImages ? state.images : persistentImages(),
    };
}

// The design plus everything else that should survive a reload: resolved
// discipline colours, guide toggles and the current view.
function persistableState() {
    return {
        ...designState(),
        helper: state.helper,
        snapEnabled: state.snapEnabled,
        disciplineColors: state.disciplineColors,
        disciplineMaterial: state.disciplineMaterial,
        viewScale: state.viewScale,
        viewOffsetX: state.viewOffsetX,
        viewOffsetY: state.viewOffsetY,
    };
}

function saveState() {
    try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(persistableState()));
    } catch (error) {
        console.error("Could not save state to localStorage:", error);
    }
}

// v0.5 removed the duplicate letter and digit files: the small and large
// palette entries now share one image at two sizes. Designs saved or exported
// before that still reference the deleted copies, so rewrite them to the
// surviving file. The physical size is stored on the placement itself, so
// nothing the user sees changes.
const MOVED_ASSETS = [
    [/\/lettres\/min\/([a-z])_min\.webp$/, '/lettres/maj/$1_maj.webp'],
    [/\/chiffres\/petit\/(\d)_min\.webp$/, '/chiffres/grand/$1_maj.webp'],
    [/\/annees\/(beta|phi|psi)-24mm\.webp$/, '/filiere/$1-24mm.webp'],
];

export function migrateAssetPath(url) {
    if (typeof url !== 'string') return url;
    for (const [pattern, replacement] of MOVED_ASSETS) {
        if (pattern.test(url)) return url.replace(pattern, replacement);
    }
    return url;
}

export function migrateImages(images) {
    if (!Array.isArray(images)) return images;
    for (const image of images) {
        if (image && typeof image === 'object') image.url = migrateAssetPath(image.url);
    }
    return images;
}

function loadState() {
    try {
        const savedStateJSON = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedStateJSON) {
            const savedState = JSON.parse(savedStateJSON);
            migrateImages(savedState.images);
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
