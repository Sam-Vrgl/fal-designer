// js/image-service.js

import { state, notify, recordStateForUndo } from './state.js';

// Images that have finished loading. The renderer looks images up
// synchronously on every frame, so this side of it holds the element itself.
const imgCache = new Map();

// Loads still in flight, keyed by url. Caching only the finished image meant
// two requests for the same one before either resolved started two downloads
// — routine, since preloading a design and drawing it both ask at once.
const inFlight = new Map();

// Urls that have already failed. Without remembering them, a 404 is
// re-requested by every preload for the life of the page.
const failed = new Set();

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error(`Failed to load: ${url}`));
    img.src = url;
  });
}


export function getCachedImage(url) {
    return imgCache.get(url) || null;
}


function ensureImageLoaded(url) {
    const loaded = imgCache.get(url);
    if (loaded) return Promise.resolve(loaded);

    if (failed.has(url)) return Promise.reject(new Error(`Previously failed to load: ${url}`));

    const pending = inFlight.get(url);
    if (pending) return pending;

    const request = loadImage(url)
        .then((img) => {
            imgCache.set(url, img);
            return img;
        })
        .catch((error) => {
            failed.add(url);
            console.error(`Failed to load image: ${url}`, error);
            throw error;
        })
        .finally(() => inFlight.delete(url));

    inFlight.set(url, request);
    return request;
}


export async function preloadImages() {
  await Promise.allSettled(state.images.map(it => ensureImageLoaded(it.url)));
}


export async function addImageToState(placement) {
    state.images.push(placement);

    try {
        await ensureImageLoaded(placement.url);
    } catch (error) {
        console.error(`Could not load image at ${placement.url}. Removing it from the design.`, error);
        state.images = state.images.filter(img => img !== placement);
    }
}


// Adds a palette entry to the design, centred on a point in grid mm. Both ways
// of placing one end up here: a pointer supplies the point it was pressed at,
// a keyboard has no such point and supplies the middle of the grid.
//
// The placement enters state immediately but settles into position once the
// file has loaded, because how wide it ends up is its height times the image's
// own aspect ratio, and nothing knows that until there is an image to ask.
export function placeInsigne(insigneToPlace, centre) {
    const { path, sizeMm, heightPct, sessionOnly } = insigneToPlace;

    const placement = { url: path, x_mm: 0, y_mm: 0 };
    if (sessionOnly) placement.sessionOnly = true;

    // Every palette entry now carries its physical size, so there is nothing
    // left to infer from the file path.
    if (sizeMm) placement.height_mm = parseInt(sizeMm, 10);
    else if (typeof heightPct === 'number' && !Number.isNaN(heightPct)) placement.heightPct = heightPct;
    else placement.heightPct = 0.5;

    addImageToState(placement).then(() => {
        const img = getCachedImage(placement.url);
        if (!img) return;

        const h_mm = placement.height_mm || (placement.heightPct * state.gridHmm);
        const w_mm = h_mm * (img.naturalWidth / img.naturalHeight);
        placement.x_mm = centre.x_mm - w_mm / 2;
        placement.y_mm = centre.y_mm - h_mm / 2;
        recordStateForUndo();
        notify();
    });

    return placement;
}