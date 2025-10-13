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

        // --- Check for Moivre click ---
        let clickedMoivre = null;
        const angleRad = 15 * Math.PI / 180;
        const cosAngle = Math.cos(-angleRad); // Use negative angle to un-rotate
        const sinAngle = Math.sin(-angleRad);

        for (let i = state.moivres.length - 1; i >= 0; i--) {
            const moivre = state.moivres[i];
            const centerX = moivre.x_mm + moivre.width_mm / 2;
            const centerY = moivre.y_mm + moivre.height_mm / 2;

            // Translate click point to be relative to the moivre's center
            const translatedX = gridX - centerX;
            const translatedY = gridY - centerY;
            
            // Un-rotate the click point
            const unrotatedX = translatedX * cosAngle - translatedY * sinAngle;
            const unrotatedY = translatedX * sinAngle + translatedY * cosAngle;

            // Check if the un-rotated point is within the moivre's bounds
            if (Math.abs(unrotatedX) < moivre.width_mm / 2 && Math.abs(unrotatedY) < moivre.height_mm / 2) {
                clickedMoivre = moivre;
                break;
            }
        }
        
        if (clickedMoivre) {
            state.selectedMoivre = clickedMoivre;
            state.isDraggingMoivre = true;
            state.dragMoivreOffsetX = gridX - clickedMoivre.x_mm;
            
            state.selectedInsigne = null;
            state.selectedMaterial = null;
            notify();
            return;
        }

        // --- Check for Material click ---
        let clickedMaterial = null;
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

            state.selectedInsigne = null;
            state.selectedMoivre = null;
            notify();
            return;
        }

        // --- Check for Insigne click ---
        let clickedInsigne = null;
        let insigneIndex = -1;
        // ... (rest of insigne click detection is the same)
        
        if (clickedInsigne) {
            state.selectedInsigne = clickedInsigne;
            // ...
            state.selectedMaterial = null;
            state.selectedMoivre = null;
        } else {
            // Clicked on empty space
            state.selectedInsigne = null;
            state.selectedMaterial = null;
            state.selectedMoivre = null;
        }

        notify();
    });

    window.addEventListener('mousemove', (event) => {
        const { gridX } = getGridCoordsFromEvent(event);

        // Handle Moivre dragging (horizontal only)
        if (state.isDraggingMoivre && state.selectedMoivre) {
            event.preventDefault();
            state.selectedMoivre.x_mm = gridX - state.dragMoivreOffsetX;
            notify();
            return;
        }

        // Handle Material dragging
        if (state.isDraggingMaterial && state.selectedMaterial) {
            event.preventDefault();
            const { gridX, gridY } = getGridCoordsFromEvent(event); // Need Y for material
            state.selectedMaterial.x_mm = gridX - state.dragMaterialOffsetX;
            state.selectedMaterial.y_mm = gridY - state.dragMaterialOffsetY;
            notify();
            return;
        }

        // Handle Insigne dragging
        if (state.isDragging && state.selectedInsigne) {
            event.preventDefault();
            const { gridX, gridY } = getGridCoordsFromEvent(event); // Need Y for insigne
            state.selectedInsigne.x_mm = gridX - state.dragOffsetX;
            state.selectedInsigne.y_mm = gridY - state.dragOffsetY;
            notify();
        }
    });

    window.addEventListener('mouseup', () => {
        if (state.isDragging) state.isDragging = false;
        if (state.isDraggingMaterial) state.isDraggingMaterial = false;
        if (state.isDraggingMoivre) state.isDraggingMoivre = false;
    });
}