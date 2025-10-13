import { state, notify } from './state.js';
import { getCachedImage } from './main.js';

export function initDragAndDrop(canvas) {

    function getGridCoordsFromEvent(event) {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        const totalCssW = (state.gridWmm + 2 * state.marginMm) * state.mmToPx;
        const scaleCss = Math.min(
            window.innerWidth / totalCssW,
            window.innerHeight / ((state.gridHmm + 2 * state.marginMm) * state.mmToPx)
        );
        
        const canvasX = x / scaleCss;
        const canvasY = y / scaleCss;

        const originX = state.marginMm * state.mmToPx;
        const originY = state.marginMm * state.mmToPx;

        const gridX = (canvasX - originX) / state.mmToPx;
        const gridY = (canvasY - originY) / state.mmToPx;

        return { gridX, gridY };
    }

    canvas.addEventListener('mousedown', (event) => {
        const { gridX, gridY } = getGridCoordsFromEvent(event);

        // First, check for material click
        let clickedMaterial = null;
        // Loop backwards to prioritize top-most materials
        for (let i = state.materials.length - 1; i >= 0; i--) {
            const material = state.materials[i];
            if (gridX >= material.x_mm && gridX <= material.x_mm + material.width_mm &&
                gridY >= material.y_mm && gridY <= material.y_mm + material.height_mm) {
                clickedMaterial = material;
                break;
            }
        }

        if (clickedMaterial) {
            state.selectedMaterial = clickedMaterial;
            state.isDraggingMaterial = true;
            state.dragMaterialOffsetX = gridX - clickedMaterial.x_mm;
            state.dragMaterialOffsetY = gridY - clickedMaterial.y_mm;

            // Deselect any selected insigne
            state.selectedInsigne = null;
            state.isDragging = false;
            
            notify();
            return; // Stop further checks
        }

        // If no material was clicked, check for insigne click
        let clickedInsigne = null;
        let insigneIndex = -1;
        for (let i = state.images.length - 1; i >= 0; i--) {
            const insigne = state.images[i];
            const img = getCachedImage(insigne.url);
            if (!img) continue;

            const natAspect = img.naturalWidth / img.naturalHeight;
            
            let h_mm;
            if (insigne.height_mm) {
                h_mm = insigne.height_mm;
            } else if (insigne.heightPct) {
                h_mm = insigne.heightPct * state.gridHmm;
            } else {
                continue; 
            }
            
            const w_mm = h_mm * natAspect;
            
            const left_mm = insigne.x_mm;
            const top_mm = insigne.y_mm;

            if (gridX >= left_mm && gridX <= left_mm + w_mm && gridY >= top_mm && gridY <= top_mm + h_mm) {
                clickedInsigne = insigne;
                insigneIndex = i;
                break;
            }
        }

        if (clickedInsigne) {
            state.selectedInsigne = clickedInsigne;
            state.isDragging = true;
            state.dragOffsetX = gridX - clickedInsigne.x_mm;
            state.dragOffsetY = gridY - clickedInsigne.y_mm;

            // Bring to front for rendering and selection priority
            if (insigneIndex < state.images.length - 1) {
                const [item] = state.images.splice(insigneIndex, 1);
                state.images.push(item);
            }
            
            // Deselect any selected material
            state.selectedMaterial = null;
            state.isDraggingMaterial = false;

        } else {
            // Clicked on empty space
            state.selectedInsigne = null;
            state.selectedMaterial = null;
        }

        notify();
    });

    window.addEventListener('mousemove', (event) => {
        // Handle material dragging
        if (state.isDraggingMaterial && state.selectedMaterial) {
            event.preventDefault();
            const { gridX, gridY } = getGridCoordsFromEvent(event);
            state.selectedMaterial.x_mm = gridX - state.dragMaterialOffsetX;
            state.selectedMaterial.y_mm = gridY - state.dragMaterialOffsetY;
            notify();
            return;
        }

        // Handle insigne dragging
        if (state.isDragging && state.selectedInsigne) {
            event.preventDefault();
            const { gridX, gridY } = getGridCoordsFromEvent(event);
            state.selectedInsigne.x_mm = gridX - state.dragOffsetX;
            state.selectedInsigne.y_mm = gridY - state.dragOffsetY;
            notify();
        }
    });

    window.addEventListener('mouseup', () => {
        if (state.isDragging) {
            state.isDragging = false;
        }
        if (state.isDraggingMaterial) {
            state.isDraggingMaterial = false;
        }
    });
}