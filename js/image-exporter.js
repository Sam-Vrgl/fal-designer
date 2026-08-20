import { state } from './state.js';
import { draw } from './renderer.js';
import { designFilename, downloadBlob } from './utils.js';
import { canExport, maxExportWidthMm } from './validation.js';
import { showError } from './messages.js';

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
        showError(
            `Le circulaire est trop grand pour être exporté en image à ${EXPORT_DPI} DPI. ` +
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

    // toBlob rather than toDataURL: the latter encodes synchronously and then
    // base64-inflates the result by a third into a single JS string, several
    // megabytes for a full-width ribbon. Mobile Safari also handles very large
    // data: URLs on <a download> unreliably, which is the case that matters —
    // the phone is where this tool is mostly used.
    exportCanvas.toBlob((blob) => {
        if (!blob) {
            console.error("Canvas encoding returned no blob during PNG export.");
            showError("L'image n'a pas pu être générée. Réessayez, ou réduisez la taille du circulaire.");
            return;
        }

        downloadBlob(blob, designFilename(state.discipline, 'png'));

        // Release the backing store now rather than waiting for the collector.
        // At 300 DPI this is tens of megabytes that nothing refers to again.
        exportCanvas.width = 0;
        exportCanvas.height = 0;
    }, 'image/png');
}
