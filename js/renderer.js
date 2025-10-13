import { getCachedImage } from './main.js';
import { createVelvetTexture, createSatinTexture } from './textures.js';

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

export function draw(canvas, ctx, s, isLiveRender = true) {
    let dpr = 1;
    const currentMmToPx = s.mmToPx;

    if (isLiveRender) {
        const container = canvas.parentElement;
        if (!container || container.clientWidth === 0) return;
        dpr = window.devicePixelRatio || 1;

        canvas.width = container.clientWidth * dpr;
        canvas.height = container.clientHeight * dpr;
        canvas.style.width = `${container.clientWidth}px`;
        canvas.style.height = `${container.clientHeight}px`;
    }
    
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const scale = s.viewScale * currentMmToPx * dpr;
    const offsetX = s.viewOffsetX * dpr;
    const offsetY = s.viewOffsetY * dpr;
    ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);
    
    const TOTAL_W_MM = s.gridWmm + 2 * s.marginMm;
    const TOTAL_H_MM = s.gridHmm + 2 * s.marginMm;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, TOTAL_W_MM, TOTAL_H_MM);
    
    const baseLineWidth = 1 / (currentMmToPx * s.viewScale);

    ctx.strokeStyle = '#000';
    ctx.lineWidth = baseLineWidth;
    ctx.strokeRect(0, 0, TOTAL_W_MM, TOTAL_H_MM);

    const left = s.marginMm;
    const top = s.marginMm;
    const gridW = s.gridWmm;
    const gridH = s.gridHmm;

    ctx.strokeStyle = '#a0a0a0';
    ctx.strokeRect(left, top, gridW, gridH);

    if (s.minorStepMm * s.viewScale * currentMmToPx > 4) {
        const minor = Math.max(0.1, s.minorStepMm);
        ctx.beginPath();
        ctx.lineWidth = baseLineWidth;
        for (let i = 0; i <= Math.floor(gridW / minor + 1e-9); i++) {
            const x = left + i * minor; ctx.moveTo(x, top); ctx.lineTo(x, top + gridH);
        }
        for (let i = 0; i <= Math.floor(gridH / minor + 1e-9); i++) {
            const y = top + i * minor; ctx.moveTo(left, y); ctx.lineTo(left + gridW, y);
        }
        ctx.strokeStyle = 'lightgray';
        ctx.stroke();
    }
    
    const major = Math.max(s.minorStepMm, s.majorStepMm);
    if (major * s.viewScale * currentMmToPx > 3) {
        ctx.beginPath();
        ctx.lineWidth = baseLineWidth * 1.25;
        for (let i = 0; i <= Math.floor(gridW / major + 1e-9); i++) {
            const x = left + i * major; ctx.moveTo(x, top); ctx.lineTo(x, top + gridH);
        }
        for (let i = 0; i <= Math.floor(gridH / major + 1e-9); i++) {
            const y = top + i * major; ctx.moveTo(left, y); ctx.lineTo(left + gridW, y);
        }
        ctx.strokeStyle = '#c0c0c0';
        ctx.stroke();
    }
    
    if (s.disciplineColors && s.disciplineColors.length > 0) {
      const fillStyles = s.disciplineColors.map(color => {
        if (s.disciplineMaterial === 'velours') return createVelvetTexture(ctx, color, currentMmToPx * s.viewScale);
        if (s.disciplineMaterial === 'satin') return createSatinTexture(ctx, color, currentMmToPx * s.viewScale);
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
        if (material.material === 'velours') fillStyle = createVelvetTexture(ctx, material.color, currentMmToPx * s.viewScale);
        else if (material.material === 'satin') fillStyle = createSatinTexture(ctx, material.color, currentMmToPx * s.viewScale);
        colorRectGridMM(ctx, s, material.x_mm, material.y_mm, material.x_mm + material.width_mm, material.y_mm + material.height_mm, fillStyle);
    });
    
    ctx.save();
    ctx.beginPath(); ctx.rect(s.marginMm, s.marginMm, s.gridWmm, s.gridHmm); ctx.clip();
    const moivrePadding = 10;
    s.moivres.forEach(moivre => {
        const satinPattern = createSatinTexture(ctx, moivre.color, currentMmToPx * s.viewScale);
        const extendedHeight = moivre.height_mm + moivrePadding * 2;
        const centerX = s.marginMm + moivre.x_mm + (moivre.width_mm / 2);
        const centerY = s.marginMm + moivre.y_mm + (moivre.height_mm / 2);
        ctx.save();
        ctx.translate(centerX, centerY); ctx.rotate(15 * Math.PI / 180);
        ctx.fillStyle = satinPattern;
        ctx.fillRect(-moivre.width_mm / 2, -extendedHeight / 2, moivre.width_mm, extendedHeight);
        ctx.restore();
    });
    ctx.restore();
    
    if (isLiveRender) {
        const outlineWidth = 2 * baseLineWidth;
        if (s.selectedMaterial) {
            ctx.strokeStyle = 'rgba(0, 123, 255, 0.9)'; ctx.lineWidth = outlineWidth;
            ctx.strokeRect(s.marginMm + s.selectedMaterial.x_mm, s.marginMm + s.selectedMaterial.y_mm, s.selectedMaterial.width_mm, s.selectedMaterial.height_mm);
        }
        if (s.selectedMoivre) {
            const moivre = s.selectedMoivre;
            const centerX = s.marginMm + moivre.x_mm + (moivre.width_mm / 2);
            const centerY = s.marginMm + moivre.y_mm + (moivre.height_mm / 2);
            ctx.save();
            ctx.translate(centerX, centerY); ctx.rotate(15 * Math.PI / 180);
            ctx.strokeStyle = 'rgba(0, 123, 255, 0.9)'; ctx.lineWidth = outlineWidth;
            ctx.strokeRect(-moivre.width_mm / 2, -moivre.height_mm / 2, moivre.width_mm, moivre.height_mm);
            ctx.restore();
        }
    }
    
    s.images.forEach(it => {
        const img = getCachedImage(it.url);
        if (img) drawImgMM(ctx, s, img, it.x_mm, it.y_mm, it, currentMmToPx);
    });

    if (isLiveRender && s.selectedInsigne) {
        const insigne = s.selectedInsigne;
        const img = getCachedImage(insigne.url);
        if (img) {
            const natAspect = img.naturalWidth / img.naturalHeight;
            let h_mm = insigne.height_mm || (insigne.heightPct * s.gridHmm);
            const w_mm = h_mm * natAspect;
            ctx.strokeStyle = 'rgba(0, 123, 255, 0.9)'; ctx.lineWidth = 2 * baseLineWidth;
            ctx.strokeRect(s.marginMm + insigne.x_mm, s.marginMm + insigne.y_mm, w_mm, h_mm);
        }
    }
    
    if (isLiveRender && s.isSnapping) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 0, 255, 0.8)'; ctx.lineWidth = 1.5 * baseLineWidth;
        ctx.setLineDash([5 * baseLineWidth, 3 * baseLineWidth]);
        const midY = s.marginMm + s.gridHmm / 2;
        ctx.beginPath(); ctx.moveTo(s.marginMm, midY); ctx.lineTo(s.marginMm + s.gridWmm, midY); ctx.stroke();
        ctx.restore();
    }

    if (isLiveRender) {
        const midX_helper = TOTAL_W_MM / 2;
        const midY_helper = TOTAL_H_MM / 2;
        ctx.save();
        ctx.strokeStyle = s.helper.color;
        ctx.lineWidth = s.helper.thickness * baseLineWidth;
        if (s.helper.showV) { ctx.beginPath(); ctx.moveTo(midX_helper, 0); ctx.lineTo(midX_helper, TOTAL_H_MM); ctx.stroke(); }
        if (s.helper.showH) { ctx.beginPath(); ctx.moveTo(0, midY_helper); ctx.lineTo(TOTAL_W_MM, midY_helper); ctx.stroke(); }
        ctx.restore();
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

export function drawImgMM(ctx, s, img, x_mm, y_mm, opts = {}, mmToPxOverride = null) {
  const { height_mm = null, heightPct = null } = opts;
  if (!img.complete || img.naturalWidth === 0) return null;
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