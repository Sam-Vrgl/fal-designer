// js/ui.js

import { state, notify, subscribe, resetState, recordStateForUndo, undo, redo } from './state.js';
import { exportState, importState } from './file-handler.js';
import { exportCanvasAsImage } from './image-exporter.js';
import { placeInsigne } from './image-service.js';
import { debounce } from './utils.js';
import { LIMITS, readNumber, clamp } from './validation.js';
import { fitToView } from './view.js';

// Typing in a number field fires an input event per keystroke, and dragging a
// spinner fires a stream of them. Collapse each burst into one history entry.
const recordEdit = debounce(recordStateForUndo, 400);

const NUDGE_STEP_MM = 1;
const NUDGE_COARSE_MM = 10;

const NUDGE_DIRECTIONS = {
    ArrowLeft: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 },
    ArrowUp: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },
};

// How far each arrow moves through the palette. Its grid reflows with the
// container, so up and down mean one entry rather than one row.
const PALETTE_STEPS = {
    ArrowRight: 1,
    ArrowDown: 1,
    ArrowLeft: -1,
    ArrowUp: -1,
};

// Inside a field the arrows drive the spinner and Backspace erases a digit.
// Those keys belong to whatever has focus, not to the canvas.
const isEditingField = () => Boolean(document.activeElement?.matches('input, select, textarea'));

// Every numeric control in the app goes through here, so no keystroke can put a
// non-finite or out-of-range number into state.
//
// `get` returns the current value in the unit the field displays, or undefined
// when the field has nothing to edit — nothing selected, or a disabled field.
// `set` receives a number already clamped to `limit`.
//
// Two rules make this bearable to type in:
//
//   - An unreadable field is not an edit. Clearing a box leaves the last good
//     value in state, so the canvas stays on screen while the user retypes
//     instead of blanking and being persisted that way.
//   - Clamping happens in state, never in the box, while the field has focus.
//     Rewriting the text mid-keystroke fights the user; the field is normalised
//     on blur, which is when they have finished saying what they meant.
// The control's own min/max come from the same table as everything else, so the
// browser enforces the range on spinners and arrow keys without the bounds
// being written down a second time in the markup.
function applyLimit(el, limit) {
    if (!el) return;
    el.min = limit.min;
    el.max = limit.max;
}

function bindNumberInput(el, limit, { get, set }) {
    if (!el) return;

    applyLimit(el, limit);

    el.addEventListener('input', () => {
        if (get() === undefined) return;

        const value = readNumber(el, limit);
        if (value === null) return;

        set(value);
        notify();
        recordEdit();
    });

    el.addEventListener('blur', () => {
        const current = get();
        if (current !== undefined) el.value = current;
    });
}

function setMode(mode) {
    state.currentMode = mode;
    if (mode === 'select') {
        state.insigneToPlace = null;
    }
    notify();
}

// Only one thing can be selected at a time: every place that selects
// something clears the other two first.
function selectedElement() {
    return state.selectedInsigne ?? state.selectedMaterial ?? state.selectedMoivre;
}

function clearSelection() {
    state.selectedInsigne = null;
    state.selectedMaterial = null;
    state.selectedMoivre = null;
}

// Everything on the canvas in one order, each paired with the state field
// that holds it when selected, so Tab can walk the design as a single list.
function selectableElements() {
    return [
        ...state.images.map((item) => ({ item, field: 'selectedInsigne' })),
        ...state.materials.map((item) => ({ item, field: 'selectedMaterial' })),
        ...state.moivres.map((item) => ({ item, field: 'selectedMoivre' })),
    ];
}

// Moves the selection one element along, and reports whether it landed on
// anything. Running off either end clears the selection and answers false,
// which is what lets Tab out of the canvas instead of trapping focus there.
function cycleSelection(step) {
    const elements = selectableElements();
    if (elements.length === 0) return false;

    const selected = selectedElement();
    const from = selected
        ? elements.findIndex(({ item }) => item === selected)
        : (step > 0 ? -1 : elements.length);

    const next = elements[from + step];
    clearSelection();
    if (next) state[next.field] = next.item;
    notify();

    return Boolean(next);
}

