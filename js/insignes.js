async function fetchInsignes() {
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

export async function initInsignePalette(paletteId, searchInputId) {
    const palette = document.getElementById(paletteId);
    const searchInput = document.getElementById(searchInputId);
    if (!palette) return;

    const insignes = await fetchInsignes();
    let allInsigneElements = [];

    const createInsigneElement = (name, itemData) => {
        const img = document.createElement('img');
        const path = itemData.path || itemData;
        img.src = path;
        img.title = name;
        img.dataset.name = name;
        img.dataset.path = path;
        if (itemData.size_mm) {
            img.dataset.sizeMm = itemData.size_mm;
        }
        return img;
    };

    const createCategory = (label, items, isObjectBased) => {
        if (!items || Object.keys(items).length === 0) return;

        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'category';

        const title = document.createElement('h4');
        title.textContent = label;
        categoryDiv.appendChild(title);

        const itemsDiv = document.createElement('div');
        itemsDiv.className = 'items';

        for (const name in items) {
            const item = isObjectBased ? items[name] : { path: items[name] };
            const insigneEl = createInsigneElement(name, item);
            itemsDiv.appendChild(insigneEl);
            allInsigneElements.push(insigneEl);
        }
        categoryDiv.appendChild(itemsDiv);
        palette.appendChild(categoryDiv);
    };

    createCategory('Filière', insignes.filiere, true);
    createCategory('Années', insignes.annees, true);
    createCategory('Numbers (Small)', insignes.numbers.small, false);
    createCategory('Letters (Small)', insignes.letters.small, false);
    createCategory('Letters (Big)', insignes.letters.big, false);
    createCategory('Other', insignes.other, true);

    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        allInsigneElements.forEach(img => {
            const name = img.dataset.name.toLowerCase();
            const category = img.closest('.category');
            if (name.includes(searchTerm)) {
                img.style.display = '';
            } else {
                img.style.display = 'none';
            }
        });

        palette.querySelectorAll('.category').forEach(cat => {
            const visibleItems = cat.querySelectorAll('img:not([style*="display: none"])');
            cat.style.display = visibleItems.length > 0 ? '' : 'none';
        });
    });
}