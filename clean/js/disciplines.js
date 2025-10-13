import { state, notify } from './state.js';

let disciplinesData = {};

async function fetchDisciplines() {
  try {
    const response = await fetch('./disciplines.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (e) {
    console.error("Could not load disciplines:", e);
    return {};
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
    const selectedDisciplineName = event.target.value;
    const discipline = disciplinesData[selectedDisciplineName];

    if (discipline && discipline.custom !== true) {
      const colors = discipline.couleursRGB.map(c => `rgb(${c})`);
      state.disciplineColors = colors;
      state.disciplineMaterial = discipline.matière;
    } else {
      state.disciplineColors = [];
      state.disciplineMaterial = null;
    }
    notify();
  });

  const firstValidDisciplineName = disciplineNames.find(name => !disciplinesData[name].custom);
  if (firstValidDisciplineName) {
      const firstDiscipline = disciplinesData[firstValidDisciplineName];
      select.value = firstValidDisciplineName;
      state.disciplineColors = firstDiscipline.couleursRGB.map(c => `rgb(${c})`);
      state.disciplineMaterial = firstDiscipline.matière;
  }
}

export async function initDisciplines(selector) {
  disciplinesData = await fetchDisciplines();
  populateDropdown(selector);
}