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