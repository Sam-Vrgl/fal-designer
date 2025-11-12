// js/ui.js

import { state, notify, subscribe, resetState, recordStateForUndo, undo, redo } from './state.js';
import { exportState, importState } from './file-handler.js';
import { exportCanvasAsImage } from './image-exporter.js';
// We no longer import from 'insignes.js'

// Helper: Sets the application mode
function setMode(mode) {
    state.currentMode = mode;
    if (mode === 'select') {
        state.insigneToPlace = null;
    }
    notify();
}

/**
 * Binds events for the main toolbar (zoom, file, mode).
 */
function bindToolbarEvents(container, zoomInBtn, zoomOutBtn, zoomFitBtn, selectModeBtn, resetBtn, exportBtn, importBtn, importFile, exportImageBtn) {
    if (zoomInBtn) zoomInBtn.addEventListener('click', () => { state.viewScale *= 1.25; notify(); });
    if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => { state.viewScale /= 1.25; notify(); });
    if (zoomFitBtn) zoomFitBtn.addEventListener('click', () => {
        const totalW_px = (state.gridWmm + 2 * state.marginMm) * state.mmToPx;
        const totalH_px = (state.gridHmm + 2 * state.marginMm) * state.mmToPx;
        const scaleX = container.clientWidth / totalW_px;
        const scaleY = container.clientHeight / totalH_px;
        state.viewScale = Math.min(scaleX, scaleY) * 0.95;
        state.viewOffsetX = (container.clientWidth - (totalW_px * state.viewScale)) / 2;
        state.viewOffsetY = (container.clientHeight - (totalH_px * state.viewScale)) / 2;
        notify();
    });

    if (selectModeBtn) selectModeBtn.addEventListener('click', () => setMode('select'));
    if (resetBtn) resetBtn.addEventListener('click', resetState);
    if (exportBtn) exportBtn.addEventListener('click', exportState);
    if (exportImageBtn) exportImageBtn.addEventListener('click', exportCanvasAsImage);
    if (importBtn) importBtn.addEventListener('click', () => importFile.click());
    if (importFile) importFile.addEventListener('change', (e) => { importState(e.target.files[0]); e.target.value = ''; });
}

/**
 * Binds events for the settings panels (guides, grid, materials).
 */
