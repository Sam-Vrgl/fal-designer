import { state, notify } from './state.js';
import { getCachedImage, addImage } from './main.js';

const SNAP_THRESHOLD_MM = 5;

export function initDragAndDrop(canvas) {
    const container = canvas.parentElement;

    function getGridCoordsFromEvent(event) {
        const rect = container.getBoundingClientRect();
        const screenX = event.clientX - rect.left;
        const screenY = event.clientY - rect.top;

        const worldX = (screenX - state.viewOffsetX) / state.viewScale;
        const worldY = (screenY - state.viewOffsetY) / state.viewScale;

        const gridX = (worldX / state.mmToPx) - state.marginMm;
        const gridY = (worldY / state.mmToPx) - state.marginMm;

        return { gridX, gridY };
    }
    
    canvas.addEventListener('mousedown', (event) => {
        const { gridX, gridY } = getGridCoordsFromEvent(event);

        // PLACE MODE
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
                notify();
            });

            state.currentMode = 'select';
            state.insigneToPlace = null;
            notify();
            return;
        }

        // SELECT MODE
        if (state.currentMode === 'select') {
            let clickedItem = false;
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
                    state.selectedMaterial = state.selectedMoivre = null;
                    clickedItem = true;
                    break;
                }
            }
            if(clickedItem) { notify(); return; }

            for (let i = state.materials.length - 1; i >= 0; i--) {
                const m = state.materials[i];
                if (gridX >= m.x_mm && gridX <= m.x_mm + m.width_mm && gridY >= m.y_mm && gridY <= m.y_mm + m.height_mm) {
                    state.selectedMaterial = m;
                    state.isDraggingMaterial = true;
                    state.dragMaterialOffsetX = gridX - m.x_mm;
                    state.dragMaterialOffsetY = gridY - m.y_mm;
                    state.selectedInsigne = state.selectedMoivre = null;
                    clickedItem = true;
                    break;
                }
            }
            if(clickedItem) { notify(); return; }
            
            state.selectedInsigne = state.selectedMaterial = state.selectedMoivre = null;
            notify();
        }
    });

    window.addEventListener('mousemove', (event) => {
        const { gridX, gridY } = getGridCoordsFromEvent(event);
        if (state.isDragging && state.selectedInsigne) {
            event.preventDefault();
            state.selectedInsigne.x_mm = gridX - state.dragOffsetX;
            const img = getCachedImage(state.selectedInsigne.url);
            if (!img) return;
            const h_mm = state.selectedInsigne.height_mm || (state.selectedInsigne.heightPct * state.gridHmm);
            const insigneCenterY = (gridY - state.dragOffsetY) + h_mm / 2;
            const gridCenterY = state.gridHmm / 2;
            if (Math.abs(insigneCenterY - gridCenterY) < SNAP_THRESHOLD_MM) {
                state.selectedInsigne.y_mm = gridCenterY - h_mm / 2;
                state.isSnapping = true;
            } else {
                state.selectedInsigne.y_mm = gridY - state.dragOffsetY;
                state.isSnapping = false;
            }
            notify();
        } else if (state.isDraggingMaterial && state.selectedMaterial) {
            event.preventDefault();
            state.selectedMaterial.x_mm = gridX - state.dragMaterialOffsetX;
            state.selectedMaterial.y_mm = gridY - state.dragMaterialOffsetY;
            notify();
        }
    });

    window.addEventListener('mouseup', () => {
        state.isDragging = false;
        state.isDraggingMaterial = false;
        state.isDraggingMoivre = false;
        if (state.isSnapping) {
            state.isSnapping = false;
            notify();
        }
    });
    
    container.addEventListener('contextmenu', e => e.preventDefault());

    container.addEventListener('wheel', (event) => {
        event.preventDefault();

        // CTRL/CMD + Scroll to Zoom
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

        // Shift + Scroll to Pan Horizontally
        } else if (event.shiftKey) {
            const scrollSpeed = 1.0;
            state.viewOffsetX -= event.deltaY * scrollSpeed;
        
        // Default Scroll to Pan Vertically
        } else {
            const scrollSpeed = 1.0;
            state.viewOffsetY -= event.deltaY * scrollSpeed;
        }

        notify();
    }, { passive: false }); // passive: false is important to allow preventDefault
}