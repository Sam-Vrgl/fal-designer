import { state } from './state.js';
import { draw } from './renderer.js';

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
    const exportCanvas = document.createElement('canvas');
    const dpi = 300;
    const pxPerMm = dpi / 25.4;

    const totalW_mm = state.gridWmm;
    const totalH_mm = state.gridHmm;

    exportCanvas.width = Math.round(totalW_mm * pxPerMm);
    exportCanvas.height = Math.round(totalH_mm * pxPerMm);

    const exportCtx = exportCanvas.getContext('2d');

    const exportState = {
        ...state,
        mmToPx: pxPerMm,
        viewScale: 1.0,
        viewOffsetX: -state.marginMm * pxPerMm,
        viewOffsetY: -state.marginMm * pxPerMm,
        selectedInsigne: null,
        selectedMaterial: null,
        selectedMoivre: null,
    };

    draw(exportCanvas, exportCtx, exportState, false);

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