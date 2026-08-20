import { state } from './state.js';
import { draw } from './renderer.js';
import { designFilename, downloadUrl } from './utils.js';
import { canExport, maxExportWidthMm } from './validation.js';

const EXPORT_DPI = 300;

export function exportCanvasAsImage() {
    const totalW_mm = state.gridWmm;
    const totalH_mm = state.gridHmm;

    // Past the browser's canvas ceiling the allocation fails without throwing:
    // the context is blank and toDataURL() hands back the string "data:,", so
    // the user gets a zero-byte download and no explanation. Refuse first, and
    // name the width that would actually work.
    if (!canExport(totalW_mm, totalH_mm, EXPORT_DPI)) {
        const limit = maxExportWidthMm(totalH_mm, EXPORT_DPI);
        // Issue #16 moves this onto the shared modal; alert() is what the rest
        // of the app still uses for an actionable failure.
        alert(
            `Le circulaire est trop grand pour être exporté en image à ${EXPORT_DPI} DPI.\n` +
            `Avec une hauteur de ${totalH_mm} mm, la largeur maximale est de ${limit} mm.`
        );
        return;
    }

    const exportCanvas = document.createElement('canvas');
    const pxPerMm = EXPORT_DPI / 25.4;

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
