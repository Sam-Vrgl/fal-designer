// js/image-service.js

import { state } from './state.js';

// The cache and loader are now self-contained in this service.
const imgCache = new Map();

/**
 * Loads an image from a URL.
 * (Moved from js/images.js)
 */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error(`Failed to load: ${url}`));
    img.src = url;
  });
}

/**
 * Retrieves an image from the cache.
 * (Moved from js/main.js)
 */
export function getCachedImage(url) { 
    return imgCache.get(url) || null; 
}

/**
 * Ensures a specific image is loaded and cached.
 * Returns the loaded image.
 */
async function ensureImageLoaded(url) {
    if (imgCache.has(url)) {
        return imgCache.get(url);
    }
    try {
        const img = await loadImage(url);
        imgCache.set(url, img);
        return img;
    } catch (e) {
        console.error(`Failed to load image: ${url}`, e);
        throw e; // Re-throw to be handled by the caller
    }
}

/**
 * Preloads all images currently in the state.
 * (Modified from js/main.js)
 */
export async function preloadImages() {
  await Promise.allSettled(state.images.map(it => ensureImageLoaded(it.url)));
}

/**
 * A new function to add an image object to the state and ensure it's loaded.
 * This is the new way to add images.
 */
export async function addImageToState(placement) {
    // 1. Add to state first
    state.images.push(placement);
    
    // 2. Try to load it
    try {
        await ensureImageLoaded(placement.url);
    } catch (error) {
        // 3. If loading fails, remove it from the state
        console.error(`Could not load image at ${placement.url}. Removing it from the design.`, error);
        state.images = state.images.filter(img => img !== placement);
    }
}