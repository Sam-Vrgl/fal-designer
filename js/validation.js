// js/validation.js

export const LIMITS = {
    gridWmm: { min: 1, max: 2000 },
    gridHmm: { min: 1, max: 500 },
    marginMm: { min: 0, max: 200 },

    x_mm: { min: -2000, max: 2000 },
    y_mm: { min: -2000, max: 2000 },
    width_mm: { min: 0.1, max: 2000 },
    height_mm: { min: 0.1, max: 500 },

    heightPercent: { min: 1, max: 500 },

    viewScale: { min: 0.01, max: 100 },
    viewOffset: { min: -1e6, max: 1e6 },

    helperThickness: { min: 1, max: 20 },
};

export const CANVAS_MAX_SIDE_PX = 16384;
export const CANVAS_MAX_AREA_PX = 16777216;

export function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

const ASSETS_BASE = new URL('assets/', document.baseURI);

export function isAllowedImageUrl(url) {
    if (typeof url !== 'string' || url === '') return false;
    if (url.startsWith('blob:')) return true;

    let resolved;
    try {
        resolved = new URL(url, document.baseURI);
    } catch {
        return false;
    }
    return resolved.origin === ASSETS_BASE.origin && resolved.pathname.startsWith(ASSETS_BASE.pathname);
}

export function coerceNumber(value, { min = -Infinity, max = Infinity, fallback = 0 } = {}) {
    let number;
    if (typeof value === 'number') {
        number = value;
    } else if (typeof value === 'string' && value.trim() !== '') {
        number = Number(value);
    } else {
        return fallback;
    }

    if (!Number.isFinite(number)) return fallback;
    return clamp(number, min, max);
}

export function readNumber(el, { min, max, fallback = null } = {}) {
    if (!el) return fallback;
    return coerceNumber(el.valueAsNumber, { min, max, fallback });
}

export function maxExportWidthMm(heightMm, dpi) {
    const pxPerMm = dpi / 25.4;
    const heightPx = Math.max(1, Math.round(heightMm * pxPerMm));
    const widestPx = Math.min(CANVAS_MAX_SIDE_PX, CANVAS_MAX_AREA_PX / heightPx);
    return Math.floor(widestPx / pxPerMm);
}

export function canExport(widthMm, heightMm, dpi) {
    const pxPerMm = dpi / 25.4;
    const widthPx = Math.round(widthMm * pxPerMm);
    const heightPx = Math.round(heightMm * pxPerMm);
    if (widthPx < 1 || heightPx < 1) return false;
    if (widthPx > CANVAS_MAX_SIDE_PX || heightPx > CANVAS_MAX_SIDE_PX) return false;
    return widthPx * heightPx <= CANVAS_MAX_AREA_PX;
}

function withFiniteFields(item, fields) {
    if (!item || typeof item !== 'object') return null;

    const result = { ...item };
    for (const key of Object.keys(fields)) {
        const value = coerceNumber(item[key], { ...fields[key], fallback: null });
        if (value === null) return null;
        result[key] = value;
    }
    return result;
}

const RECT_FIELDS = {
    x_mm: LIMITS.x_mm,
    y_mm: LIMITS.y_mm,
    width_mm: LIMITS.width_mm,
    height_mm: LIMITS.height_mm,
};

function sanitizeRects(list) {
    if (!Array.isArray(list)) return [];
    return list.map((item) => withFiniteFields(item, RECT_FIELDS)).filter(Boolean);
}

function sanitizeImage(image) {
    const placed = withFiniteFields(image, { x_mm: LIMITS.x_mm, y_mm: LIMITS.y_mm });
    if (!placed || typeof placed.url !== 'string') return null;

    if (placed.height_mm !== undefined) {
        const height = coerceNumber(placed.height_mm, { ...LIMITS.height_mm, fallback: null });
        if (height === null) return null;
        placed.height_mm = height;
    }

    if (placed.heightPct !== undefined) {
        const fraction = coerceNumber(placed.heightPct, {
            min: LIMITS.heightPercent.min / 100,
            max: LIMITS.heightPercent.max / 100,
            fallback: null,
        });
        if (fraction === null) return null;
        placed.heightPct = fraction;
    }

    if (placed.height_mm === undefined && placed.heightPct === undefined) return null;
    return placed;
}

function sanitizeImages(list) {
    if (!Array.isArray(list)) return { images: [], rejectedByUrl: 0 };

    const images = [];
    let rejectedByUrl = 0;
    for (const item of list) {
        if (item && typeof item === 'object' && !isAllowedImageUrl(item.url)) {
            rejectedByUrl += 1;
            continue;
        }
        const image = sanitizeImage(item);
        if (image) images.push(image);
    }
    return { images, rejectedByUrl };
}

export function sanitizeDesign(saved, defaults) {
    const result = structuredClone(defaults);
    const warnings = [];
    if (!saved || typeof saved !== 'object') return { design: result, warnings };

    const takeNumber = (key, limit) => {
        result[key] = coerceNumber(saved[key], { ...limit, fallback: defaults[key] });
    };

    takeNumber('gridWmm', LIMITS.gridWmm);
    takeNumber('gridHmm', LIMITS.gridHmm);
    takeNumber('marginMm', LIMITS.marginMm);
    takeNumber('viewScale', LIMITS.viewScale);
    takeNumber('viewOffsetX', LIMITS.viewOffset);
    takeNumber('viewOffsetY', LIMITS.viewOffset);

    if (typeof saved.discipline === 'string') result.discipline = saved.discipline;
    if (typeof saved.snapEnabled === 'boolean') result.snapEnabled = saved.snapEnabled;
    if (typeof saved.disciplineMaterial === 'string') result.disciplineMaterial = saved.disciplineMaterial;
    if (Array.isArray(saved.disciplineColors)) {
        result.disciplineColors = saved.disciplineColors.filter((color) => typeof color === 'string');
    }

    if (saved.helper && typeof saved.helper === 'object') {
        result.helper = {
            showV: saved.helper.showV === true,
            showH: saved.helper.showH === true,
            color: typeof saved.helper.color === 'string' ? saved.helper.color : defaults.helper.color,
            thickness: coerceNumber(saved.helper.thickness, {
                ...LIMITS.helperThickness,
                fallback: defaults.helper.thickness,
            }),
        };
    }

    result.materials = sanitizeRects(saved.materials);
    result.moivres = sanitizeRects(saved.moivres);
    const { images, rejectedByUrl } = sanitizeImages(saved.images);
    result.images = images;

    const dropped = countDropped(saved, result);
    if (dropped > 0) {
        console.warn(`Discarded ${dropped} item(s) with unusable geometry while loading the design.`);
    }

    if (rejectedByUrl > 0) {
        warnings.push(rejectedByUrl === 1
            ? "1 image ignorée : son URL n'est pas autorisée."
            : `${rejectedByUrl} images ignorées : leur URL n'est pas autorisée.`);
    }

    const geometryDropped = dropped - rejectedByUrl;
    if (geometryDropped > 0) {
        warnings.push(geometryDropped === 1
            ? "1 élément ignoré : sa position ou sa taille était invalide."
            : `${geometryDropped} éléments ignorés : leur position ou leur taille était invalide.`);
    }

    return { design: result, warnings };
}

function countDropped(saved, result) {
    const before = ['materials', 'moivres', 'images']
        .reduce((total, key) => total + (Array.isArray(saved[key]) ? saved[key].length : 0), 0);
    const after = result.materials.length + result.moivres.length + result.images.length;
    return before - after;
}
