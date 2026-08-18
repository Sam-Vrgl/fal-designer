// js/utils.js

// Folds accents away and strips anything that is not a word character, so a
// discipline name is safe to drop into a download filename.
// \W already covers apostrophes and whitespace, so it is the whole rule.
export function sanitizeString(str) {
    if (!str) return '';
    return str.normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/\W/g, '')
              .toLowerCase();
}

// Local time, sortable, filename-safe: 2026-08-18_14-57
export function getTimestamp() {
    const d = new Date();
    const pad = (n) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
           `_${pad(d.getHours())}-${pad(d.getMinutes())}`;
}

// Every export and download in the app shares this naming scheme.
export function designFilename(discipline, extension) {
    const name = sanitizeString(discipline) || 'design';
    return `fal-design-${name}-${getTimestamp()}.${extension}`;
}

// Hands the user a file without leaving the page. Takes a URL rather than a
// blob so a caller already holding a data: URL does not have to decode it back
// into bytes just to download it.
export function downloadUrl(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

export function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    downloadUrl(url, filename);
    URL.revokeObjectURL(url);
}

// Trailing debounce: runs fn once the calls stop for ms. Used to collapse a
// burst of input events into a single undo entry.
export function debounce(fn, ms) {
    let timer = null;
    return (...args) => {
        if (timer !== null) clearTimeout(timer);
        timer = setTimeout(() => {
            timer = null;
            fn(...args);
        }, ms);
    };
}