// Every selectable thing carries a position in mm, so one mover covers all
// three. The bounds are the same ones the inspector fields enforce.
function nudgeSelection({ x, y }, stepMm) {
    const target = selectedElement();
    if (!target) return;

    target.x_mm = clamp(target.x_mm + x * stepMm, LIMITS.x_mm.min, LIMITS.x_mm.max);
    target.y_mm = clamp(target.y_mm + y * stepMm, LIMITS.y_mm.min, LIMITS.y_mm.max);
    // Same debounce as typing a coordinate, so a held arrow key is one undo
    // step rather than forty.
    recordEdit();
    notify();
}

// Drops whatever is selected. Only one thing can be at a time — selecting
// anything clears the other two — so the three inspector buttons and the
// Delete key are all the same operation and share this.
//
// A two-colour discipline places two stacked materials sharing a groupId.
// They are one ribbon to whoever is looking at them, so they go together.
function deleteSelection() {
    const { selectedInsigne, selectedMaterial, selectedMoivre } = state;

    if (selectedInsigne) {
        state.images = state.images.filter(i => i !== selectedInsigne);
    } else if (selectedMaterial) {
        state.materials = selectedMaterial.groupId
            ? state.materials.filter(m => m.groupId !== selectedMaterial.groupId)
            : state.materials.filter(m => m !== selectedMaterial);
    } else if (selectedMoivre) {
        state.moivres = state.moivres.filter(m => m !== selectedMoivre);
    } else {
        return;
    }

    clearSelection();
    recordStateForUndo();
    notify();
}

function bindAppToolbar(toolbarEl) {
    const selectModeBtn = toolbarEl.querySelector('#selectModeBtn');
    const resetBtn = toolbarEl.querySelector('#resetBtn');
    const exportBtn = toolbarEl.querySelector('#exportBtn');
    const importBtn = toolbarEl.querySelector('#importBtn');
    const importFile = toolbarEl.querySelector('#importFile');
    const exportImageBtn = toolbarEl.querySelector('#exportImageBtn');

    if (selectModeBtn) selectModeBtn.addEventListener('click', () => setMode('select'));
    if (resetBtn) resetBtn.addEventListener('click', resetState);
    if (exportBtn) exportBtn.addEventListener('click', exportState);
    if (exportImageBtn) exportImageBtn.addEventListener('click', exportCanvasAsImage);
    if (importBtn) importBtn.addEventListener('click', () => importFile?.click());
    if (importFile) importFile.addEventListener('change', (e) => { importState(e.target.files[0]); e.target.value = ''; });
}

