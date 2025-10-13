import { state } from './state.js';
import { draw } from './renderer.js';

// --- Helper Functions from file-handler.js ---
function sanitizeString(str) {
    if (!str) return '';
    return str.normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/['\s\W]/g, '')
              .toLowerCase();
}

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


export function exportCanvasAsImage() {
    // --- 1. Create a temporary, off-screen canvas ---
    const exportCanvas = document.createElement('canvas');
    
    // --- 2. Calculate high-resolution dimensions (300 DPI) ---
    const dpi = 300;
    const pxPerMm = dpi / 25.4; // 25.4 mm in an inch
    
    const totalW_mm = state.gridWmm + 2 * state.marginMm;
    const totalH_mm = state.gridHmm + 2 * state.marginMm;

    exportCanvas.width = Math.round(totalW_mm * pxPerMm);
    exportCanvas.height = Math.round(totalH_mm * pxPerMm);
    
    const exportCtx = exportCanvas.getContext('2d');

    // --- 3. Create a temporary state for clean rendering ---
    // This removes selection borders from the exported image
    const exportState = {
        ...state,
        mmToPx: pxPerMm, // Use the high-res pixel ratio for this render
        selectedInsigne: null,
        selectedMaterial: null,
    };

    // --- 4. Draw the current state onto the high-res canvas ---
    // We pass 'false' for devicePixelRatio since we're not scaling to a screen
    draw(exportCanvas, exportCtx, exportState, false);

    // --- 5. Trigger the download ---
    const disciplineSelect = document.getElementById('disciplineSelect');
    const discipline = sanitizeString(disciplineSelect.value) || 'design';
    const timestamp = getTimestamp();
    const filename = `fal-design-${discipline}-${timestamp}.png`;

    const dataUrl = exportCanvas.toDataURL('image/png');
    
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}