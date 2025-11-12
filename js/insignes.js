let paletteElement = null;
let sessionCategoryDiv = null;
let sessionItemsDiv = null;
let allInsigneElements = [];
const pendingSessionAdditions = [];

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

function createInsigneElement(name, itemData, options = {}) {
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

  allInsigneElements.push(img);
  return img;
}

function createCategory(label, items, isObjectBased) {
  if (!paletteElement || !items || Object.keys(items).length === 0) return;

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
    const insigneEl = createInsigneElement(name, item);
    itemsDiv.appendChild(insigneEl);
  }

  categoryDiv.appendChild(itemsDiv);
  paletteElement.appendChild(categoryDiv);
}

function ensureSessionCategory() {
  if (!paletteElement || sessionItemsDiv) return;

  sessionCategoryDiv = document.createElement('div');
  sessionCategoryDiv.className = 'category';
  sessionCategoryDiv.style.display = 'none';

  const title = document.createElement('h4');
  title.textContent = 'Ajouts de la session';
  sessionCategoryDiv.appendChild(title);

  sessionItemsDiv = document.createElement('div');
  sessionItemsDiv.className = 'items';
  sessionCategoryDiv.appendChild(sessionItemsDiv);

  paletteElement.appendChild(sessionCategoryDiv);
}

function appendSessionInsigne(url, name, options = {}) {
  ensureSessionCategory();

  const displayName = name || 'Image importée';
  const insigneEl = createInsigneElement(displayName, { path: url }, {
    sizeMm: options.sizeMm,
    heightPct: options.heightPct,
    sessionOnly: true,
  });

  if (sessionItemsDiv) {
    sessionItemsDiv.appendChild(insigneEl);
    sessionCategoryDiv.style.display = '';
  }

  return insigneEl;
}

function setupSearch(searchInput) {
  if (!searchInput) return;

  searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    allInsigneElements.forEach((img) => {
      const name = img.dataset.name.toLowerCase();
      img.style.display = name.includes(searchTerm) ? '' : 'none';
    });

    if (!paletteElement) return;
    paletteElement.querySelectorAll('.category').forEach((cat) => {
      const visibleItems = cat.querySelectorAll('img:not([style*="display: none"])');
      cat.style.display = visibleItems.length > 0 ? '' : 'none';
    });
  });
}

export async function initInsignePalette(paletteId, searchInputId) {
  paletteElement = document.getElementById(paletteId);
  const searchInput = document.getElementById(searchInputId);
  if (!paletteElement) return;

  allInsigneElements = [];
  sessionCategoryDiv = null;
  sessionItemsDiv = null;
  paletteElement.innerHTML = '';

  const insignes = await fetchInsignes();

  createCategory('Filière', insignes.filiere, true);
  createCategory('Années', insignes.annees, true);
  createCategory('Chiffre (petits)', insignes.numbers?.small, false);
  createCategory('Chiffre (grands)', insignes.numbers?.big, false);
  createCategory('Lettres (petites)', insignes.letters?.small, false);
  createCategory('Lettres (grandes)', insignes.letters?.big, false);
  createCategory('Autres', insignes.other, true);

  ensureSessionCategory();
  setupSearch(searchInput);

  if (pendingSessionAdditions.length > 0) {
    const queue = pendingSessionAdditions.splice(0, pendingSessionAdditions.length);
    queue.forEach(({ url, name, options }) => appendSessionInsigne(url, name, options));
  }
}

export function addSessionInsigne(url, name, options = {}) {
  if (!paletteElement) {
    pendingSessionAdditions.push({ url, name, options });
    return null;
  }

  return appendSessionInsigne(url, name, options);
}
