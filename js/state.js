const LOCAL_STORAGE_KEY = 'falDesignerState';

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
  helper: { showV: true, showH: true, color: '#666666', thickness: 3 },
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
        const stateToSave = {
            gridWmm: state.gridWmm,
            gridHmm: state.gridHmm,
            marginMm: state.marginMm,
            helper: state.helper,
            discipline: state.discipline,
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

function loadState() {
    try {
        const savedStateJSON = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedStateJSON) {
            const savedState = JSON.parse(savedStateJSON);
            state = { ...defaultState, ...savedState };
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

export function resetState() {
    if (confirm("Are you sure you want to reset your design? This will clear all saved data.")) {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        window.location.reload();
    }
}

const listeners = new Set();
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function notify() {
    for (const fn of listeners) fn();
    saveState();
}

loadState();