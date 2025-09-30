// js/images.js
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error(`Failed to load: ${url}`));
    img.src = url; // relative to index.html
  });
}
