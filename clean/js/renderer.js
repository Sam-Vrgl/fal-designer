import { getCachedImage } from './main.js';
// Drawing & geometry helpers
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

export function draw(canvas, ctx, s) {
    const TOTAL_W_MM = s.gridWmm + 2 * s.marginMm;
    const TOTAL_H_MM = s.gridHmm + 2 * s.marginMm;

    // Fit canvas to viewport with aspect lock
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
    ctx.clearRect(0, 0, totalCssW, totalCssH);

    // Outer border
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, totalCssW, totalCssH);

    // Grid bounds
    const left = s.marginMm * s.mmToPx;
    const top = s.marginMm * s.mmToPx;
    const right = (s.marginMm + s.gridWmm) * s.mmToPx;
    const bottom = (s.marginMm + s.gridHmm) * s.mmToPx;

    // Margin rectangle
    ctx.strokeStyle = '#a0a0a0';
    ctx.lineWidth = 1;
    ctx.strokeRect(left, top, right - left, bottom - top);

    // Minor grid
    const minor = Math.max(0.1, s.minorStepMm);
    const major = Math.max(minor, s.majorStepMm);

    // draw minor lines
    ctx.beginPath();
    // verticals
    {
        const count = Math.floor(s.gridWmm / minor + 1e-9);
        for (let i = 0; i <= count; i++) {
            const x = left + (i * minor) * s.mmToPx;
            ctx.moveTo(x, top); ctx.lineTo(x, bottom);
        }
    }
    // horizontals
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

    // draw major lines
    ctx.beginPath();
    // verticals
    {
        const count = Math.floor(s.gridWmm / major + 1e-9);
        for (let i = 0; i <= count; i++) {
            const x = left + (i * major) * s.mmToPx;
            ctx.moveTo(x, top); ctx.lineTo(x, bottom);
        }
    }
    // horizontals
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

    // --- Demo fills (kept for testing)
    colorRectGridMM(ctx, s, 0, 0, s.gridWmm, Math.min(19, s.gridHmm / 2), 'rgba(0,0,255)', { behind: false });
    colorRectGridMM(ctx, s, 0, Math.min(20, s.gridHmm / 2), s.gridWmm, s.gridHmm, 'rgba(0,0,0)', { behind: false });
    // 40% of grid height, centered on (x=350mm, y=10mm), on top:
    for (const it of s.images) {
        const img = getCachedImage(it.url);
        if (!img) continue; // not loaded yet
        // it may contain: x_mm, y_mm, heightPct/height_mm/width_mm, aspect, anchor, behind
        drawImgMM(ctx, s, img, it.x_mm, it.y_mm, it);
        console.log('drawn', it.url);
    }

    // --- Mid helpers (draw last so they sit on top unless you want them behind)
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

// Fill a rectangle in grid mm coordinates.
// (x1_mm,y1_mm) to (x2_mm,y2_mm). Options: behind (draw under), clamp (stay within grid)
export function colorRectGridMM(ctx, s, x1_mm, y1_mm, x2_mm, y2_mm, color, opts = {}) {
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
    ctx.fillStyle = color;
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

  // Lazy load handling: schedule a redraw once and bail out
  const isBitmap = typeof ImageBitmap !== 'undefined' && img instanceof ImageBitmap;
  const loaded = isBitmap || (img && img.complete && img.naturalWidth > 0);
  if (!loaded) {
    if (typeof onLoadRedraw === 'function' && img && !img.__mmDrawHooked) {
      img.__mmDrawHooked = true;
      img.addEventListener?.('load', onLoadRedraw, { once: true });
    }
    return null;
  }

  // Resolve aspect
  const natAspect = isBitmap ? (img.width / img.height) : (img.naturalWidth / img.naturalHeight);
  const useAspect = aspect === 'natural' ? natAspect : (Number(aspect) || natAspect);

  // Resolve size in mm
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
    // Default via % of grid height if provided, else 0.3 (30%)
    const pct = (heightPct != null) ? Math.max(0, Math.min(1, heightPct)) : 0.3;
    h_mm = pct * s.gridHmm;
    w_mm = h_mm * useAspect;
  }

  // Optional snapping of the *anchor point*
  if (snapMm && isFinite(snapMm) && snapMm > 0) {
    const snap = (v) => Math.round(v / snapMm) * snapMm;
    x_mm = snap(x_mm);
    y_mm = snap(y_mm);
  }

  // Anchor → normalized offset: left/center/right × top/center/bottom
  const ax = /(^|[^c])l/.test(anchor) ? 0 : /r/.test(anchor) ? -1 : -0.5;  // l=0, r=-1, c=-0.5
  const ay = /t/.test(anchor) ? 0 : /b/.test(anchor) ? -1 : -0.5;          // t=0, b=-1, c=-0.5

  // Top-left corner in *grid mm* after anchor shift
  let left_mm = x_mm + ax * w_mm;
  let top_mm  = y_mm + ay * h_mm;

  // Optional clamp so the whole image remains inside the grid box
  if (clampToGrid) {
    const maxLeft = Math.max(0, s.gridWmm - w_mm);
    const maxTop  = Math.max(0, s.gridHmm - h_mm);
    left_mm = Math.max(0, Math.min(left_mm, maxLeft));
    top_mm  = Math.max(0, Math.min(top_mm,  maxTop));
  }

  // Convert to *canvas world CSS px* (your renderer already set the transform)
  const originX = s.marginMm * s.mmToPx;
  const originY = s.marginMm * s.mmToPx;

  const x_px = originX + left_mm * s.mmToPx;
  const y_px = originY + top_mm  * s.mmToPx;
  const w_px = w_mm * s.mmToPx;
  const h_px = h_mm * s.mmToPx;

  // Draw
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.globalCompositeOperation = behind ? 'destination-over' : 'source-over';
  ctx.drawImage(img, x_px, y_px, w_px, h_px);
  ctx.restore();

  return { x_px, y_px, w_px, h_px };
}