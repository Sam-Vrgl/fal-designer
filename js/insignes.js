// js/insignes.js

import { loadJson } from './data.js';
import { showInlineNotice } from './messages.js';


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

        // Picking an insigne is the one thing this palette does, and it was a
        // click on a decorative image — unreachable by keyboard and nameless
        // to a screen reader. alt carries the name, and the role makes it the
        // button it already behaved as.
        //
        // -1 because the palette is a roving tabindex: one entry holds the
        // tab stop and the arrows move between them. Several hundred separate
        // tab stops would be reachable but not usable.
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

            // A search can hide whichever entry was holding the tab stop.
            this.#ensureTabStop();
        });
    }

    // Focus reached an entry some other way — a click, or the browser
    // restoring it — so the stop follows, and tabbing back in returns to
    // where the user actually was.
    #setupRovingFocus() {
        this.paletteElement?.addEventListener('focusin', (e) => {
            if (e.target.tagName === 'IMG') this.#setTabStop(e.target);
        });
    }

    // offsetParent goes null when the element or a parent is display:none,
    // which is exactly what the search filter does to both entries and the
    // categories holding them.
    #visibleInsignes() {
        return this.allInsigneElements.filter((img) => img.offsetParent !== null);
    }

    #setTabStop(img) {
        if (this.tabStop) this.tabStop.tabIndex = -1;
        this.tabStop = img;
        if (img) img.tabIndex = 0;
    }

    // Exactly one visible entry must carry tabindex="0", or Tab passes the
    // palette by entirely.
    #ensureTabStop() {
        if (this.tabStop?.offsetParent) return;
        this.#setTabStop(this.#visibleInsignes()[0] ?? null);
    }

    // Moves focus by `step` entries, wrapping at both ends. The palette is a
    // wrapping grid whose column count follows the container width, so the
    // arrows walk it in document order rather than pretending to know rows.
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

        // Same reasoning as the discipline list: the detail is already in the
        // console for whoever can fix it, but a blank palette should say why it
        // is blank rather than leaving the tool looking empty.
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
            this.sessionCategoryDiv.style.display = '';
        }

        this.#ensureTabStop();
        return insigneEl;
    }
}