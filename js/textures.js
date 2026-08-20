// The canvas transform works in millimetres, so a pattern built from a bitmap
// is measured in millimetres too. A 40-pixel noise tile became a 40 *mm* tile,
// magnified by whatever the output scale happened to be — roughly 4x on screen
// and nearly 12x at 300 DPI, which is why velvet and satin came out blocky on
// the one thing people actually print.
//
// renderer.js already passed a scale factor in, to a function that took two
// parameters and silently ignored the third. This is that parameter: the tile
// stays the same size in millimetres, but the bitmap behind it is built at the
// output scale and mapped back down with setTransform.

const textureCache = new Map();

// Physical tile size. These are the values the original bitmaps ended up with
// once they were reinterpreted as millimetres, so the look does not change.
const VELVET_TILE_MM = 40;
const SATIN_TILE_MM = 12;

// The satin sheen was drawn at 1.5px in a 12px tile. Keeping that ratio keeps
// the diagonal the same physical width however many pixels it is drawn with.
const SATIN_BASE_PX = 12;
const SATIN_LINE_RATIO = 1.5 / SATIN_BASE_PX;

// A zoom gesture walks through a continuum of scales. Rounding the bitmap up to
// a power of two means a handful of cached tiles per colour rather than a fresh
// canvas — and a fresh pass of Math.random over it — on every frame.
const MIN_TILE_PX = 16;
const MAX_TILE_PX = 512;

function tilePixels(tileMm, scale) {
    const wanted = tileMm * (scale > 0 ? scale : 1);
    const rounded = 2 ** Math.ceil(Math.log2(Math.max(1, wanted)));
    return Math.min(MAX_TILE_PX, Math.max(MIN_TILE_PX, rounded));
}

function buildPattern(ctx, cacheKey, sizePx, tileMm, paint) {
    if (textureCache.has(cacheKey)) {
        return textureCache.get(cacheKey);
    }

    const patternCanvas = document.createElement('canvas');
    patternCanvas.width = sizePx;
    patternCanvas.height = sizePx;
    paint(patternCanvas.getContext('2d'), sizePx);

    const pattern = ctx.createPattern(patternCanvas, 'repeat');

    // Without this the bitmap is read as one user unit per pixel, and one user
    // unit here is one millimetre. This is the whole bug in one line.
    const unitsPerPixel = tileMm / sizePx;
    pattern.setTransform(new DOMMatrix([unitsPerPixel, 0, 0, unitsPerPixel, 0, 0]));

    textureCache.set(cacheKey, pattern);
    return pattern;
}

// Noise is generated per bitmap pixel, so the grain stays around one output
// pixel at any scale. That is what makes it resolution-independent: the texture
// reads the same density on screen and in print, rather than being one fixed
// grid of squares magnified to whatever size the output happens to be.
export function createVelvetTexture(ctx, color, scale = 1) {
    const sizePx = tilePixels(VELVET_TILE_MM, scale);

    return buildPattern(ctx, `velvet-${color}-${sizePx}`, sizePx, VELVET_TILE_MM, (patternCtx, size) => {
        patternCtx.fillStyle = color;
        patternCtx.fillRect(0, 0, size, size);

        const imageData = patternCtx.getImageData(0, 0, size, size);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            const noise = Math.random() * 25;
            data[i] -= noise;
            data[i + 1] -= noise;
            data[i + 2] -= noise;
        }
        patternCtx.putImageData(imageData, 0, 0);
    });
}

// The sheen is a shape rather than noise, so it scales with the bitmap and
// comes out crisp instead of resampled.
export function createSatinTexture(ctx, color, scale = 1) {
    const sizePx = tilePixels(SATIN_TILE_MM, scale);

    return buildPattern(ctx, `satin-${color}-${sizePx}`, sizePx, SATIN_TILE_MM, (patternCtx, size) => {
        patternCtx.fillStyle = color;
        patternCtx.fillRect(0, 0, size, size);

        const overshoot = size * (2 / SATIN_BASE_PX);
        patternCtx.beginPath();
        patternCtx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        patternCtx.lineWidth = size * SATIN_LINE_RATIO;
        patternCtx.moveTo(-overshoot, size + overshoot);
        patternCtx.lineTo(size + overshoot, -overshoot);
        patternCtx.stroke();
    });
}
