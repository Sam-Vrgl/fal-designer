import { sanitizeDesign } from './validation.js';
import { showError } from './messages.js';

const LOCAL_STORAGE_KEY = 'falDesignerState';
const INIT_MARKER_KEY = 'falDesignerInitialised';
const WELCOME_SEEN_KEY = 'falDesignerWelcomeSeen';

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

function freshState() {
    return structuredClone(defaultState);
}

export let state = freshState();

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

    Object.assign(state, structuredClone(snapshot));

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

function persistentImages() {
    return state.images.filter(img => !img.sessionOnly);
}

export function designState({ includeSessionImages = false } = {}) {
    return {
        gridWmm: state.gridWmm,
        gridHmm: state.gridHmm,
        marginMm: state.marginMm,
        discipline: state.discipline,
        materials: state.materials,
        moivres: state.moivres,
        images: includeSessionImages ? state.images : persistentImages(),
    };
}

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

let storageWarningShown = false;

function saveState() {
    try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(persistableState()));
        storageWarningShown = false;
    } catch (error) {
        console.error("Could not save state to localStorage:", error);

        if (!storageWarningShown) {
            storageWarningShown = true;
            showError(
                "La sauvegarde automatique a échoué : la mémoire du navigateur est pleine " +
                "ou indisponible (navigation privée). Vos modifications seront perdues en " +
                "fermant la page. Exportez votre circulaire en JSON pour la conserver."
            );
        }
    }
}

const MOVED_ASSETS = [
    [/\/lettres\/min\/([a-z])_min\.webp$/, '/lettres/maj/$1_maj.webp'],
    [/\/chiffres\/petit\/(\d)_min\.webp$/, '/chiffres/grand/$1_maj.webp'],
    [/\/annees\/(beta|phi|psi)-24mm\.webp$/, '/filiere/$1-24mm.webp'],
    [/\/filiere\/caducée-de-mercure-32mm\.webp$/, '/filiere/caducee-de-mercure-32mm.webp'],
    [/\/filiere\/@-arobase-24mm\.webp$/, '/filiere/arobase-24mm.webp'],
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

export function applyImportedDesign(loadedState) {
    migrateImages(loadedState?.images);
    const { design, warnings } = sanitizeDesign(loadedState, defaultState);

    state.gridWmm = design.gridWmm;
    state.gridHmm = design.gridHmm;
    state.marginMm = design.marginMm;
    state.materials = design.materials;
    state.moivres = design.moivres;
    state.images = design.images;

    return warnings;
}

function loadState() {
    try {
        const savedStateJSON = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedStateJSON) {
            const savedState = JSON.parse(savedStateJSON);
            migrateImages(savedState.images);
            const { design, warnings } = sanitizeDesign(savedState, defaultState);
            state = design;
            if (warnings.length > 0) {
                console.warn('Discarded while restoring saved state:', warnings);
            }
            loadedFromStorage = true;
            undoStack = [createSnapshot()];
        } else {
            undoStack = [createSnapshot()];
        }
    } catch (error) {
        console.error("Failed to load or parse state from localStorage. Resetting to default.", error);
        state = freshState();
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

export function shouldShowWelcome() {
    try {
        return localStorage.getItem(WELCOME_SEEN_KEY) === null;
    } catch (error) {
        console.error("Could not read the welcome marker:", error);
        return false;
    }
}

export function markWelcomeSeen() {
    try {
        localStorage.setItem(WELCOME_SEEN_KEY, '1');
    } catch (error) {
        console.error("Could not save the welcome marker:", error);
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

function flushSave() {
    if (persistenceSuspended) return;
    if (saveTimer === null) return;
    clearSaveTimer();
    saveState();
}

function suspendPersistence() {
    persistenceSuspended = true;
    clearSaveTimer();
}

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

window.addEventListener('pagehide', flushSave);
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushSave();
});

loadState();
