// js/validation.js
//
// Numbers are the one kind of input that can put this app into a state it does
// not recover from. A cleared field reads as NaN, notify() persists it, and
// JSON.stringify writes NaN out as null — so the next load starts from a design
// whose grid has no width. Everything here exists to make sure a non-finite or
// absurd number never reaches state, whether it came from a keystroke, from
// localStorage or from a design file.

// The range every numeric field is allowed to hold. One table so the `max`
// attributes in the markup, the load-time shape check and the export budget
// cannot drift apart.
export const LIMITS = {
    // A circulaire is 700 mm; 2000 leaves room for anything real without
    // letting the grid loop run away.
    gridWmm: { min: 1, max: 2000 },
    gridHmm: { min: 1, max: 500 },
    marginMm: { min: 0, max: 200 },

    // Placements may sit outside the grid — an insigne can legitimately hang
    // over an edge — so these are signed. They are not unbounded.
    x_mm: { min: -2000, max: 2000 },
    y_mm: { min: -2000, max: 2000 },
    width_mm: { min: 0.1, max: 2000 },
    height_mm: { min: 0.1, max: 500 },

    // The inspector field is in percent of grid height; state stores the
    // fraction. The bounds live in the unit the user types in.
    heightPercent: { min: 1, max: 500 },

    // View state. Persisted, so it is worth checking on the way back in: a
    // zero or negative scale divides the canvas out of existence.
    viewScale: { min: 0.01, max: 100 },
    viewOffset: { min: -1e6, max: 1e6 },

    helperThickness: { min: 1, max: 20 },
};

// Browser canvas ceilings. 16384 px per side is the common desktop limit; iOS
// Safari additionally caps total pixels, and for a wide, short ribbon the side
// limit is the one that binds. Past either, allocation fails silently — the
// context stays blank and toDataURL() returns the string "data:,", which the
// user receives as a zero-byte download.
export const CANVAS_MAX_SIDE_PX = 16384;
export const CANVAS_MAX_AREA_PX = 16777216;

export function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

// Coerces anything to a number inside [min, max], or returns `fallback` when it
// cannot. Pass fallback: null to make "unreadable" distinguishable from a real
// value, which is what every caller that would rather skip than substitute does.
export function coerceNumber(value, { min = -Infinity, max = Infinity, fallback = 0 } = {}) {
    // Number(null), Number('') and Number(false) are all 0, which would turn a
    // missing value into a real one. null is exactly what JSON.stringify writes
    // where a field held NaN, so accepting it as zero is how a cleared box
    // became a zero-width grid in the first place. Only a number, or a string
    // that reads as one, counts.
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

// Reads a number input. Returns null for an empty or unparseable field so the
// caller can leave the last good value in place rather than writing NaN.
export function readNumber(el, { min, max, fallback = null } = {}) {
    if (!el) return fallback;
    return coerceNumber(el.valueAsNumber, { min, max, fallback });
}

// The largest grid width, in mm, that can still be rasterised at this DPI next
// to the given height. Used to refuse an impossible export with a number the
// user can act on rather than a generic failure.
export function maxExportWidthMm(heightMm, dpi) {
    const pxPerMm = dpi / 25.4;
    const heightPx = Math.max(1, Math.round(heightMm * pxPerMm));
    const widestPx = Math.min(CANVAS_MAX_SIDE_PX, CANVAS_MAX_AREA_PX / heightPx);
    return Math.floor(widestPx / pxPerMm);
}

// True when a grid of this size can be exported at this DPI.
export function canExport(widthMm, heightMm, dpi) {
    const pxPerMm = dpi / 25.4;
    const widthPx = Math.round(widthMm * pxPerMm);
    const heightPx = Math.round(heightMm * pxPerMm);
    if (widthPx < 1 || heightPx < 1) return false;
    if (widthPx > CANVAS_MAX_SIDE_PX || heightPx > CANVAS_MAX_SIDE_PX) return false;
    return widthPx * heightPx <= CANVAS_MAX_AREA_PX;
}

// Returns a copy of `item` with every listed field coerced into range, or null
// if any of them is missing or unreadable. Returning null rather than patching
// is deliberate: a placement with no usable position is not a placement, and
// silently moving it to 0,0 would be a worse lie than dropping it.
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

// An image carries a position plus one of two ways of expressing its size, so
// only the position is required and whichever size field is present is checked.
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
    if (!Array.isArray(list)) return [];
    return list.map(sanitizeImage).filter(Boolean);
}

// Takes an untrusted saved or imported design and returns one that is safe to
// render, field by field, falling back to `defaults` for anything that is the
// wrong shape. Spreading the parsed object wholesale is what let a single null
// survive a reload and blank the canvas.
//
// Dropped placements are counted rather than passed through, and reported to
// the console in English: a corrupt entry is not something the user can fix.
export function sanitizeDesign(saved, defaults) {
    const result = structuredClone(defaults);
    if (!saved || typeof saved !== 'object') return result;

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
    result.images = sanitizeImages(saved.images);

    const dropped = countDropped(saved, result);
    if (dropped > 0) {
        console.warn(`Discarded ${dropped} item(s) with unusable geometry while loading the design.`);
    }

    return result;
}

function countDropped(saved, result) {
    const before = ['materials', 'moivres', 'images']
        .reduce((total, key) => total + (Array.isArray(saved[key]) ? saved[key].length : 0), 0);
    const after = result.materials.length + result.moivres.length + result.images.length;
    return before - after;
}