function bindSettings(settingsContainer, disciplinesData) {
    const chkV = settingsContainer.querySelector('#toggleV');
    const chkH = settingsContainer.querySelector('#toggleH');
    const chkSnap = settingsContainer.querySelector('#toggleSnap');
    const gridW = settingsContainer.querySelector('#gridWInput');
    const gridH = settingsContainer.querySelector('#gridHInput');
    const margin = settingsContainer.querySelector('#marginInput');
    const materialDisciplineSelect = settingsContainer.querySelector('#materialDisciplineSelect');
    const materialHeightSelect = settingsContainer.querySelector('#materialHeightSelect');
    const materialWidthInput = settingsContainer.querySelector('#materialWidthInput');
    const addMaterialBtn = settingsContainer.querySelector('#addMaterialBtn');
    const moivreColor = settingsContainer.querySelector('#moivreColor');
    const addMoivreBtn = settingsContainer.querySelector('#addMoivreBtn');

    // Read on click rather than bound to state, so it only needs its range.
    applyLimit(materialWidthInput, LIMITS.width_mm);

    if (chkV) chkV.checked = state.helper.showV;
    if (chkH) chkH.checked = state.helper.showH;
    if (chkSnap) chkSnap.checked = state.snapEnabled;
    if (gridW) gridW.value = state.gridWmm;
    if (gridH) gridH.value = state.gridHmm;
    if (margin) margin.value = state.marginMm;

    // Guide and snap toggles are interface preferences, not document content,
    // so they deliberately stay out of history.
    if (chkV) chkV.addEventListener('change', () => { state.helper.showV = chkV.checked; notify(); });
    if (chkH) chkH.addEventListener('change', () => { state.helper.showH = chkH.checked; notify(); });
    if (chkSnap) chkSnap.addEventListener('change', () => { state.snapEnabled = chkSnap.checked; notify(); });

    bindNumberInput(gridW, LIMITS.gridWmm, {
        get: () => state.gridWmm,
        set: (value) => { state.gridWmm = value; },
    });
    bindNumberInput(gridH, LIMITS.gridHmm, {
        get: () => state.gridHmm,
        set: (value) => { state.gridHmm = value; },
    });
    bindNumberInput(margin, LIMITS.marginMm, {
        get: () => state.marginMm,
        set: (value) => { state.marginMm = value; },
    });

    if (materialDisciplineSelect) {
        const disciplineNames = Object.keys(disciplinesData);
        for (const name of disciplineNames) {
            const discipline = disciplinesData[name];
            if (!discipline.custom) {
                const option = document.createElement('option');
                option.value = name;
                option.textContent = name;
                materialDisciplineSelect.appendChild(option);
            }
        }
    }

    if (addMaterialBtn) addMaterialBtn.addEventListener('click', () => {
        const selectedDisciplineName = materialDisciplineSelect?.value;
        const discipline = disciplinesData[selectedDisciplineName];
        if (!discipline) return;
        
        const heightMultiplier = parseFloat(materialHeightSelect?.value ?? '1');
        const width = readNumber(materialWidthInput, LIMITS.width_mm);

        if (!Number.isFinite(heightMultiplier) || width === null) return;

        const totalHeight = state.gridHmm * heightMultiplier;

        if (discipline.couleursRGB.length > 1) {
            const groupId = Date.now();
            const sectionHeight = totalHeight / 2;
            const color1 = `rgb(${discipline.couleursRGB[0]})`;
            const color2 = `rgb(${discipline.couleursRGB[1]})`;

            const material1 = { x_mm: 10, y_mm: 0, width_mm: width, height_mm: sectionHeight, material: discipline.matière, color: color1, groupId: groupId };
            const material2 = { x_mm: 10, y_mm: sectionHeight, width_mm: width, height_mm: sectionHeight, material: discipline.matière, color: color2, groupId: groupId };
            state.materials.push(material1, material2);
        } else {
            const newMaterial = { x_mm: 10, y_mm: 0, width_mm: width, height_mm: totalHeight, material: discipline.matière, color: `rgb(${discipline.couleursRGB[0]})` };
            state.materials.push(newMaterial);
        }
        
        recordStateForUndo();
        notify();
    });

    if (addMoivreBtn) addMoivreBtn.addEventListener('click', () => {
        state.moivres.push({ x_mm: 50, y_mm: 0, width_mm: 5, height_mm: state.gridHmm, color: moivreColor?.value ?? 'rgb(255, 255, 255)' });
        recordStateForUndo();
        notify();
    });
}

function bindCanvasToolbar(toolbarEl, canvasContainer) {
    const zoomInBtn = toolbarEl.querySelector('#zoomInBtn');
    const zoomOutBtn = toolbarEl.querySelector('#zoomOutBtn');
    const zoomFitBtn = toolbarEl.querySelector('#zoomFitBtn');

    if (zoomInBtn) zoomInBtn.addEventListener('click', () => { state.viewScale *= 1.25; notify(); });
    if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => { state.viewScale /= 1.25; notify(); });
    if (zoomFitBtn) zoomFitBtn.addEventListener('click', () => fitToView(canvasContainer));
}

