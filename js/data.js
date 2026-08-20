// js/data.js
//
// The three static JSON files do not depend on each other, but startup awaited
// them one at a time so each request waited for the previous to finish. Calls
// are cached by URL, so main.js can kick all three off at once and the modules
// that need them get the in-flight promise instead of issuing a second request.

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
                // Only successes are worth remembering. Caching the rejection
                // would make the failure permanent for the life of the page,
                // with no way for a later attempt to retry.
                requests.delete(url);
                throw error;
            });
        requests.set(url, request);
    }
    return requests.get(url);
}

// Start the requests without waiting. Each caller still awaits the same promise
// and handles its own failure; the empty catch here only stops an early
// rejection being reported as unhandled before that caller arrives.
export function prefetchJson(...urls) {
    for (const url of urls) loadJson(url).catch(() => {});
}
