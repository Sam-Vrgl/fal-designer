import { state, notify, subscribe } from './state.js';
import { addImage, getCachedImage } from './main.js';
import { exportState, importState } from './file-handler.js';
import { exportCanvasAsImage } from './image-exporter.js';

export function bindUI() {
  const $ = (id) => document.getElementById(id);

  // File controls
  const exportBtn = $('exportBtn');
  const importBtn = $('importBtn');
  const importFile = $('importFile');
  const exportImageBtn = $('exportImageBtn');

  // Toggles
  const chkV = $('toggleV');
  const chkH = $('toggleH');

  // Numeric/color inputs
  const gridW = $('gridWInput');
  const gridH = $('gridHInput');
  const margin = $('marginInput');
  const minorStep = $('minorStepInput');
  const majorStep = $('majorStepInput');
  const mmToPx = $('mmToPxInput');
  const helperColor = $('helperColorInput');
  const helperThickness = $('helperThicknessInput');

  // Insigne controls
  const insigneSelect = $('insigneSelect');
  const addInsigneBtn = $('addInsigneBtn');
  const insigneControls = $('insigneControls');
  const insigneX = $('insigneX');
  const insigneY = $('insigneY');
  const insigneHeight = $('insigneHeight');
  const removeInsigneBtn = $('removeInsigneBtn');

  // New material controls
  const materialType = $('materialType');
  const materialColor = $('materialColor');
  const materialX = $('materialX');
  const materialY = $('materialY');
  const materialWidth = $('materialWidth');
  const materialHeight = $('materialHeight');
  const addMaterialBtn = $('addMaterialBtn');
  
  // Selected material controls
  const materialControls = $('materialControls');
  const selectedMaterialX = $('selectedMaterialX');
  const selectedMaterialY = $('selectedMaterialY');
  const selectedMaterialWidth = $('selectedMaterialWidth');
  const selectedMaterialHeight = $('selectedMaterialHeight');
  const removeMaterialBtn = $('removeMaterialBtn');

  // Moivre controls
  const moivreColor = $('moivreColor');
  const addMoivreBtn = $('addMoivreBtn');


  // Initialize from state
  chkV.checked = state.helper.showV;
  chkH.checked = state.helper.showH;
  gridW.value = state.gridWmm;
  gridH.value = state.gridHmm;
  margin.value = state.marginMm;
  minorStep.value = state.minorStepMm;
  majorStep.value = state.majorStepMm;
  mmToPx.value = state.mmToPx;
  helperColor.value = state.helper.color;
  helperThickness.value = state.helper.thickness;


  // Wire changes -> state -> notify()
  chkV.addEventListener('change', () => { state.helper.showV = chkV.checked; notify(); });
  chkH.addEventListener('change', () => { state.helper.showH = chkH.checked; notify(); });

  gridW.addEventListener('input', () => {
    state.gridWmm = clampNum(gridW.valueAsNumber, 1, 50000);
    notify();
  });
  gridH.addEventListener('input', () => {
    state.gridHmm = clampNum(gridH.valueAsNumber, 1, 50000);
    notify();
  });
  margin.addEventListener('input', () => {
    state.marginMm = clampNum(margin.valueAsNumber, 0, 1000);
    notify();
  });
  minorStep.addEventListener('input', () => {
    state.minorStepMm = clampNum(minorStep.valueAsNumber, 0.1, 1000);
    if (state.majorStepMm < state.minorStepMm) {
      state.majorStepMm = state.minorStepMm;
      majorStep.value = state.majorStepMm;
    }
    notify();
  });
  majorStep.addEventListener('input', () => {
    state.majorStepMm = clampNum(majorStep.valueAsNumber, state.minorStepMm, 5000);
    notify();
  });
  mmToPx.addEventListener('input', () => {
    state.mmToPx = clampNum(mmToPx.valueAsNumber, 0.1, 1000);
    notify();
  });
  helperColor.addEventListener('input', () => {
    state.helper.color = helperColor.value || '#666666';
    notify();
  });
  helperThickness.addEventListener('input', () => {
    state.helper.thickness = clampNum(helperThickness.valueAsNumber, 0.5, 50);
    notify();
  });

  exportBtn.addEventListener('click', exportState);
  exportImageBtn.addEventListener('click', exportCanvasAsImage);

  importBtn.addEventListener('click', () => {
    importFile.click();
  });

  importFile.addEventListener('change', (event) => {
    importState(event.target.files[0]);
    // Reset the file input so the 'change' event fires even if the same file is selected again
    event.target.value = '';
  });

  addInsigneBtn.addEventListener('click', async (event) => {
    const selectedOption = insigneSelect.options[insigneSelect.selectedIndex];
    const url = selectedOption.value;
    if (!url) return;

    const newInsigne = { url, x_mm: -999, y_mm: -999 };
    
    // Check for explicit size from the data attribute first
    const sizeMm = selectedOption.dataset.sizeMm;

    if (sizeMm) {
      newInsigne.height_mm = parseInt(sizeMm, 10);
    } else if (url.includes('/petit/') || url.includes('/min/')) {
      newInsigne.height_mm = 10;
    } else if (url.includes('/grand/') || url.includes('/maj/')) {
      newInsigne.height_mm = 18;
    } else {
      // Fallback for items with no defined size
      newInsigne.heightPct = 0.5;
    }

    await addImage(newInsigne);
    const img = getCachedImage(url);
    if (!img) return;

    const natAspect = img.naturalWidth / img.naturalHeight;
    let h_mm;
    if (newInsigne.height_mm) {
      h_mm = newInsigne.height_mm;
    } else {
      h_mm = (newInsigne.heightPct || 0.5) * state.gridHmm;
    }
    const w_mm = h_mm * natAspect;

    state.selectedInsigne = newInsigne;
    state.isDragging = true;
    state.dragOffsetX = w_mm / 2;
    state.dragOffsetY = h_mm / 2;

    notify();
  });

  addMaterialBtn.addEventListener('click', () => {
      state.materials.push({
          x_mm: materialX.valueAsNumber,
          y_mm: materialY.valueAsNumber,
          width_mm: materialWidth.valueAsNumber,
          height_mm: materialHeight.valueAsNumber,
          material: materialType.value,
          color: materialColor.value
      });
      notify();
  });

  insigneX.addEventListener('input', () => {
    if (state.selectedInsigne) {
      state.selectedInsigne.x_mm = insigneX.valueAsNumber;
      notify();
    }
  });

  insigneY.addEventListener('input', () => {
    if (state.selectedInsigne) {
      state.selectedInsigne.y_mm = insigneY.valueAsNumber;
      notify();
    }
  });

  insigneHeight.addEventListener('input', () => {
    if (state.selectedInsigne && !insigneHeight.disabled) {
      state.selectedInsigne.heightPct = insigneHeight.valueAsNumber / 100;
      notify();
    }
  });

  removeInsigneBtn.addEventListener('click', () => {
    if (state.selectedInsigne) {
      state.images = state.images.filter(img => img !== state.selectedInsigne);
      state.selectedInsigne = null;
      notify();
    }
  });

  selectedMaterialX.addEventListener('input', () => {
    if (state.selectedMaterial) {
      state.selectedMaterial.x_mm = selectedMaterialX.valueAsNumber;
      notify();
    }
  });

  selectedMaterialY.addEventListener('input', () => {
    if (state.selectedMaterial) {
      state.selectedMaterial.y_mm = selectedMaterialY.valueAsNumber;
      notify();
    }
  });

  selectedMaterialWidth.addEventListener('input', () => {
    if (state.selectedMaterial) {
      state.selectedMaterial.width_mm = selectedMaterialWidth.valueAsNumber;
      notify();
    }
  });

  selectedMaterialHeight.addEventListener('input', () => {
    if (state.selectedMaterial) {
      state.selectedMaterial.height_mm = selectedMaterialHeight.valueAsNumber;
      notify();
    }
  });
  
  removeMaterialBtn.addEventListener('click', () => {
    if (state.selectedMaterial) {
      state.materials = state.materials.filter(m => m !== state.selectedMaterial);
      state.selectedMaterial = null;
      notify();
    }
  });

    addMoivreBtn.addEventListener('click', () => {
    state.moivres.push({
        x_mm: 50, // Default starting X position
        y_mm: 0,
        width_mm: 5, // Default width
        height_mm: state.gridHmm,
        color: moivreColor.value,
    });
    notify();
  });


  subscribe(updateInsigneControls);
  subscribe(updateMaterialControls);

  function updateInsigneControls() {
    if (state.selectedInsigne) {
      insigneControls.style.display = 'flex';
      insigneX.value = state.selectedInsigne.x_mm;
      insigneY.value = state.selectedInsigne.y_mm;

      if (state.selectedInsigne.height_mm) {
        const heightInPct = (state.selectedInsigne.height_mm / state.gridHmm) * 100;
        insigneHeight.value = heightInPct.toFixed(2);
        insigneHeight.disabled = true;
      } else if (state.selectedInsigne.heightPct) {
        insigneHeight.value = state.selectedInsigne.heightPct * 100;
        insigneHeight.disabled = false;
      }
    } else {
      insigneControls.style.display = 'none';
    }
  }

  function updateMaterialControls() {
    if (state.selectedMaterial) {
      materialControls.style.display = 'flex';
      selectedMaterialX.value = state.selectedMaterial.x_mm;
      selectedMaterialY.value = state.selectedMaterial.y_mm;
      selectedMaterialWidth.value = state.selectedMaterial.width_mm;
      selectedMaterialHeight.value = state.selectedMaterial.height_mm;
    } else {
      materialControls.style.display = 'none';
    }
  }
}

function clampNum(v, min, max) {
  if (!Number.isFinite(v)) return min;
  return Math.max(min, Math.min(max, v));
}