function bindInsignePalette(paletteEl, insignePalette, sessionObjectUrls) {
    const insigneList = paletteEl.querySelector('#insigne-list');
    const uploadSessionImageBtn = paletteEl.querySelector('#uploadSessionImageBtn');
    const sessionImageInput = paletteEl.querySelector('#sessionImageInput');

    const readInsigneToPlace = (img) => {
        const { path, sizeMm, heightPct, sessionOnly } = img.dataset;
        const insigneToPlace = { path, url: img.src };
        if (sizeMm) insigneToPlace.sizeMm = sizeMm;
        if (heightPct) insigneToPlace.heightPct = parseFloat(heightPct);
        if (sessionOnly === 'true') insigneToPlace.sessionOnly = true;
        return insigneToPlace;
    };

    if (insigneList) insigneList.addEventListener('click', (e) => {
        if (e.target.tagName === 'IMG') {
            state.insigneToPlace = readInsigneToPlace(e.target);
            setMode('place');
        }
    });

    // Picking with a pointer only arms the placement — the insigne lands where
    // the canvas is clicked next, and a keyboard has no way to say where that
    // is. So Enter and Space place it outright, in the middle of the grid, and
    // leave it selected with focus on the inspector: the number fields there
    // are the keyboard's way to position it.
    if (insigneList) insigneList.addEventListener('keydown', (e) => {
        if (e.target.tagName !== 'IMG') return;

        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();

            clearSelection();
            state.selectedInsigne = placeInsigne(readInsigneToPlace(e.target), {
                x_mm: state.gridWmm / 2,
                y_mm: state.gridHmm / 2,
            });
            setMode('select');

            document.getElementById('inspector-panel')?.focus();
            return;
        }

        const step = PALETTE_STEPS[e.key];
        if (step === undefined) return;

        // preventDefault so roving the palette does not also scroll the
        // sidebar out from under it.
        e.preventDefault();
        insignePalette.focusRelative(step);
    });

    if (uploadSessionImageBtn) {
        uploadSessionImageBtn.addEventListener('click', () => {
            if (sessionImageInput) sessionImageInput.click();
        });
    }

    if (sessionImageInput) {
        sessionImageInput.addEventListener('change', (event) => {
            const [file] = event.target.files;
            event.target.value = '';
            if (!file) return;

            const objectUrl = URL.createObjectURL(file);
            sessionObjectUrls.add(objectUrl);
            const baseName = file.name.replace(/\.[^/.]+$/, '') || 'Image importée';
            
            const insigneElement = insignePalette.addSessionInsigne(objectUrl, baseName, { heightPct: 0.5 });

            const placementHeightPct = insigneElement?.dataset.heightPct ? parseFloat(insigneElement.dataset.heightPct) : 0.5;
            state.insigneToPlace = { path: objectUrl, heightPct: placementHeightPct, url: objectUrl, sessionOnly: true };
            setMode('place');
        });
    }
}

function bindInspectorPanel(inspectorPanelEl) {
    const insigneX = inspectorPanelEl.querySelector('#insigneX');
    const insigneY = inspectorPanelEl.querySelector('#insigneY');
    const insigneHeight = inspectorPanelEl.querySelector('#insigneHeight');
    const removeInsigneBtn = inspectorPanelEl.querySelector('#removeInsigneBtn');

    const selectedMaterialX = inspectorPanelEl.querySelector('#selectedMaterialX');
    const selectedMaterialY = inspectorPanelEl.querySelector('#selectedMaterialY');
    const selectedMaterialWidth = inspectorPanelEl.querySelector('#selectedMaterialWidth');
    const selectedMaterialHeight = inspectorPanelEl.querySelector('#selectedMaterialHeight');
    const removeMaterialBtn = inspectorPanelEl.querySelector('#removeMaterialBtn');

    const removeMoivreBtn = inspectorPanelEl.querySelector('#removeMoivreBtn');

    bindNumberInput(insigneX, LIMITS.x_mm, {
        get: () => state.selectedInsigne?.x_mm,
        set: (value) => { state.selectedInsigne.x_mm = value; },
    });
    bindNumberInput(insigneY, LIMITS.y_mm, {
        get: () => state.selectedInsigne?.y_mm,
        set: (value) => { state.selectedInsigne.y_mm = value; },
    });
    // The field is in percent of the grid height; state stores the fraction.
    // It is disabled for insignes with a fixed physical size, and a disabled
    // field has nothing to edit, so get() reports undefined for one.
    bindNumberInput(insigneHeight, LIMITS.heightPercent, {
        get: () => {
            if (!state.selectedInsigne || insigneHeight.disabled) return undefined;
            return (state.selectedInsigne.heightPct ?? 0) * 100;
        },
        set: (value) => { state.selectedInsigne.heightPct = value / 100; },
    });
    if (removeInsigneBtn) removeInsigneBtn.addEventListener('click', deleteSelection);

    bindNumberInput(selectedMaterialX, LIMITS.x_mm, {
        get: () => state.selectedMaterial?.x_mm,
        set: (value) => { state.selectedMaterial.x_mm = value; },
    });
    bindNumberInput(selectedMaterialY, LIMITS.y_mm, {
        get: () => state.selectedMaterial?.y_mm,
        set: (value) => { state.selectedMaterial.y_mm = value; },
    });
    bindNumberInput(selectedMaterialWidth, LIMITS.width_mm, {
        get: () => state.selectedMaterial?.width_mm,
        set: (value) => { state.selectedMaterial.width_mm = value; },
    });
    bindNumberInput(selectedMaterialHeight, LIMITS.height_mm, {
        get: () => state.selectedMaterial?.height_mm,
        set: (value) => { state.selectedMaterial.height_mm = value; },
    });
    if (removeMaterialBtn) removeMaterialBtn.addEventListener('click', deleteSelection);

    if (removeMoivreBtn) removeMoivreBtn.addEventListener('click', deleteSelection);
}

