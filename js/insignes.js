// js/insignes.js

import { loadJson } from './data.js';
import { showInlineNotice } from './messages.js';
import { debounce } from './utils.js';

const SEARCH_DEBOUNCE_MS = 120;


export class InsignePaletteService {
    constructor(paletteId, searchInputId) {
        this.paletteElement = document.getElementById(paletteId);
        this.searchInput = document.getElementById(searchInputId);
        this.sessionCategoryDiv = null;
        this.sessionItemsDiv = null;
        this.allInsigneElements = [];
        this.tabStop = null;
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

        img.alt = name;
        img.setAttribute('role', 'button');
        img.tabIndex = -1;

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
        this.sessionCategoryDiv.className = 'category is-hidden';

        const title = document.createElement('h4');
        title.textContent = 'Ajouts de la session';
        this.sessionCategoryDiv.appendChild(title);

        this.sessionItemsDiv = document.createElement('div');
        this.sessionItemsDiv.className = 'items';
        this.sessionCategoryDiv.appendChild(this.sessionItemsDiv);

        this.paletteElement.appendChild(this.sessionCategoryDiv);
    }
    
    #applySearch(term) {
        const searchTerm = term.trim().toLowerCase();

        for (const img of this.allInsigneElements) {
            const matches = img.dataset.name.toLowerCase().includes(searchTerm);
            img.classList.toggle('is-hidden', !matches);
        }

        if (this.paletteElement) {
            for (const category of this.paletteElement.querySelectorAll('.category')) {
                const images = [...category.querySelectorAll('img')];
                const hasMatch = images.some((img) => !img.classList.contains('is-hidden'));
                category.classList.toggle('is-hidden', !hasMatch);
            }
        }

        this.#ensureTabStop();
    }

    #setupSearch() {
        if (!this.searchInput) return;

        const search = debounce(() => this.#applySearch(this.searchInput.value), SEARCH_DEBOUNCE_MS);
        this.searchInput.addEventListener('input', search);
    }

    #setupRovingFocus() {
        this.paletteElement?.addEventListener('focusin', (e) => {
            if (e.target.tagName === 'IMG') this.#setTabStop(e.target);
        });
    }

    #visibleInsignes() {
        return this.allInsigneElements.filter((img) => img.offsetParent !== null);
    }

    #setTabStop(img) {
        if (this.tabStop) this.tabStop.tabIndex = -1;
        this.tabStop = img;
        if (img) img.tabIndex = 0;
    }

    #ensureTabStop() {
        if (this.tabStop?.offsetParent) return;
        this.#setTabStop(this.#visibleInsignes()[0] ?? null);
    }

    focusRelative(step) {
        const visible = this.#visibleInsignes();
        if (visible.length === 0) return;

        const current = visible.indexOf(document.activeElement);
        const next = visible[(current + step + visible.length) % visible.length];
        this.#setTabStop(next);
        next.focus();
    }


    async init() {
        if (!this.paletteElement) return;

        this.allInsigneElements = [];
        this.sessionCategoryDiv = null;
        this.sessionItemsDiv = null;
        this.tabStop = null;
        this.paletteElement.innerHTML = '';

        const insignes = await this.#fetchInsignes();

        if (Object.keys(insignes).length === 0) {
            showInlineNotice(
                this.paletteElement,
                "La palette d'insignes n'a pas pu être chargée. Rechargez la page pour réessayer."
            );
        }

        this.#createCategory('Filière', insignes.filiere);
        this.#createCategory('Années', insignes.annees);
        this.#createCategory('Chiffre (petits)', insignes.numbers?.small);
        this.#createCategory('Chiffre (grands)', insignes.numbers?.big);
        this.#createCategory('Lettres (petites)', insignes.letters?.small);
        this.#createCategory('Lettres (grandes)', insignes.letters?.big);
        this.#createCategory('Autres', insignes.other);

        this.#ensureSessionCategory();
        this.#setupSearch();
        this.#setupRovingFocus();
        this.#ensureTabStop();
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
            this.sessionCategoryDiv.classList.remove('is-hidden');
        }

        this.#ensureTabStop();
        return insigneEl;
    }
}