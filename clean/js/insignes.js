/**
 * Fetches the structured list of insigne data from the JSON file.
 * @returns {Promise<object>} A promise that resolves to the structured insigne data.
 */
async function fetchInsignes() {
  try {
    const response = await fetch('./insignes-list.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (e) {
    console.error("Could not load insignes-list.json:", e);
    return {}; // Return an empty object on failure
  }
}

/**
 * Populates a <select> dropdown with categorized insignes using <optgroup>.
 * @param {string} selectorId - The ID of the <select> element.
 */
export async function initInsigneSelector(selectorId) {
    const select = document.getElementById(selectorId);
    if (!select) return;

    const insignes = await fetchInsignes();

    // Helper for simple path-based items (like letters and numbers)
    const createSimpleOptGroup = (label, items) => {
        if (!items || Object.keys(items).length === 0) return;
        const optgroup = document.createElement('optgroup');
        optgroup.label = label;
        for (const name in items) {
            const option = document.createElement('option');
            option.value = items[name];
            option.textContent = name;
            optgroup.appendChild(option);
        }
        select.appendChild(optgroup);
    };

    // Helper for object-based items (with size metadata, like filiere and annees)
    const createObjectOptGroup = (label, items) => {
        if (!items || Object.keys(items).length === 0) return;
        const optgroup = document.createElement('optgroup');
        optgroup.label = label;
        for (const name in items) {
            const item = items[name];
            const option = document.createElement('option');
            option.value = item.path;
            option.textContent = name;
            if (item.size_mm) {
                option.dataset.sizeMm = item.size_mm;
            }
            optgroup.appendChild(option);
        }
        select.appendChild(optgroup);
    };

    // Create the option groups from the structured data
    createSimpleOptGroup('Numbers (Small)', insignes.numbers.small);
    createSimpleOptGroup('Numbers (Big)', insignes.numbers.big);
    createSimpleOptGroup('Letters (Small)', insignes.letters.small);
    createSimpleOptGroup('Letters (Big)', insignes.letters.big);
    createObjectOptGroup('Filière', insignes.filiere);
    createObjectOptGroup('Années', insignes.annees);
    createObjectOptGroup('Other', insignes.other);

    // Disable the select if no options were added
    if (select.children.length === 0) {
        const option = document.createElement('option');
        option.textContent = "No insignes found";
        option.disabled = true;
        select.appendChild(option);
    }
}