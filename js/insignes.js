// js/insignes.js

import { loadJson } from './data.js';


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
            return await loadJson('./insignes-list.json');
        } catch (e) {
            console.error("Could not load insignes-list.json:", e);
            return {};
        }
    }

    #createInsigneElement(name, itemData, options = {}) {
        const img = document.createElement('img');
        const path = itemData.path;
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

    // Some categories in insignes-list.json store a bare path string, others an
    // object with a size. Normalise here so everything downstream sees one shape.
    static #normalise(item) {
        return typeof item === 'string' ? { path: item } : item;
    }

    #createCategory(label, items) {
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
            const insigneEl = this.#createInsigneElement(name, InsignePaletteService.#normalise(items[name]));
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


    async init() {
        if (!this.paletteElement) return;

        this.allInsigneElements = [];
        this.sessionCategoryDiv = null;
        this.sessionItemsDiv = null;
        this.paletteElement.innerHTML = '';

        const insignes = await this.#fetchInsignes();

        this.#createCategory('Filière', insignes.filiere);
        this.#createCategory('Années', insignes.annees);
        this.#createCategory('Chiffre (petits)', insignes.numbers?.small);
        this.#createCategory('Chiffre (grands)', insignes.numbers?.big);
        this.#createCategory('Lettres (petites)', insignes.letters?.small);
        this.#createCategory('Lettres (grandes)', insignes.letters?.big);
        this.#createCategory('Autres', insignes.other);

        this.#ensureSessionCategory();
        this.#setupSearch();
    }


    addSessionInsigne(url, name, options = {}) {
        this.#ensureSessionCategory();

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