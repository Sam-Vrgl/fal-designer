import { state, notify, recordStateForUndo } from './state.js';
import { getCachedImage, addImage } from './main.js';

const SNAP_THRESHOLD_MM = 5;
const MOIVRE_ROTATION_DEG = 15;
const MOIVRE_ROTATION_RAD = MOIVRE_ROTATION_DEG * Math.PI / 180;


function getTouchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

function getMidpoint(touches) {
    return {
        x: (touches[0].clientX + touches[1].clientX) / 2,
        y: (touches[0].clientY + touches[1].clientY) / 2,
    };
}

export function initTouchControls(canvas) {
    const container = canvas.parentElement;
    let panStartX, panStartY;
    let lastTouchDistance = null;
    let didMove = false;

    function getGridCoordsFromEvent(event, relativeToGrid = true) {
        const rect = container.getBoundingClientRect();
        const touch = event.touches[0];
        const screenX = touch.clientX - rect.left;
        const screenY = touch.clientY - rect.top;

        const worldX = (screenX - state.viewOffsetX) / state.viewScale;
        const worldY = (screenY - state.viewOffsetY) / state.viewScale;

        if (!relativeToGrid) {
            return { worldX: worldX / state.mmToPx, worldY: worldY / state.mmToPx };
        }

        const gridX = (worldX / state.mmToPx) - state.marginMm;
        const gridY = (worldY / state.mmToPx) - state.marginMm;

        return { gridX, gridY };
    }

    container.addEventListener('touchstart', (event) => {
        if (event.target === canvas) {
            event.preventDefault();
        }

        didMove = false;

        if (event.touches.length >= 2) {
            state.isPanning = false;
            state.isDragging = false;
            lastTouchDistance = getTouchDistance(event.touches);
        } else if (event.touches.length === 1) {
            const { gridX, gridY } = getGridCoordsFromEvent(event);

            if (state.currentMode === 'place' && state.insigneToPlace) {
                const { path, sizeMm, url } = state.insigneToPlace;
                const newInsigne = { url: path, x_mm: 0, y_mm: 0 };
                
                if (sizeMm) newInsigne.height_mm = parseInt(sizeMm, 10);
                else if (url.includes('/petit/') || url.includes('/min/')) newInsigne.height_mm = 10;
                else if (url.includes('/grand/') || url.includes('/maj/')) newInsigne.height_mm = 18;
                else newInsigne.heightPct = 0.5;
                
                addImage(newInsigne).then(() => {
                    const img = getCachedImage(newInsigne.url);
                    if (!img) return;
                    const natAspect = img.naturalWidth / img.naturalHeight;
                    let h_mm = newInsigne.height_mm || (newInsigne.heightPct * state.gridHmm);
                    const w_mm = h_mm * natAspect;
                    newInsigne.x_mm = gridX - w_mm / 2;
                    newInsigne.y_mm = gridY - h_mm / 2;
                    recordStateForUndo();
                    notify();
                });

                state.currentMode = 'select';
                state.insigneToPlace = null;
                notify();
                return;
            }

            let clickedItem = false;
            state.selectedInsigne = state.selectedMaterial = state.selectedMoivre = null;

            for (let i = state.images.length - 1; i >= 0; i--) {
                const insigne = state.images[i];
                const img = getCachedImage(insigne.url);
                if (!img) continue;
                const h_mm = insigne.height_mm || (insigne.heightPct * state.gridHmm);
                const w_mm = h_mm * (img.naturalWidth / img.naturalHeight);
                if (gridX >= insigne.x_mm && gridX <= insigne.x_mm + w_mm && gridY >= insigne.y_mm && gridY <= insigne.y_mm + h_mm) {
                    state.selectedInsigne = insigne;
                    state.isDragging = true;
                    state.dragOffsetX = gridX - insigne.x_mm;
                    state.dragOffsetY = gridY - insigne.y_mm;
                    clickedItem = true;
                    break;
                }
            }

            if (!clickedItem) {
                for (let i = state.materials.length - 1; i >= 0; i--) {
                    const m = state.materials[i];
                    if (gridX >= m.x_mm && gridX <= m.x_mm + m.width_mm && gridY >= m.y_mm && gridY <= m.y_mm + m.height_mm) {
                        state.selectedMaterial = m;
                        state.isDraggingMaterial = true;
                        state.dragMaterialOffsetX = gridX - m.x_mm;
                        state.dragMaterialOffsetY = gridY - m.y_mm;
                        clickedItem = true;
                        break;
                    }
                }
            }
            
            // **FIX STARTS HERE: Moivre selection logic**
            if (!clickedItem) {
                for (let i = state.moivres.length - 1; i >= 0; i--) {
                    const m = state.moivres[i];
                    const centerX = m.x_mm + m.width_mm / 2;
                    const centerY = m.y_mm + m.height_mm / 2;

                    const dx = gridX - centerX;
                    const dy = gridY - centerY;
                    const rotatedX = dx * Math.cos(-MOIVRE_ROTATION_RAD) - dy * Math.sin(-MOIVRE_ROTATION_RAD);
                    const rotatedY = dx * Math.sin(-MOIVRE_ROTATION_RAD) + dy * Math.cos(-MOIVRE_ROTATION_RAD);

                    if (Math.abs(rotatedX) < m.width_mm / 2 && Math.abs(rotatedY) < m.height_mm / 2) {
                        state.selectedMoivre = m;
                        state.isDraggingMoivre = true;
                        state.dragMoivreOffsetX = gridX - m.x_mm;
                        clickedItem = true;
                        break;
                    }
                }
            }
            // **FIX ENDS HERE**
            
            if (!clickedItem) {
                state.isPanning = true;
                panStartX = state.viewOffsetX - event.touches[0].clientX;
                panStartY = state.viewOffsetY - event.touches[0].clientY;
            }
            notify();
        }
    }, { passive: false });

    container.addEventListener('touchmove', (event) => {
        event.preventDefault();
        didMove = true;

        if (event.touches.length >= 2) {
            const newTouchDistance = getTouchDistance(event.touches);
            const zoomFactor = newTouchDistance / lastTouchDistance;
            lastTouchDistance = newTouchDistance;
            const midpoint = getMidpoint(event.touches);
            state.viewOffsetX -= (midpoint.x - state.viewOffsetX) * (zoomFactor - 1);
            state.viewOffsetY -= (midpoint.y - state.viewOffsetY) * (zoomFactor - 1);
            state.viewScale *= zoomFactor;
        } else if (state.isDragging && state.selectedInsigne) {
            const { gridX, gridY } = getGridCoordsFromEvent(event);
            state.selectedInsigne.x_mm = gridX - state.dragOffsetX;
            const h_mm = state.selectedInsigne.height_mm || (state.selectedInsigne.heightPct * state.gridHmm);
            const insigneCenterY = (gridY - state.dragOffsetY) + h_mm / 2;
            const gridCenterY = state.gridHmm / 2;
            if (state.snapEnabled && Math.abs(insigneCenterY - gridCenterY) < SNAP_THRESHOLD_MM) {
                state.selectedInsigne.y_mm = gridCenterY - h_mm / 2;
                state.isSnapping = true;
            } else {
                state.selectedInsigne.y_mm = gridY - state.dragOffsetY;
                state.isSnapping = false;
            }
        // **FIX STARTS HERE: Material snapping logic**
        } else if (state.isDraggingMaterial && state.selectedMaterial) {
            const { gridX, gridY } = getGridCoordsFromEvent(event);
            let newX = gridX - state.dragMaterialOffsetX;
            let newY = gridY - state.dragMaterialOffsetY;

            if (state.snapEnabled) {
                const totalHeight = state.selectedMaterial.height_mm;
                if (Math.abs(totalHeight - state.gridHmm) < 1) { // Full height
                    newY = 0;
                } else {
                    const top = newY;
                    const bottom = newY + totalHeight;
                    const middle = newY + totalHeight / 2;

                    const snapTargets = [0, state.gridHmm / 2, state.gridHmm];
                    let snapped = false;
                    for (const target of snapTargets) {
                        if (Math.abs(top - target) < SNAP_THRESHOLD_MM) { newY = target; snapped = true; break; }
                        if (Math.abs(bottom - target) < SNAP_THRESHOLD_MM) { newY = target - totalHeight; snapped = true; break; }
                        if (Math.abs(middle - target) < SNAP_THRESHOLD_MM) { newY = target - totalHeight / 2; snapped = true; break; }
                    }
                    state.isSnapping = snapped;
                }
            } else {
                state.isSnapping = false;
            }
            state.selectedMaterial.x_mm = newX;
            state.selectedMaterial.y_mm = newY;
        // **FIX ENDS HERE**
        } else if (state.isDraggingMoivre && state.selectedMoivre) {
            const { gridX } = getGridCoordsFromEvent(event);
            state.selectedMoivre.x_mm = gridX - state.dragMoivreOffsetX;
        } else if (state.isPanning) {
            state.viewOffsetX = event.touches[0].clientX + panStartX;
            state.viewOffsetY = event.touches[0].clientY + panStartY;
        }
        notify();
    }, { passive: false });

    container.addEventListener('touchend', () => {
        if (didMove && (state.isDragging || state.isDraggingMaterial || state.isDraggingMoivre)) {
            recordStateForUndo();
        }
        state.isPanning = false;
        state.isDragging = false;
        state.isDraggingMaterial = false;
        state.isDraggingMoivre = false;
        state.isSnapping = false;
        lastTouchDistance = null;
        notify();
    });
}