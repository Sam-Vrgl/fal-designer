// js/renderer.js

import { getCachedImage } from './image-service.js';
import { createVelvetTexture, createSatinTexture } from './textures.js';

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

// The rectangle of the design, in millimetres, that the canvas is currently
// showing. Read back off the context rather than recomputed from the state, so
// it cannot disagree with the transform that was actually applied.
function visibleRangeMm(ctx, canvas) {
    const inverse = ctx.getTransform().inverse();
    const topLeft = inverse.transformPoint({ x: 0, y: 0 });
    const bottomRight = inverse.transformPoint({ x: canvas.width, y: canvas.height });

    return {
        left: Math.min(topLeft.x, bottomRight.x),
        right: Math.max(topLeft.x, bottomRight.x),
        top: Math.min(topLeft.y, bottomRight.y),
        bottom: Math.max(topLeft.y, bottomRight.y),
    };
}

// Assigning canvas.width or canvas.height throws away the entire backing store
// and resets every context property, even when the value written is identical.
// Doing that unconditionally meant a buffer reallocation on every pointer move,
// so only write when the size has genuinely changed.
export function syncCanvasSize(canvas) {
    const container = canvas.parentElement;
    if (!container || container.clientWidth === 0) return 0;

    const dpr = window.devicePixelRatio || 1;
    const width = Math.round(container.clientWidth * dpr);
    const height = Math.round(container.clientHeight * dpr);

    if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        canvas.style.width = `${container.clientWidth}px`;
        canvas.style.height = `${container.clientHeight}px`;
    }

    return dpr;
}

function setupCanvas(canvas, ctx, s, isLiveRender) {
    const dpr = isLiveRender ? syncCanvasSize(canvas) : 1;
    if (dpr === 0) return 0;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const scale = s.viewScale * s.mmToPx * dpr;
    const offsetX = s.viewOffsetX * dpr;
    const offsetY = s.viewOffsetY * dpr;
    ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);
    
    return dpr;
}

function drawBase(ctx, s, baseLineWidth) {
    const TOTAL_W_MM = s.gridWmm + 2 * s.marginMm;
    const TOTAL_H_MM = s.gridHmm + 2 * s.marginMm;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, TOTAL_W_MM, TOTAL_H_MM);
    
    ctx.strokeStyle = '#000';
    ctx.lineWidth = baseLineWidth;
    ctx.strokeRect(0, 0, TOTAL_W_MM, TOTAL_H_MM);
}

// Index range of grid lines at `step` that fall inside the viewport, given the
// lines run from `origin` for `length` millimetres. Clamped to the grid, so a
// viewport panned off the design does no work at all.
function visibleLineRange(origin, length, step, viewFrom, viewTo) {
    const last = Math.floor(length / step + 1e-9);
    const first = Math.floor((viewFrom - origin) / step);
    const beyond = Math.ceil((viewTo - origin) / step);

    return {
        first: Math.max(0, first),
        last: Math.min(last, beyond),
    };
}

function drawGrid(ctx, s, baseLineWidth, view) {
    const left = s.marginMm;
    const top = s.marginMm;
    const gridW = s.gridWmm;
    const gridH = s.gridHmm;

    ctx.strokeStyle = '#a0a0a0';
    ctx.lineWidth = baseLineWidth;
    ctx.strokeRect(left, top, gridW, gridH);

    // Only the lines the viewport can actually show. Zoomed in on a 700mm
    // ribbon the full grid is 740 segments in one path for perhaps a tenth of
    // that on screen, which made precision editing the slowest mode there is.
    const drawLines = (step, strokeStyle, lineWidth) => {
        ctx.beginPath();
        ctx.lineWidth = lineWidth;

        const cols = visibleLineRange(left, gridW, step, view.left, view.right);
        for (let i = cols.first; i <= cols.last; i++) {
            const x = left + i * step;
            ctx.moveTo(x, top);
            ctx.lineTo(x, top + gridH);
        }

        const rows = visibleLineRange(top, gridH, step, view.top, view.bottom);
        for (let i = rows.first; i <= rows.last; i++) {
            const y = top + i * step;
            ctx.moveTo(left, y);
            ctx.lineTo(left + gridW, y);
        }

        ctx.strokeStyle = strokeStyle;
        ctx.stroke();
    };

    if (s.minorStepMm * s.viewScale * s.mmToPx > 4) {
        drawLines(Math.max(0.1, s.minorStepMm), 'lightgray', baseLineWidth);
    }

    const major = Math.max(s.minorStepMm, s.majorStepMm);
    if (major * s.viewScale * s.mmToPx > 3) {
        drawLines(major, '#c0c0c0', baseLineWidth * 1.25);
    }
}

