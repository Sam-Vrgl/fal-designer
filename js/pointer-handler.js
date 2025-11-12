// js/pointer-handler.js

import { state, notify, recordStateForUndo } from './state.js';
// This line is now fixed:
import { getCachedImage, addImageToState } from './image-service.js';

const SNAP_THRESHOLD_MM = 5;
const MOIVRE_ROTATION_DEG = 15;
const MOIVRE_ROTATION_RAD = MOIVRE_ROTATION_DEG * Math.PI / 180;

let panStartX, panStartY, didDrag = false;

function getPointer(event) {
    return event.touches ? event.touches[0] : event;
}

function getGridCoordsFromEvent(event, container, relativeToGrid = true) {
    const pointer = getPointer(event);
    if (!pointer) return { gridX: 0, gridY: 0 };

    const rect = container.getBoundingClientRect();
    const screenX = pointer.clientX - rect.left;
    const screenY = pointer.clientY - rect.top;

    const worldX = (screenX - state.viewOffsetX) / state.viewScale;
    const worldY = (screenY - state.viewOffsetY) / state.viewScale;

    if (!relativeToGrid) {
        return { worldX: worldX / state.mmToPx, worldY: worldY / state.mmToPx };
    }

    const gridX = (worldX / state.mmToPx) - state.marginMm;
    const gridY = (worldY / state.mmToPx) - state.marginMm;

    return { gridX, gridY };
}

export function handlePointerDown(event, container) {
    didDrag = false;
    const { gridX, gridY } = getGridCoordsFromEvent(event, container);

    if (state.currentMode === 'place' && state.insigneToPlace) {
        const { path, sizeMm, heightPct, url, sessionOnly } = state.insigneToPlace;
        const newInsigne = { url: path, x_mm: 0, y_mm: 0 };
        if (sessionOnly) newInsigne.sessionOnly = true;

        if (sizeMm) newInsigne.height_mm = parseInt(sizeMm, 10);
        else if (typeof heightPct === 'number' && !Number.isNaN(heightPct)) newInsigne.heightPct = heightPct;
        else if (url.includes('/petit/') || url.includes('/min/')) newInsigne.height_mm = 10;
        else if (url.includes('/grand/') || url.includes('/maj/')) newInsigne.height_mm = 18;
        else newInsigne.heightPct = 0.5;
        
        // This function call is correct
        addImageToState(newInsigne).then(() => {
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

    if (state.currentMode === 'select') {
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

        if (clickedItem) {
            notify();
            return;
        }
    }

    // If we're here, no item was clicked. Start a pan.
    const pointer = getPointer(event);
    state.isPanning = true;
    panStartX = state.viewOffsetX - pointer.clientX;
    panStartY = state.viewOffsetY - pointer.clientY;
    state.selectedInsigne = state.selectedMaterial = state.selectedMoivre = null;
    notify();
}

export function handlePointerMove(event, container) {
    if (state.isPanning) {
        event.preventDefault();
        const pointer = getPointer(event);
        state.viewOffsetX = pointer.clientX + panStartX;
        state.viewOffsetY = pointer.clientY + panStartY;
        didDrag = true;
        notify();
        return;
    }

    const { gridX, gridY } = getGridCoordsFromEvent(event, container);
    
    if (state.isDragging && state.selectedInsigne) {
        event.preventDefault();
        didDrag = true;
        state.selectedInsigne.x_mm = gridX - state.dragOffsetX;
        
        const img = getCachedImage(state.selectedInsigne.url);
        if (!img) return;
        
        const h_mm = state.selectedInsigne.height_mm || (state.selectedInsigne.heightPct * state.gridHmm);
        const insigneCenterY = (gridY - state.dragOffsetY) + h_mm / 2;
        const gridCenterY = state.gridHmm / 2;
        
        const snapDisabled = event.shiftKey;
        if (state.snapEnabled && !snapDisabled && Math.abs(insigneCenterY - gridCenterY) < SNAP_THRESHOLD_MM) {
            state.selectedInsigne.y_mm = gridCenterY - h_mm / 2;
            state.isSnapping = true;
        } else {
            state.selectedInsigne.y_mm = gridY - state.dragOffsetY;
            state.isSnapping = false;
        }
        notify();

    } else if (state.isDraggingMaterial && state.selectedMaterial) {
        event.preventDefault();
        didDrag = true;
        let newX = gridX - state.dragMaterialOffsetX;
        let newY = gridY - state.dragMaterialOffsetY;

        let group = [state.selectedMaterial];
        if (state.selectedMaterial.groupId) {
            group = state.materials.filter(m => m.groupId === state.selectedMaterial.groupId);
        }

        const totalHeight = group.reduce((sum, m) => sum + m.height_mm, 0);
        const snapDisabled = event.shiftKey;

        if (state.snapEnabled && !snapDisabled) {
            if (Math.abs(totalHeight - state.gridHmm) < 1) {
                newY = 0;
            } else {
                const top = newY, bottom = newY + totalHeight, middle = newY + totalHeight / 2;
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

        const deltaX = newX - state.selectedMaterial.x_mm;
        const deltaY = newY - state.selectedMaterial.y_mm;

        group.forEach(member => {
            member.x_mm += deltaX;
            member.y_mm += deltaY;
        });
        
        notify();

    } else if (state.isDraggingMoivre && state.selectedMoivre) {
        event.preventDefault();
        didDrag = true;
        state.selectedMoivre.x_mm = gridX - state.dragMoivreOffsetX;
        notify();
    }
}

export function handlePointerUp() {
    if (didDrag && (state.isDragging || state.isDraggingMaterial || state.isDraggingMoivre)) {
        recordStateForUndo();
    }
    state.isPanning = false;
    state.isDragging = false;
    state.isDraggingMaterial = false;
    state.isDraggingMoivre = false;
    if (state.isSnapping) {
        state.isSnapping = false;
        notify();
    }
}

export function handleWheel(event, container) {
    event.preventDefault();
    if (event.ctrlKey || event.metaKey) {
        const zoomIntensity = 0.1;
        const scroll = event.deltaY < 0 ? 1 : -1;
        const zoom = Math.exp(scroll * zoomIntensity);
        const rect = container.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        state.viewOffsetX = mouseX - (mouseX - state.viewOffsetX) * zoom;
        state.viewOffsetY = mouseY - (mouseY - state.viewOffsetY) * zoom;
        state.viewScale = Math.max(0.05, state.viewScale * zoom);
    } else if (event.shiftKey) {
        state.viewOffsetX -= event.deltaY * 1.0;
    } else {
        state.viewOffsetY -= event.deltaY * 1.0;
    }
    notify();
}