function bindSettingsEvents(disciplinesData, chkV, chkH, chkSnap, gridW, gridH, margin, materialDisciplineSelect, materialHeightSelect, materialWidthInput, addMaterialBtn, moivreColor, addMoivreBtn) {
    chkV.addEventListener('change', () => { state.helper.showV = chkV.checked; notify(); });
    chkH.addEventListener('change', () => { state.helper.showH = chkH.checked; notify(); });
    chkSnap.addEventListener('change', () => { state.snapEnabled = chkSnap.checked; notify(); });
    gridW.addEventListener('input', () => { state.gridWmm = gridW.valueAsNumber; notify(); });
    gridH.addEventListener('input', () => { state.gridHmm = gridH.valueAsNumber; notify(); });
    margin.addEventListener('input', () => { state.marginMm = margin.valueAsNumber; notify(); });

    // Populate and bind material discipline dropdown
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

    addMaterialBtn.addEventListener('click', () => {
        const selectedDisciplineName = materialDisciplineSelect.value;
        const discipline = disciplinesData[selectedDisciplineName];
        if (!discipline) return;

        const heightMultiplier = parseFloat(materialHeightSelect.value);
        const width = materialWidthInput.valueAsNumber;
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

    addMoivreBtn.addEventListener('click', () => {
        state.moivres.push({ x_mm: 50, y_mm: 0, width_mm: 5, height_mm: state.gridHmm, color: moivreColor.value });
        recordStateForUndo();
        notify();
    });
}

/**
 * Binds events for the insigne palette (click to place, image upload).
 * Now accepts insignePalette service as a parameter.
 */
function bindPaletteEvents(insignePaletteEl, uploadSessionImageBtn, sessionImageInput, sessionObjectUrls, insignePalette) {
    insignePaletteEl.addEventListener('click', (e) => {
        if (e.target.tagName === 'IMG') {
            const { path, sizeMm, heightPct, sessionOnly } = e.target.dataset;
            const insigneToPlace = { path, url: e.target.src };
            if (sizeMm) insigneToPlace.sizeMm = sizeMm;
            if (heightPct) insigneToPlace.heightPct = parseFloat(heightPct);
            if (sessionOnly === 'true') insigneToPlace.sessionOnly = true;
            state.insigneToPlace = insigneToPlace;
            setMode('place');
        }
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
            
            // Use the method from the passed-in service instance
            const insigneElement = insignePalette.addSessionInsigne(objectUrl, baseName, { heightPct: 0.5 });

            const placementHeightPct = insigneElement?.dataset.heightPct ? parseFloat(insigneElement.dataset.heightPct) : 0.5;
            state.insigneToPlace = { path: objectUrl, heightPct: placementHeightPct, url: objectUrl, sessionOnly: true };
            setMode('place');
        });
    }
}

/**
 * Binds events for the inspector panel (property inputs, remove buttons).
 */
function bindInspectorEvents(insigneX, insigneY, insigneHeight, removeInsigneBtn, selectedMaterialX, selectedMaterialY, selectedMaterialWidth, selectedMaterialHeight, removeMaterialBtn, removeMoivreBtn) {
    insigneX.addEventListener('input', () => { if (state.selectedInsigne) { state.selectedInsigne.x_mm = insigneX.valueAsNumber; notify(); }});
    insigneY.addEventListener('input', () => { if (state.selectedInsigne) { state.selectedInsigne.y_mm = insigneY.valueAsNumber; notify(); }});
    insigneHeight.addEventListener('input', () => { if (state.selectedInsigne && !insigneHeight.disabled) { state.selectedInsigne.heightPct = insigneHeight.valueAsNumber / 100; notify(); }});
    removeInsigneBtn.addEventListener('click', () => {
        if (state.selectedInsigne) {
            state.images = state.images.filter(i => i !== state.selectedInsigne);
            state.selectedInsigne = null;
            recordStateForUndo();
            notify();
        }
    });
    
    selectedMaterialX.addEventListener('input', () => { if (state.selectedMaterial) { state.selectedMaterial.x_mm = selectedMaterialX.valueAsNumber; notify(); }});
    selectedMaterialY.addEventListener('input', () => { if (state.selectedMaterial) { state.selectedMaterial.y_mm = selectedMaterialY.valueAsNumber; notify(); }});
    selectedMaterialWidth.addEventListener('input', () => { if (state.selectedMaterial) { state.selectedMaterial.width_mm = selectedMaterialWidth.valueAsNumber; notify(); }});
    selectedMaterialHeight.addEventListener('input', () => { if (state.selectedMaterial) { state.selectedMaterial.height_mm = selectedMaterialHeight.valueAsNumber; notify(); }});
    removeMaterialBtn.addEventListener('click', () => {
        if (state.selectedMaterial) {
            if (state.selectedMaterial.groupId) {
                state.materials = state.materials.filter(m => m.groupId !== state.selectedMaterial.groupId);
            } else {
                state.materials = state.materials.filter(m => m !== state.selectedMaterial);
            }
            state.selectedMaterial = null;
            recordStateForUndo();
            notify();
        }
    });

    removeMoivreBtn.addEventListener('click', () => {
        if (state.selectedMoivre) {
            state.moivres = state.moivres.filter(m => m !== state.selectedMoivre);
            state.selectedMoivre = null;
            recordStateForUndo();
            notify();
        }
    });
}

/**
 * Binds global listeners for keyboard shortcuts and page exit.
 */
function bindGlobalListeners(sessionObjectUrls) {
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            setMode('select');
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

/**
 * Subscribes to state changes to update UI elements.
 */
function setupSubscriptions(container, zoomDisplay, selectModeBtn, noSelectionDiv, insignePropsDiv, materialPropsDiv, moivrePropsDiv, insigneX, insigneY, insigneHeight, selectedMaterialX, selectedMaterialY, selectedMaterialWidth, selectedMaterialHeight) {
    
    const updateZoomDisplay = () => {
        if(zoomDisplay) zoomDisplay.textContent = `${Math.round(state.viewScale * 100)}%`;
    };

    const updateInspector = () => {
        const hasSelection = state.selectedInsigne || state.selectedMaterial || state.selectedMoivre;
        noSelectionDiv.style.display = hasSelection ? 'none' : 'block';
        insignePropsDiv.style.display = state.selectedInsigne ? 'block' : 'none';
        materialPropsDiv.style.display = state.selectedMaterial ? 'block' : 'none';
        moivrePropsDiv.style.display = state.selectedMoivre ? 'block' : 'none';

        if (state.selectedInsigne) {
            insigneX.value = state.selectedInsigne.x_mm;
            insigneY.value = state.selectedInsigne.y_mm;
            if (state.selectedInsigne.height_mm) {
                insigneHeight.value = ((state.selectedInsigne.height_mm / state.gridHmm) * 100).toFixed(2);
                insigneHeight.disabled = true;
            } else if (state.selectedInsigne.heightPct) {
                insigneHeight.value = state.selectedInsigne.heightPct * 100;
                insigneHeight.disabled = false;
            }
        }
        if (state.selectedMaterial) {
            selectedMaterialX.value = state.selectedMaterial.x_mm;
            selectedMaterialY.value = state.selectedMaterial.y_mm;
            selectedMaterialWidth.value = state.selectedMaterial.width_mm;
            selectedMaterialHeight.value = state.selectedMaterial.height_mm;
        }
    };
    
    const updateModeUI = () => {
        const mode = state.currentMode;
        if (selectModeBtn) selectModeBtn.classList.toggle('active', mode === 'select');
        container.style.cursor = mode === 'place' && state.insigneToPlace ? 'copy' : 'default';
    };
    
    subscribe(updateZoomDisplay);
    subscribe(updateInspector);
    subscribe(updateModeUI);
}


/**
 * Main UI binding function.
 * Now accepts insignePalette service as a parameter.
 */
export function bindUI(disciplinesData, insignePalette) {
    const $ = (id) => document.getElementById(id);
    const canvas = $('myCanvas');
    const container = canvas.parentElement;

    // --- Select All Elements ---
    const zoomInBtn = $('zoomInBtn'), zoomOutBtn = $('zoomOutBtn'), zoomFitBtn = $('zoomFitBtn'), zoomDisplay = $('zoom-display');
    const selectModeBtn = $('selectModeBtn'), resetBtn = $('resetBtn'), exportBtn = $('exportBtn'), importBtn = $('importBtn'), importFile = $('importFile'), exportImageBtn = $('exportImageBtn');
    const chkV = $('toggleV'), chkH = $('toggleH'), chkSnap = $('toggleSnap'), gridW = $('gridWInput'), gridH = $('gridHInput'), margin = $('marginInput');
    const materialDisciplineSelect = $('materialDisciplineSelect'), materialHeightSelect = $('materialHeightSelect'), materialWidthInput = $('materialWidthInput'), addMaterialBtn = $('addMaterialBtn'), moivreColor = $('moivreColor'), addMoivreBtn = $('addMoivreBtn');
    const insignePaletteEl = $('insigne-list'), uploadSessionImageBtn = $('uploadSessionImageBtn'), sessionImageInput = $('sessionImageInput'); // Renamed insignePaletteEl for clarity
    const insignePropsDiv = $('insigne-props'), insigneX = $('insigneX'), insigneY = $('insigneY'), insigneHeight = $('insigneHeight'), removeInsigneBtn = $('removeInsigneBtn');
    const materialPropsDiv = $('material-props'), selectedMaterialX = $('selectedMaterialX'), selectedMaterialY = $('selectedMaterialY'), selectedMaterialWidth = $('selectedMaterialWidth'), selectedMaterialHeight = $('selectedMaterialHeight'), removeMaterialBtn = $('removeMaterialBtn');
    const moivrePropsDiv = $('moivre-props'), removeMoivreBtn = $('removeMoivreBtn');
    const noSelectionDiv = $('no-selection');

    // Keep track of session-only images for cleanup
    const sessionObjectUrls = new Set();

    // --- Set Initial Values ---
    chkV.checked = state.helper.showV;
    chkH.checked = state.helper.showH;
    chkSnap.checked = state.snapEnabled;
    gridW.value = state.gridWmm;
    gridH.value = state.gridHmm;
    margin.value = state.marginMm;

    // --- Delegate Bindings ---
    bindToolbarEvents(container, zoomInBtn, zoomOutBtn, zoomFitBtn, selectModeBtn, resetBtn, exportBtn, importBtn, importFile, exportImageBtn);
    bindSettingsEvents(disciplinesData, chkV, chkH, chkSnap, gridW, gridH, margin, materialDisciplineSelect, materialHeightSelect, materialWidthInput, addMaterialBtn, moivreColor, addMoivreBtn);
    
    // Pass the service instance to the binding function
    bindPaletteEvents(insignePaletteEl, uploadSessionImageBtn, sessionImageInput, sessionObjectUrls, insignePalette);
    
    bindInspectorEvents(insigneX, insigneY, insigneHeight, removeInsigneBtn, selectedMaterialX, selectedMaterialY, selectedMaterialWidth, selectedMaterialHeight, removeMaterialBtn, removeMoivreBtn);
    bindGlobalListeners(sessionObjectUrls);
    
    // --- Setup UI > State Subscriptions ---
    setupSubscriptions(container, zoomDisplay, selectModeBtn, noSelectionDiv, insignePropsDiv, materialPropsDiv, moivrePropsDiv, insigneX, insigneY, insigneHeight, selectedMaterialX, selectedMaterialY, selectedMaterialWidth, selectedMaterialHeight);

    // --- Initial UI State ---
    setTimeout(() => {
        if(zoomFitBtn) zoomFitBtn.click();
    }, 50);
}