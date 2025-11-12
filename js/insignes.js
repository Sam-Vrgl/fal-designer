// js/insignes.js

/**
 * A class to manage the insigne palette, including fetching,
 * rendering, searching, and adding session images.
 */
export class InsignePaletteService {
    constructor(paletteId, searchInputId) {
        this.paletteElement = document.getElementById(paletteId);
        this.searchInput = document.getElementById(searchInputId);
        this.sessionCategoryDiv = null;
        this.sessionItemsDiv = null;
        this.allInsigneElements = [];
    }

    async #fetchInsignes() {
        try {
            const response = await fetch('./insignes-list.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (e) {
            console.error("Could not load insignes-list.json:", e);
            return {};
        }
    }

    #createInsigneElement(name, itemData, options = {}) {
        const img = document.createElement('img');
        const path = itemData.path || itemData;
        img.src = path;
        img.title = name;
        img.loading = 'lazy';
        img.dataset.name = name;
        img.dataset.path = path;

        const explicitSize = options.sizeMm ?? itemData.size_mm;
        if (explicitSize) {
            img.dataset.sizeMm = explicitSize;
        }

        if (typeof options.heightPct === 'number') {
            img.dataset.heightPct = options.heightPct;
        }

        if (options.sessionOnly) {
            img.dataset.sessionOnly = 'true';
        }

        this.allInsigneElements.push(img);
        return img;
    }

    #createCategory(label, items, isObjectBased) {
        if (!this.paletteElement || !items || Object.keys(items).length === 0) return;

        const entries = Object.keys(items);
        if (entries.length === 0) return;

        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'category';

        const title = document.createElement('h4');
        title.textContent = label;
        categoryDiv.appendChild(title);

        const itemsDiv = document.createElement('div');
        itemsDiv.className = 'items';

        for (const name of entries) {
            const item = isObjectBased ? items[name] : { path: items[name] };
            const insigneEl = this.#createInsigneElement(name, item);
            itemsDiv.appendChild(insigneEl);
        }

        categoryDiv.appendChild(itemsDiv);
        this.paletteElement.appendChild(categoryDiv);
    }

    #ensureSessionCategory() {
        if (!this.paletteElement || this.sessionItemsDiv) return;

        this.sessionCategoryDiv = document.createElement('div');
        this.sessionCategoryDiv.className = 'category';
        this.sessionCategoryDiv.style.display = 'none';

        const title = document.createElement('h4');
        title.textContent = 'Ajouts de la session';
        this.sessionCategoryDiv.appendChild(title);

        this.sessionItemsDiv = document.createElement('div');
        this.sessionItemsDiv.className = 'items';
        this.sessionCategoryDiv.appendChild(this.sessionItemsDiv);

        this.paletteElement.appendChild(this.sessionCategoryDiv);
    }
    
    #setupSearch() {
        if (!this.searchInput) return;

        this.searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            this.allInsigneElements.forEach((img) => {
                const name = img.dataset.name.toLowerCase();
                img.style.display = name.includes(searchTerm) ? '' : 'none';
            });

            if (!this.paletteElement) return;
            this.paletteElement.querySelectorAll('.category').forEach((cat) => {
                const visibleItems = cat.querySelectorAll('img:not([style*="display: none"])');
                cat.style.display = visibleItems.length > 0 ? '' : 'none';
            });
        });
    }

    /**
     * Public method to initialize the palette.
     * Fetches and renders all insignes.
     */
    async init() {
        if (!this.paletteElement) return;

        this.allInsigneElements = [];
        this.sessionCategoryDiv = null;
        this.sessionItemsDiv = null;
        this.paletteElement.innerHTML = '';

        const insignes = await this.#fetchInsignes();

        this.#createCategory('Filière', insignes.filiere, true);
        this.#createCategory('Années', insignes.annees, true);
        this.#createCategory('Chiffre (petits)', insignes.numbers?.small, false);
        this.#createCategory('Chiffre (grands)', insignes.numbers?.big, false);
        this.#createCategory('Lettres (petites)', insignes.letters?.small, false);
        this.#createCategory('Lettres (grandes)', insignes.letters?.big, false);
        this.#createCategory('Autres', insignes.other, true);

        this.#ensureSessionCategory();
        this.#setupSearch();
    }

    /**
     * Public method to add a new user-uploaded insigne to the palette.
     */
    addSessionInsigne(url, name, options = {}) {
        this.#ensureSessionCategory(); // Will create if it doesn't exist

        const displayName = name || 'Image importée';
        const insigneEl = this.#createInsigneElement(displayName, { path: url }, {
            sizeMm: options.sizeMm,
            heightPct: options.heightPct,
            sessionOnly: true,
        });

        if (this.sessionItemsDiv) {
            this.sessionItemsDiv.appendChild(insigneEl);
            this.sessionCategoryDiv.style.display = '';
        }

        return insigneEl;
    }
}