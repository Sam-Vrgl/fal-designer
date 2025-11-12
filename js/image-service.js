// js/image-service.js

import { state } from './state.js';

const imgCache = new Map();

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
        throw e;
    }
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