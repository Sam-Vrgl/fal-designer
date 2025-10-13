import { getCachedImage } from './main.js';
import { createVelvetTexture, createSatinTexture } from './textures.js';

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

export function draw(canvas, ctx, s, useDevicePixelRatio = true) {
    const TOTAL_W_MM = s.gridWmm + 2 * s.marginMm;
    const TOTAL_H_MM = s.gridHmm + 2 * s.marginMm;

    if (useDevicePixelRatio) {
        const dpr = window.devicePixelRatio || 1;
        const totalCssW = TOTAL_W_MM * s.mmToPx;
        const totalCssH = TOTAL_H_MM * s.mmToPx;

        const scaleCss = Math.min(
            window.innerWidth / totalCssW,
            window.innerHeight / totalCssH
        );

        const cssW = totalCssW * scaleCss;
        const cssH = totalCssH * scaleCss;

        canvas.style.width = cssW + 'px';
        canvas.style.height = cssH + 'px';
        canvas.width = Math.round(cssW * dpr);
        canvas.height = Math.round(cssH * dpr);

        ctx.setTransform(dpr * scaleCss, 0, 0, dpr * scaleCss, 0, 0);
    } else {
        ctx.setTransform(s.mmToPx, 0, 0, s.mmToPx, 0, 0);
    }

    const totalCssW_render = TOTAL_W_MM;
    const totalCssH_render = TOTAL_H_MM;

    ctx.clearRect(0, 0, totalCssW_render, totalCssH_render);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1 / s.mmToPx;
    ctx.strokeRect(0, 0, totalCssW_render, totalCssH_render);

    const left = s.marginMm;
    const top = s.marginMm;
    const right = s.marginMm + s.gridWmm;
    const bottom = s.marginMm + s.gridHmm;

    ctx.strokeStyle = '#a0a0a0';
    ctx.strokeRect(left, top, right - left, bottom - top);

    const minor = Math.max(0.1, s.minorStepMm);
    const major = Math.max(minor, s.majorStepMm);

    ctx.beginPath();
    {
        const count = Math.floor(s.gridWmm / minor + 1e-9);
        for (let i = 0; i <= count; i++) {
            const x = left + (i * minor) * s.mmToPx;
            ctx.moveTo(x, top); ctx.lineTo(x, bottom);
        }
    }
    {
        const count = Math.floor(s.gridHmm / minor + 1e-9);
        for (let i = 0; i <= count; i++) {
            const y = top + (i * minor) * s.mmToPx;
            ctx.moveTo(left, y); ctx.lineTo(right, y);
        }
    }
    ctx.strokeStyle = 'lightgray';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    {
        const count = Math.floor(s.gridWmm / major + 1e-9);
        for (let i = 0; i <= count; i++) {
            const x = left + (i * major) * s.mmToPx;
            ctx.moveTo(x, top); ctx.lineTo(x, bottom);
        }
    }
    {
        const count = Math.floor(s.gridHmm / major + 1e-9);
        for (let i = 0; i <= count; i++) {
            const y = top + (i * major) * s.mmToPx;
            ctx.moveTo(left, y); ctx.lineTo(right, y);
        }
    }
    ctx.strokeStyle = '#c0c0c0';
    ctx.lineWidth = 1.25;
    ctx.stroke();

    if (s.disciplineColors && s.disciplineColors.length > 0) {
      const fillStyles = s.disciplineColors.map(color => {
        if (s.disciplineMaterial === 'velours') {
          return createVelvetTexture(ctx, color);
        } else if (s.disciplineMaterial === 'satin') {
          return createSatinTexture(ctx, color);
        }
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

    // --- Draw Material Sections ---
    for (const material of s.materials) {
        let fillStyle;
        if (material.material === 'velours') {
            fillStyle = createVelvetTexture(ctx, material.color);
        } else if (material.material === 'satin') {
            fillStyle = createSatinTexture(ctx, material.color);
        } else {
            fillStyle = material.color; // Fallback to a solid color
        }

        colorRectGridMM(
            ctx, s,
            material.x_mm, material.y_mm,
            material.x_mm + material.width_mm, material.y_mm + material.height_mm,
            fillStyle
        );
    }

    // --- Draw selected material outline ---
    if (s.selectedMaterial) {
        const originX = s.marginMm * s.mmToPx;
        const originY = s.marginMm * s.mmToPx;
        const x = originX + s.selectedMaterial.x_mm * s.mmToPx;
        const y = originY + s.selectedMaterial.y_mm * s.mmToPx;
        const width = s.selectedMaterial.width_mm * s.mmToPx;
        const height = s.selectedMaterial.height_mm * s.mmToPx;

        ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);
    }


    for (const it of s.images) {
        const img = getCachedImage(it.url);
        if (!img) continue;
        drawImgMM(ctx, s, img, it.x_mm, it.y_mm, it);
    }

    const midX = totalCssW / 2;
    const midY = totalCssH / 2;

    ctx.save();
    ctx.strokeStyle = s.helper.color;
    ctx.lineWidth = s.helper.thickness;

    if (s.helper.showV) {
        ctx.beginPath();
        ctx.moveTo(midX, 0); ctx.lineTo(midX, totalCssH);
        ctx.stroke();
    }
    if (s.helper.showH) {
        ctx.beginPath();
        ctx.moveTo(0, midY); ctx.lineTo(totalCssW, midY);
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

    const originX = s.marginMm * s.mmToPx;
    const originY = s.marginMm * s.mmToPx;

    const x1 = originX + gx1 * s.mmToPx;
    const y1 = originY + gy1 * s.mmToPx;
    const x2 = originX + gx2 * s.mmToPx;
    const y2 = originY + gy2 * s.mmToPx;

    const left = Math.min(x1, x2);
    const top = Math.min(y1, y2);
    const width = Math.abs(x2 - x1);
    const height = Math.abs(y2 - y1);

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

  const originX = s.marginMm * s.mmToPx;
  const originY = s.marginMm * s.mmToPx;

  const x_px = originX + left_mm * s.mmToPx;
  const y_px = originY + top_mm  * s.mmToPx;
  const w_px = w_mm * s.mmToPx;
  const h_px = h_mm * s.mmToPx;

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.globalCompositeOperation = behind ? 'destination-over' : 'source-over';
  ctx.drawImage(img, x_px, y_px, w_px, h_px);
  ctx.restore();

  return { x_px, y_px, w_px, h_px };
}