function bindGlobalListeners(sessionObjectUrls) {
    const canvas = document.getElementById('myCanvas');

    // The selection keys reach only the canvas and the panel that edits it.
    // Bound to the window at large, the arrows would take scrolling away from
    // whatever else happened to have focus.
    const inSelectionContext = () =>
        document.activeElement === canvas ||
        Boolean(document.activeElement?.closest('#inspector-panel'));

    window.addEventListener('keydown', (e) => {
        // A modal owns the keyboard while it is up: Escape belongs to it, and
        // undo would act on a canvas the user cannot reach or see.
        if (document.querySelector('dialog[open]')) return;

        if (e.key === 'Escape') {
            setMode('select');
        }

        // With the canvas focused, Tab walks the design instead of leaving
        // it — the only way to reach an element without a pointer. It lets go
        // at both ends rather than trapping: once the selection runs out, the
        // key is left alone and the browser moves on as usual.
        if (e.key === 'Tab' && document.activeElement === canvas) {
            if (cycleSelection(e.shiftKey ? -1 : 1)) e.preventDefault();
        }

        if (inSelectionContext() && !isEditingField()) {
            if (e.key === 'Delete' || e.key === 'Backspace') {
                e.preventDefault();
                deleteSelection();
            }

            const nudge = NUDGE_DIRECTIONS[e.key];
            if (nudge) {
                e.preventDefault();
                nudgeSelection(nudge, e.shiftKey ? NUDGE_COARSE_MM : NUDGE_STEP_MM);
            }
        }

        if (e.ctrlKey || e.metaKey) {
            let handled = false;
            if (e.key === 'z') {
                e.shiftKey ? redo() : undo();
                handled = true;
            } else if (e.key === 'y') {
                redo();
                handled = true;
            }
            if (handled) {
                e.preventDefault();
            }
        }
    });

    window.addEventListener('beforeunload', () => {
        sessionObjectUrls.forEach((url) => URL.revokeObjectURL(url));
        sessionObjectUrls.clear();
    });
}

