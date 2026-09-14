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

// Hands the user a file without leaving the page. Took a URL rather than a blob
// so that a caller holding a data: URL did not have to decode it back into
// bytes; the PNG export was the only such caller, and it uses a blob now.
//
// The object URL is revoked immediately: click() starts the download
// synchronously, so the browser is already holding the bytes by the time this
// returns.
export function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
}

// 128 random bits as hex, for ids that have to stay distinct inside a file
// and between files — the same strength as a UUID.
//
// Deliberately not crypto.randomUUID(), which exists only in a secure
// context: over plain http from anything but localhost it is undefined, and
// serving the app to a phone across the LAN is exactly that. getRandomValues
// carries no such restriction, so this is one path that works everywhere
// rather than a fallback that only ever runs where nobody is looking.
export function randomId() {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
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
