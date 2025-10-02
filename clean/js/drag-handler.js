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

        let clickedInsigne = null;
        let insigneIndex = -1;
        for (let i = state.images.length - 1; i >= 0; i--) {
            const insigne = state.images[i];
            const img = getCachedImage(insigne.url);
            if (!img) continue;

            const natAspect = img.naturalWidth / img.naturalHeight;
            const h_mm = insigne.heightPct * state.gridHmm;
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

            if (insigneIndex < state.images.length - 1) {
                const [item] = state.images.splice(insigneIndex, 1);
                state.images.push(item);
            }

        } else {
            state.selectedInsigne = null;
        }

        notify();
    });

    window.addEventListener('mousemove', (event) => {
        if (!state.isDragging || !state.selectedInsigne) {
            return;
        }
        event.preventDefault();

        const { gridX, gridY } = getGridCoordsFromEvent(event);

        state.selectedInsigne.x_mm = gridX - state.dragOffsetX;
        state.selectedInsigne.y_mm = gridY - state.dragOffsetY;

        notify();
    });

    window.addEventListener('mouseup', () => {
        if (state.isDragging) {
            state.isDragging = false;
        }
    });
}