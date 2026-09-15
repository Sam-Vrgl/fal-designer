// js/utils.js

export function sanitizeString(str) {
    if (!str) return '';
    return str.normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/\W/g, '')
              .toLowerCase();
}

export function getTimestamp() {
    const d = new Date();
    const pad = (n) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
           `_${pad(d.getHours())}-${pad(d.getMinutes())}`;
}

export function designFilename(discipline, extension) {
    const name = sanitizeString(discipline) || 'design';
    return `fal-design-${name}-${getTimestamp()}.${extension}`;
}

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

export function randomId() {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

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