function drawMaterials(ctx, s, outputScale) {
    if (s.disciplineColors && s.disciplineColors.length > 0) {
      const fillStyles = s.disciplineColors.map(color => {
        if (s.disciplineMaterial === 'velours') return createVelvetTexture(ctx, color, outputScale);
        if (s.disciplineMaterial === 'satin') return createSatinTexture(ctx, color, outputScale);
        return color;
      });
      if (fillStyles.length === 1) {
        colorRectGridMM(ctx, s, 0, 0, s.gridWmm, s.gridHmm, fillStyles[0]);
      } else if (fillStyles.length > 1) {
        const midY = s.gridHmm / 2;
        colorRectGridMM(ctx, s, 0, 0, s.gridWmm, midY, fillStyles[0]);
        colorRectGridMM(ctx, s, 0, midY, s.gridWmm, s.gridHmm, fillStyles[1]);
      }
    }

    s.materials.forEach(material => {
        let fillStyle = material.color;
        if (material.material === 'velours') fillStyle = createVelvetTexture(ctx, material.color, outputScale);
        else if (material.material === 'satin') fillStyle = createSatinTexture(ctx, material.color, outputScale);
        colorRectGridMM(ctx, s, material.x_mm, material.y_mm, material.x_mm + material.width_mm, material.y_mm + material.height_mm, fillStyle);
    });
}

function drawMoivres(ctx, s, outputScale) {
    ctx.save();
    ctx.beginPath(); 
    ctx.rect(s.marginMm, s.marginMm, s.gridWmm, s.gridHmm); 
    ctx.clip();
    
    const moivrePadding = 10;
    s.moivres.forEach(moivre => {
        const satinPattern = createSatinTexture(ctx, moivre.color, outputScale);
        const extendedHeight = moivre.height_mm + moivrePadding * 2;
        const centerX = s.marginMm + moivre.x_mm + (moivre.width_mm / 2);
        const centerY = s.marginMm + moivre.y_mm + (moivre.height_mm / 2);
        ctx.save();
        ctx.translate(centerX, centerY); 
        ctx.rotate(15 * Math.PI / 180);
        ctx.fillStyle = satinPattern;
        ctx.fillRect(-moivre.width_mm / 2, -extendedHeight / 2, moivre.width_mm, extendedHeight);
        ctx.restore();
    });
    ctx.restore();
}

function drawInsignes(ctx, s) {
    s.images.forEach(it => {
        const img = getCachedImage(it.url);
        if (img) drawImgMM(ctx, s, img, it.x_mm, it.y_mm, it);
    });
}

