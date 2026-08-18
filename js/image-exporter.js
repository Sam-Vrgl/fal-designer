import { state } from './state.js';
import { draw } from './renderer.js';
import { designFilename, downloadUrl } from './utils.js';

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

    // Still toDataURL; issue #14 swaps this for toBlob, which also removes the
    // base64 inflation. Left alone here so this change stays a refactor.
    downloadUrl(exportCanvas.toDataURL('image/png'), designFilename(state.discipline, 'png'));
}
