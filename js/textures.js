const textureCache = new Map();

const VELVET_TILE_MM = 40;
const SATIN_TILE_MM = 12;

const SATIN_BASE_PX = 12;
const SATIN_LINE_RATIO = 1.5 / SATIN_BASE_PX;

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

    const unitsPerPixel = tileMm / sizePx;
    pattern.setTransform(new DOMMatrix([unitsPerPixel, 0, 0, unitsPerPixel, 0, 0]));

    textureCache.set(cacheKey, pattern);
    return pattern;
}

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