function drawOverlays(ctx, s, baseLineWidth) {
    const outlineWidth = 2 * baseLineWidth;
    
    if (s.selectedMaterial) {
        ctx.strokeStyle = 'rgba(0, 123, 255, 0.9)'; 
        ctx.lineWidth = outlineWidth;
        if (s.selectedMaterial.groupId) {
            const group = s.materials.filter(m => m.groupId === s.selectedMaterial.groupId);
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            group.forEach(m => {
                minX = Math.min(minX, m.x_mm);
                minY = Math.min(minY, m.y_mm);
                maxX = Math.max(maxX, m.x_mm + m.width_mm);
                maxY = Math.max(maxY, m.y_mm + m.height_mm);
            });
            ctx.strokeRect(s.marginMm + minX, s.marginMm + minY, maxX - minX, maxY - minY);
        } else {
            ctx.strokeRect(s.marginMm + s.selectedMaterial.x_mm, s.marginMm + s.selectedMaterial.y_mm, s.selectedMaterial.width_mm, s.selectedMaterial.height_mm);
        }
    }
    
    if (s.selectedMoivre) {
        const moivre = s.selectedMoivre;
        const centerX = s.marginMm + moivre.x_mm + (moivre.width_mm / 2);
        const centerY = s.marginMm + moivre.y_mm + (moivre.height_mm / 2);
        ctx.save();
        ctx.translate(centerX, centerY); 
        ctx.rotate(15 * Math.PI / 180);
        ctx.strokeStyle = 'rgba(0, 123, 255, 0.9)'; 
        ctx.lineWidth = outlineWidth;
        ctx.strokeRect(-moivre.width_mm / 2, -moivre.height_mm / 2, moivre.width_mm, moivre.height_mm);
        ctx.restore();
    }
    
    if (s.selectedInsigne) {
        const insigne = s.selectedInsigne;
        const img = getCachedImage(insigne.url);
        if (img) {
            const natAspect = img.naturalWidth / img.naturalHeight;
            let h_mm = insigne.height_mm || (insigne.heightPct * s.gridHmm);
            const w_mm = h_mm * natAspect;
            ctx.strokeStyle = 'rgba(0, 123, 255, 0.9)'; 
            ctx.lineWidth = outlineWidth;
            ctx.strokeRect(s.marginMm + insigne.x_mm, s.marginMm + insigne.y_mm, w_mm, h_mm);
        }
    }
    
    if (s.isSnapping) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 0, 255, 0.8)'; 
        ctx.lineWidth = 1.5 * baseLineWidth;
        ctx.setLineDash([5 * baseLineWidth, 3 * baseLineWidth]);
        const midY = s.marginMm + s.gridHmm / 2;
        ctx.beginPath(); 
        ctx.moveTo(s.marginMm, midY); 
        ctx.lineTo(s.marginMm + s.gridWmm, midY); 
        ctx.stroke();
        ctx.restore();
    }

    const TOTAL_W_MM = s.gridWmm + 2 * s.marginMm;
    const TOTAL_H_MM = s.gridHmm + 2 * s.marginMm;
    const midX_helper = TOTAL_W_MM / 2;
    const midY_helper = TOTAL_H_MM / 2;
    ctx.save();
    ctx.strokeStyle = s.helper.color;
    ctx.lineWidth = s.helper.thickness * baseLineWidth;
    if (s.helper.showV) { ctx.beginPath(); ctx.moveTo(midX_helper, 0); ctx.lineTo(midX_helper, TOTAL_H_MM); ctx.stroke(); }
    if (s.helper.showH) { ctx.beginPath(); ctx.moveTo(0, midY_helper); ctx.lineTo(TOTAL_W_MM, midY_helper); ctx.stroke(); }
    ctx.restore();
}


export function draw(canvas, ctx, s, isLiveRender = true) {
    const dpr = setupCanvas(canvas, ctx, s, isLiveRender);
    if (dpr === 0) return;

    const baseLineWidth = 1 / (s.mmToPx * s.viewScale);

    // Millimetres to output pixels, including the device pixel ratio — the
    // moivre call site used to leave dpr out, which understated the scale by
    // half on any retina screen.
    const outputScale = s.mmToPx * s.viewScale * dpr;
    const view = visibleRangeMm(ctx, canvas);

    drawBase(ctx, s, baseLineWidth);
    drawGrid(ctx, s, baseLineWidth, view);
    drawMaterials(ctx, s, outputScale);
    drawMoivres(ctx, s, outputScale);
    drawInsignes(ctx, s);
    
    if (isLiveRender) {
        drawOverlays(ctx, s, baseLineWidth);
    }
}


export function colorRectGridMM(ctx, s, x1_mm, y1_mm, x2_mm, y2_mm, fillStyle, opts = {}) {
    const { behind = false, clamp: doClamp = true } = opts;
    const gx1 = doClamp ? clamp(x1_mm, 0, s.gridWmm) : x1_mm;
    const gy1 = doClamp ? clamp(y1_mm, 0, s.gridHmm) : y1_mm;
    const gx2 = doClamp ? clamp(x2_mm, 0, s.gridWmm) : x2_mm;
    const gy2 = doClamp ? clamp(y2_mm, 0, s.gridHmm) : y2_mm;
    const left = s.marginMm + Math.min(gx1, gx2);
    const top = s.marginMm + Math.min(gy1, gy2);
    const width = Math.abs(gx2 - gx1);
    const height = Math.abs(gy2 - gy1);
    ctx.save();
    ctx.globalCompositeOperation = behind ? 'destination-over' : 'source-over';
    ctx.fillStyle = fillStyle;
    ctx.fillRect(left, top, width, height);
    ctx.restore();
}

export function drawImgMM(ctx, s, img, x_mm, y_mm, opts = {}) {
  const { height_mm = null, heightPct = null } = opts;
  if (!img.complete || img.naturalWidth === 0) return;
  const natAspect = img.naturalWidth / img.naturalHeight;
  let h_mm = height_mm != null ? height_mm : (heightPct || 0.3) * s.gridHmm;
  let w_mm = h_mm * natAspect;
  const x_final = s.marginMm + x_mm;
  const y_final = s.marginMm + y_mm;
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, x_final, y_final, w_mm, h_mm);
  ctx.restore();
}