function setupAllSubscriptions() {
    const container = document.getElementById('myCanvas')?.parentElement;
    const zoomDisplay = document.getElementById('zoom-display');
    const selectModeBtn = document.getElementById('selectModeBtn');
    const noSelectionDiv = document.getElementById('no-selection');
    const insignePropsDiv = document.getElementById('insigne-props');
    const materialPropsDiv = document.getElementById('material-props');
    const moivrePropsDiv = document.getElementById('moivre-props');
    const insigneX = document.getElementById('insigneX');
    const insigneY = document.getElementById('insigneY');
    const insigneHeight = document.getElementById('insigneHeight');
    const selectedMaterialX = document.getElementById('selectedMaterialX');
    const selectedMaterialY = document.getElementById('selectedMaterialY');
    const selectedMaterialWidth = document.getElementById('selectedMaterialWidth');
    const selectedMaterialHeight = document.getElementById('selectedMaterialHeight');
    const gridWInput = document.getElementById('gridWInput');
    const gridHInput = document.getElementById('gridHInput');
    const marginInput = document.getElementById('marginInput');
    const disciplineSelect = document.getElementById('disciplineSelect');

    // Never write into the control the user is currently editing; doing so
    // moves the caret mid-keystroke.
    const setValue = (el, value) => {
        if (el && el !== document.activeElement) el.value = value;
    };

    const updateZoomDisplay = () => {
        if(zoomDisplay) zoomDisplay.textContent = `${Math.round(state.viewScale * 100)}%`;
    };
    const updateInspector = () => {
        if (!noSelectionDiv || !insignePropsDiv || !materialPropsDiv || !moivrePropsDiv) return;

        const hasSelection = state.selectedInsigne || state.selectedMaterial || state.selectedMoivre;
        noSelectionDiv.style.display = hasSelection ? 'none' : 'block';
        insignePropsDiv.style.display = state.selectedInsigne ? 'block' : 'none';
        materialPropsDiv.style.display = state.selectedMaterial ? 'block' : 'none';
        moivrePropsDiv.style.display = state.selectedMoivre ? 'block' : 'none';

        if (state.selectedInsigne) {
            setValue(insigneX, state.selectedInsigne.x_mm);
            setValue(insigneY, state.selectedInsigne.y_mm);
            if (insigneHeight) {
                if (state.selectedInsigne.height_mm) {
                    insigneHeight.value = ((state.selectedInsigne.height_mm / state.gridHmm) * 100).toFixed(2);
                    insigneHeight.disabled = true;
                } else if (state.selectedInsigne.heightPct) {
                    insigneHeight.value = state.selectedInsigne.heightPct * 100;
                    insigneHeight.disabled = false;
                }
            }
        }
        if (state.selectedMaterial) {
            setValue(selectedMaterialX, state.selectedMaterial.x_mm);
            setValue(selectedMaterialY, state.selectedMaterial.y_mm);
            setValue(selectedMaterialWidth, state.selectedMaterial.width_mm);
            setValue(selectedMaterialHeight, state.selectedMaterial.height_mm);
        }
    };
    
    // Undo and redo can change grid geometry and discipline, so the controls
    // that own those values have to follow state rather than only being seeded
    // once at bind time. Assigning .value does not fire change, so this cannot
    // loop back into the handlers above.
    const updateSettingsControls = () => {
        setValue(gridWInput, state.gridWmm);
        setValue(gridHInput, state.gridHmm);
        setValue(marginInput, state.marginMm);
        if (disciplineSelect && disciplineSelect.value !== state.discipline) {
            setValue(disciplineSelect, state.discipline);
        }
    };

    const updateModeUI = () => {
        const mode = state.currentMode;
        if (selectModeBtn) {
            selectModeBtn.classList.toggle('active', mode === 'select');
            selectModeBtn.setAttribute('aria-pressed', String(mode === 'select'));
        }
        if (container) container.style.cursor = mode === 'place' && state.insigneToPlace ? 'copy' : 'default';
    };
    
    subscribe(updateZoomDisplay);
    subscribe(updateInspector);
    subscribe(updateSettingsControls);
    subscribe(updateModeUI);
}

export function bindUI(disciplinesData, insignePalette) {
    const $ = (id) => document.getElementById(id);
    
    const canvasContainer = $('canvas-container');
    const canvasToolbar = $('canvas-toolbar');
    const paletteContainer = $('palette-container');
    const inspectorPanel = $('inspector-panel');

    const sessionObjectUrls = new Set();

    if (canvasToolbar && canvasContainer) {
        bindCanvasToolbar(canvasToolbar, canvasContainer);
    }

    if (paletteContainer) {
        const appToolbar = paletteContainer.querySelector('#toolbar');
        const insignePaletteEl = paletteContainer.querySelector('#insigne-palette');

        if (appToolbar) {
            bindAppToolbar(appToolbar);
        }
        
        bindSettings(paletteContainer, disciplinesData);
        
        if (insignePaletteEl) {
            bindInsignePalette(insignePaletteEl, insignePalette, sessionObjectUrls);
        }
    }
    
    if (inspectorPanel) {
        bindInspectorPanel(inspectorPanel);
    }
    
    bindGlobalListeners(sessionObjectUrls);
    
    setupAllSubscriptions();
    // The initial fit used to be a setTimeout racing layout. main.js now does it
    // from the ResizeObserver's first callback, when the box is really known.
}