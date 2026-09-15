import { state } from './state.js';
import { draw } from './renderer.js';
import { designFilename, downloadBlob } from './utils.js';
import { canExport, maxExportWidthMm } from './validation.js';
import { showError } from './messages.js';

const EXPORT_DPI = 300;

export function exportCanvasAsImage() {
    const totalW_mm = state.gridWmm;
    const totalH_mm = state.gridHmm;

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

    exportCanvas.toBlob((blob) => {
        if (!blob) {
            console.error("Canvas encoding returned no blob during PNG export.");
            showError("L'image n'a pas pu être générée. Réessayez, ou réduisez la taille du circulaire.");
            return;
        }

        downloadBlob(blob, designFilename(state.discipline, 'png'));

        exportCanvas.width = 0;
        exportCanvas.height = 0;
    }, 'image/png');
}
