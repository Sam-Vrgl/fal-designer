// js/data.js

const requests = new Map();

export function loadJson(url) {
    if (!requests.has(url)) {
        const request = fetch(url)
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Could not load ${url}: HTTP ${response.status}`);
                }
                return response.json();
            })
            .catch((error) => {
                requests.delete(url);
                throw error;
            });
        requests.set(url, request);
    }
    return requests.get(url);
}

export function prefetchJson(...urls) {
    for (const url of urls) loadJson(url).catch(() => {});
}
