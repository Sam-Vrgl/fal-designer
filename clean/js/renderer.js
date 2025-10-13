import { getCachedImage } from './main.js';
import { createVelvetTexture, createSatinTexture } from './textures.js';

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

export function draw(canvas, ctx, s, useDevicePixelRatio = true) {
    const TOTAL_W_MM = s.gridWmm + 2 * s.marginMm;
    const TOTAL_H_MM = s.gridHmm + 2 * s.marginMm;

    // --- Setup canvas and transform ---
    if (useDevicePixelRatio) {
        // For screen display, we scale to fit the window
        const dpr = window.devicePixelRatio || 1;
        const totalCssW_at_1_to_1 = TOTAL_W_MM * s.mmToPx;
        const totalCssH_at_1_to_1 = TOTAL_H_MM * s.mmToPx;
        const scaleCss = Math.min(window.innerWidth / totalCssW_at_1_to_1, window.innerHeight / totalCssH_at_1_to_1);
        
        const cssW = totalCssW_at_1_to_1 * scaleCss;
        const cssH = totalCssH_at_1_to_1 * scaleCss;

        canvas.style.width = cssW + 'px';
        canvas.style.height = cssH + 'px';
        canvas.width = Math.round(cssW * dpr);
        canvas.height = Math.round(cssH * dpr);

        ctx.setTransform(dpr * scaleCss * s.mmToPx, 0, 0, dpr * scaleCss * s.mmToPx, 0, 0);
    } else {
        // For image export, we use the high-resolution mm-to-px ratio directly
        ctx.setTransform(s.mmToPx, 0, 0, s.mmToPx, 0, 0);
    }

    // --- Start Drawing (all coordinates are now in MM) ---
    ctx.clearRect(0, 0, TOTAL_W_MM, TOTAL_H_MM);

    // Outer border
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1 / s.mmToPx; // Maintain a 1px line width regardless of scale
    ctx.strokeRect(0, 0, TOTAL_W_MM, TOTAL_H_MM);

    const left = s.marginMm;
    const top = s.marginMm;
    const gridW = s.gridWmm;
    const gridH = s.gridHmm;

    // Margin rectangle
    ctx.strokeStyle = '#a0a0a0';
    ctx.strokeRect(left, top, gridW, gridH);

    // Grid lines
    const minor = Math.max(0.1, s.minorStepMm);
    const major = Math.max(minor, s.majorStepMm);
    
    // Minor grid
    ctx.beginPath();
    ctx.lineWidth = 1 / s.mmToPx;
    for (let i = 0; i <= Math.floor(gridW / minor + 1e-9); i++) {
        const x = left + i * minor;
        ctx.moveTo(x, top); ctx.lineTo(x, top + gridH);
    }
    for (let i = 0; i <= Math.floor(gridH / minor + 1e-9); i++) {
        const y = top + i * minor;
        ctx.moveTo(left, y); ctx.lineTo(left + gridW, y);
    }
    ctx.strokeStyle = 'lightgray';
    ctx.stroke();

    // Major grid
    ctx.beginPath();
    ctx.lineWidth = 1.25 / s.mmToPx;
    for (let i = 0; i <= Math.floor(gridW / major + 1e-9); i++) {
        const x = left + i * major;
        ctx.moveTo(x, top); ctx.lineTo(x, top + gridH);
    }
    for (let i = 0; i <= Math.floor(gridH / major + 1e-9); i++) {
        const y = top + i * major;
        ctx.moveTo(left, y); ctx.lineTo(left + gridW, y);
    }
    ctx.strokeStyle = '#c0c0c0';
    ctx.stroke();

    // Discipline background
    if (s.disciplineColors && s.disciplineColors.length > 0) {
      const fillStyles = s.disciplineColors.map(color => {
        if (s.disciplineMaterial === 'velours') return createVelvetTexture(ctx, color);
        if (s.disciplineMaterial === 'satin') return createSatinTexture(ctx, color);
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

    // Material sections
    for (const material of s.materials) {
        let fillStyle;
        if (material.material === 'velours') fillStyle = createVelvetTexture(ctx, material.color);
        else if (material.material === 'satin') fillStyle = createSatinTexture(ctx, material.color);
        else fillStyle = material.color;

        colorRectGridMM(ctx, s, material.x_mm, material.y_mm, material.x_mm + material.width_mm, material.y_mm + material.height_mm, fillStyle);
    }
    
    // Selected material outline
    if (s.selectedMaterial) {
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)';
        ctx.lineWidth = 2 / s.mmToPx;
        ctx.strokeRect(s.marginMm + s.selectedMaterial.x_mm, s.marginMm + s.selectedMaterial.y_mm, s.selectedMaterial.width_mm, s.selectedMaterial.height_mm);
    }

    // Images (insignes)
    for (const it of s.images) {
        const img = getCachedImage(it.url);
        if (!img) continue;
        drawImgMM(ctx, s, img, it.x_mm, it.y_mm, it);
    }

    // Helper lines
    const midX = TOTAL_W_MM / 2;
    const midY = TOTAL_H_MM / 2;

    ctx.save();
    ctx.strokeStyle = s.helper.color;
    ctx.lineWidth = s.helper.thickness / s.mmToPx;
    if (s.helper.showV) {
        ctx.beginPath();
        ctx.moveTo(midX, 0); ctx.lineTo(midX, TOTAL_H_MM);
        ctx.stroke();
    }
    if (s.helper.showH) {
        ctx.beginPath();
        ctx.moveTo(0, midY); ctx.lineTo(TOTAL_W_MM, midY);
        ctx.stroke();
    }
    ctx.restore();
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
  const {
    height_mm = null,
    width_mm  = null,
    heightPct = null,
    aspect = 'natural',
    anchor = 'tl',
    clampToGrid = true,
    snapMm = null,
    behind = false,
    onLoadRedraw = null
  } = opts;

  const isBitmap = typeof ImageBitmap !== 'undefined' && img instanceof ImageBitmap;
  const loaded = isBitmap || (img && img.complete && img.naturalWidth > 0);
  if (!loaded) {
    if (typeof onLoadRedraw === 'function' && img && !img.__mmDrawHooked) {
      img.__mmDrawHooked = true;
      img.addEventListener?.('load', onLoadRedraw, { once: true });
    }
    return null;
  }

  const natAspect = isBitmap ? (img.width / img.height) : (img.naturalWidth / img.naturalHeight);
  const useAspect = aspect === 'natural' ? natAspect : (Number(aspect) || natAspect);

  let h_mm, w_mm;
  if (height_mm != null && width_mm != null) {
    h_mm = height_mm;
    w_mm = width_mm;
  } else if (height_mm != null) {
    h_mm = height_mm;
    w_mm = h_mm * useAspect;
  } else if (width_mm != null) {
    w_mm = width_mm;
    h_mm = w_mm / useAspect;
  } else {
    const pct = (heightPct != null) ? Math.max(0, Math.min(1, heightPct)) : 0.3;
    h_mm = pct * s.gridHmm;
    w_mm = h_mm * useAspect;
  }

  if (snapMm && isFinite(snapMm) && snapMm > 0) {
    const snap = (v) => Math.round(v / snapMm) * snapMm;
    x_mm = snap(x_mm);
    y_mm = snap(y_mm);
  }

  const ax = /(^|[^c])l/.test(anchor) ? 0 : /r/.test(anchor) ? -1 : -0.5;
  const ay = /t/.test(anchor) ? 0 : /b/.test(anchor) ? -1 : -0.5;

  let left_mm = x_mm + ax * w_mm;
  let top_mm  = y_mm + ay * h_mm;

  if (clampToGrid) {
    const maxLeft = Math.max(0, s.gridWmm - w_mm);
    const maxTop  = Math.max(0, s.gridHmm - h_mm);
    left_mm = Math.max(0, Math.min(left_mm, maxLeft));
    top_mm  = Math.max(0, Math.min(top_mm,  maxTop));
  }
  
  const originX = s.marginMm;
  const originY = s.marginMm;

  const x_final = originX + left_mm;
  const y_final = originY + top_mm;
  
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.globalCompositeOperation = behind ? 'destination-over' : 'source-over';
  ctx.drawImage(img, x_final, y_final, w_mm, h_mm);
  ctx.restore();
  
  return { x_final, y_final, w_mm, h_mm };
}