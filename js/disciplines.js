import { state, notify } from './state.js';
import { loadJson } from './data.js';
import { showInlineNotice } from './messages.js';

let disciplinesData = {};

async function fetchDisciplines() {
  try {
    return await loadJson('./disciplines.json');
  } catch (e) {
    console.error("Could not load disciplines:", e);
    return {};
  }
}

// True for a real, selectable discipline name — not one that is merely a key
// in disciplines.json, since "custom" entries are placeholders the UI shows
// disabled and were never a value a user could have actually picked.
export function isKnownDiscipline(name) {
    const discipline = disciplinesData[name];
    return Boolean(discipline && discipline.custom !== true);
}

// Resolves a discipline name to its colours and material and writes all three
// into state. Shared by the dropdown's change handler and by import, so a
// design file's discipline is applied exactly the way picking it in the UI
// would be — rather than going through the <select> element as a side door.
export function applyDiscipline(name) {
    const discipline = disciplinesData[name];

    if (discipline && discipline.custom !== true) {
        state.discipline = name;
        state.disciplineColors = discipline.couleursRGB.map(c => `rgb(${c})`);
        state.disciplineMaterial = discipline.matière;
    } else {
        state.discipline = '';
        state.disciplineColors = [];
        state.disciplineMaterial = null;
    }
}

function populateDropdown(selector) {
  const select = document.getElementById(selector);
  const disciplineNames = Object.keys(disciplinesData);
  const maxLength = 40;

  for (const name of disciplineNames) {
    const discipline = disciplinesData[name];
    const option = document.createElement('option');
    option.value = name;
    option.title = name;
    let displayText = name;
    if (displayText.length > maxLength) {
      displayText = displayText.substring(0, maxLength - 3) + '...';
    }
    if (discipline.custom === true) {
      const fullText = `${name} (**depends, unimplemented**)`;
      option.title = fullText;
      option.textContent = `${displayText} (**depends, ...**)`;
      option.disabled = true;
    } else {
      option.textContent = displayText;
    }
    select.appendChild(option);
  }

  select.addEventListener('change', (event) => {
    applyDiscipline(event.target.value);
    notify();
  });

  if (state.discipline && disciplinesData[state.discipline]) {
    select.value = state.discipline;
  } else {
    const firstValidDisciplineName = disciplineNames.find(name => !disciplinesData[name].custom);
    if (firstValidDisciplineName) {
        select.value = firstValidDisciplineName;
    }
  }

  select.dispatchEvent(new Event('change'));
}

export async function initDisciplines(selector) {
  disciplinesData = await fetchDisciplines();

  // Nothing the user can fix — the console already has the English detail — but
  // an empty dropdown and a dropdown that failed to load look identical, and
  // one of them is worth reloading the page for.
  if (Object.keys(disciplinesData).length === 0) {
    const select = document.getElementById(selector);
    showInlineNotice(
      select?.closest('.row')?.parentElement,
      "La liste des disciplines n'a pas pu être chargée. Rechargez la page pour réessayer."
    );
  }

  populateDropdown(selector);
  return disciplinesData;
}