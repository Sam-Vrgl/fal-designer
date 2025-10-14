import { state, notify, subscribe, resetState, recordStateForUndo, undo, redo } from './state.js';
import { exportState, importState } from './file-handler.js';
import { exportCanvasAsImage } from './image-exporter.js';

export function bindUI(disciplinesData) {
    const $ = (id) => document.getElementById(id);
    const canvas = $('myCanvas');
    const container = canvas.parentElement;

    const modalOverlay = $('welcome-modal-overlay');
    const closeModalBtn = $('close-modal-btn');
    closeModalBtn.addEventListener('click', () => {
        modalOverlay.style.display = 'none';
    });

    const zoomInBtn = $('zoomInBtn');
    const zoomOutBtn = $('zoomOutBtn');
    const zoomFitBtn = $('zoomFitBtn');
    const zoomDisplay = $('zoom-display');

    const selectModeBtn = $('selectModeBtn');
    const resetBtn = $('resetBtn');
    const exportBtn = $('exportBtn');
    const importBtn = $('importBtn');
    const importFile = $('importFile');
    const exportImageBtn = $('exportImageBtn');
    
    const chkV = $('toggleV');
    const chkH = $('toggleH');
    const gridW = $('gridWInput');
    const gridH = $('gridHInput');
    const margin = $('marginInput');

    const materialDisciplineSelect = $('materialDisciplineSelect');
    const materialHeightSelect = $('materialHeightSelect');
    const materialWidthInput = $('materialWidthInput');
    const addMaterialBtn = $('addMaterialBtn');
    const moivreColor = $('moivreColor');
    const addMoivreBtn = $('addMoivreBtn');

    const insignePalette = $('insigne-list');

    const insignePropsDiv = $('insigne-props');
    const insigneX = $('insigneX');
    const insigneY = $('insigneY');
    const insigneHeight = $('insigneHeight');
    const removeInsigneBtn = $('removeInsigneBtn');

    const materialPropsDiv = $('material-props');
    const selectedMaterialX = $('selectedMaterialX');
    const selectedMaterialY = $('selectedMaterialY');
    const selectedMaterialWidth = $('selectedMaterialWidth');
    const selectedMaterialHeight = $('selectedMaterialHeight');
    const removeMaterialBtn = $('removeMaterialBtn');
    
    const moivrePropsDiv = $('moivre-props');
    const removeMoivreBtn = $('removeMoivreBtn');

    const noSelectionDiv = $('no-selection');

    chkV.checked = state.helper.showV;
    chkH.checked = state.helper.showH;
    gridW.value = state.gridWmm;
    gridH.value = state.gridHmm;
    margin.value = state.marginMm;

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

    zoomInBtn.addEventListener('click', () => { state.viewScale *= 1.25; notify(); });
    zoomOutBtn.addEventListener('click', () => { state.viewScale /= 1.25; notify(); });
    zoomFitBtn.addEventListener('click', () => {
        const totalW_px = (state.gridWmm + 2 * state.marginMm) * state.mmToPx;
        const totalH_px = (state.gridHmm + 2 * state.marginMm) * state.mmToPx;
        const scaleX = container.clientWidth / totalW_px;
        const scaleY = container.clientHeight / totalH_px;
        state.viewScale = Math.min(scaleX, scaleY) * 0.95;
        state.viewOffsetX = (container.clientWidth - (totalW_px * state.viewScale)) / 2;
        state.viewOffsetY = (container.clientHeight - (totalH_px * state.viewScale)) / 2;
        notify();
    });
    
    const updateZoomDisplay = () => {
        if(zoomDisplay) zoomDisplay.textContent = `${Math.round(state.viewScale * 100)}%`;
    };
    subscribe(updateZoomDisplay);
    
    setTimeout(() => zoomFitBtn.click(), 50);

    const setMode = (mode) => {
        state.currentMode = mode;
        if (mode === 'select') {
          state.insigneToPlace = null;
        }
        notify();
    };
    selectModeBtn.addEventListener('click', () => setMode('select'));
    
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

    resetBtn.addEventListener('click', resetState);
    exportBtn.addEventListener('click', exportState);
    exportImageBtn.addEventListener('click', exportCanvasAsImage);
    importBtn.addEventListener('click', () => importFile.click());
    importFile.addEventListener('change', (e) => { importState(e.target.files[0]); e.target.value = ''; });

    chkV.addEventListener('change', () => { state.helper.showV = chkV.checked; notify(); });
    chkH.addEventListener('change', () => { state.helper.showH = chkH.checked; notify(); });
    gridW.addEventListener('input', () => { state.gridWmm = gridW.valueAsNumber; notify(); });
    gridH.addEventListener('input', () => { state.gridHmm = gridH.valueAsNumber; notify(); });
    margin.addEventListener('input', () => { state.marginMm = margin.valueAsNumber; notify(); });

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

            const material1 = {
                x_mm: 10, y_mm: 0,
                width_mm: width, height_mm: sectionHeight,
                material: discipline.matière, color: color1,
                groupId: groupId
            };
            const material2 = {
                x_mm: 10, y_mm: sectionHeight,
                width_mm: width, height_mm: sectionHeight,
                material: discipline.matière, color: color2,
                groupId: groupId
            };
            state.materials.push(material1, material2);
        } else {
            const newMaterial = {
                x_mm: 10, y_mm: 0,
                width_mm: width, height_mm: totalHeight,
                material: discipline.matière,
                color: `rgb(${discipline.couleursRGB[0]})`
            };
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

    insignePalette.addEventListener('click', (e) => {
        if (e.target.tagName === 'IMG') {
            const { path, sizeMm } = e.target.dataset;
            state.insigneToPlace = { path, sizeMm, url: e.target.src };
            setMode('place');
        }
    });

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
        selectModeBtn.classList.toggle('active', mode === 'select');
        container.style.cursor = mode === 'place' && state.insigneToPlace ? 'copy' : 'default';
    };
    
    subscribe(updateInspector);
    subscribe(updateModeUI);

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