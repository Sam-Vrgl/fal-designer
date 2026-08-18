const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const ASSETS_DIR = path.join(PROJECT_ROOT, 'assets', 'insignes');
const OUTPUT_FILE = path.join(PROJECT_ROOT, 'insignes-list.json');

const IMAGE_PATTERN = /\.(png|jpg|jpeg|gif|svg|webp)$/i;

// Letters and digits are one artwork set offered at two physical sizes, not two
// sets of artwork. A single file backs both palette entries; only size_mm
// differs. The source directories are still named maj/grand for historical
// reasons — they hold the only copy, at both sizes.
const SIZE_MM = { small: 10, big: 18 };
const SIZED_SETS = [
    { source: ['lettres', 'maj'], target: 'letters' },
    { source: ['chiffres', 'grand'], target: 'numbers' },
];

// Symbols offered under more than one heading are stored once and referenced
// from the others, rather than duplicated on disk.
const CROSS_CATEGORY = {
    annees: ['filiere/beta-24mm.webp', 'filiere/phi-24mm.webp', 'filiere/psi-24mm.webp'],
};

function webPath(absolutePath) {
    return './' + path.relative(PROJECT_ROOT, absolutePath).replace(/\\/g, '/');
}

function listImages(dir) {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir).filter((file) => IMAGE_PATTERN.test(file));
}

// "caducee-de-mercure-32mm.webp" -> { name: "caducee de mercure", size_mm: 32 }
function describeInsigne(file) {
    const match = file.match(/-(\d+)mm\./i);
    return {
        name: path.parse(file).name.replace(/-\d+mm$/, '').replace(/-/g, ' '),
        size_mm: match ? parseInt(match[1], 10) : null,
    };
}

function buildSizedSet(structure) {
    for (const { source, target } of SIZED_SETS) {
        const dir = path.join(ASSETS_DIR, ...source);
        for (const file of listImages(dir)) {
            const name = path.parse(file).name.replace(/_maj|_min/, '').replace(/_/g, ' ');
            const shared = webPath(path.join(dir, file));
            for (const [key, size_mm] of Object.entries(SIZE_MM)) {
                structure[target][key][name] = { path: shared, size_mm };
            }
        }
    }
}

function buildFlatCategory(structure, categoryName) {
    const dir = path.join(ASSETS_DIR, categoryName);
    // Anything that is not a known heading lands under "other".
    const target = ['filiere', 'annees'].includes(categoryName) ? categoryName : 'other';

    for (const file of listImages(dir)) {
        const { name, size_mm } = describeInsigne(file);
        structure[target][name] = { path: webPath(path.join(dir, file)), size_mm };
    }
}

function addCrossCategoryEntries(structure) {
    for (const [category, sources] of Object.entries(CROSS_CATEGORY)) {
        for (const relative of sources) {
            const absolute = path.join(ASSETS_DIR, relative);
            if (!fs.existsSync(absolute)) {
                console.warn(`⚠️  ${category}: ${relative} is missing, skipping`);
                continue;
            }
            const { name, size_mm } = describeInsigne(path.basename(relative));
            structure[category][name] = { path: webPath(absolute), size_mm };
        }
    }
}

function findAndStructureImageFiles() {
    const structure = {
        numbers: { small: {}, big: {} },
        letters: { small: {}, big: {} },
        filiere: {},
        annees: {},
        other: {},
    };

    buildSizedSet(structure);

    const handledDirs = new Set(['lettres', 'chiffres']);
    for (const entry of fs.readdirSync(ASSETS_DIR)) {
        if (handledDirs.has(entry)) continue;
        if (!fs.statSync(path.join(ASSETS_DIR, entry)).isDirectory()) continue;
        buildFlatCategory(structure, entry);
    }

    addCrossCategoryEntries(structure);
    return structure;
}

console.log(`🔍 Scanning ${ASSETS_DIR}`);
try {
    const structured = findAndStructureImageFiles();
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(structured, null, 2) + '\n');
    const count = (o) => Object.keys(o).length;
    console.log(`✅ Wrote ${OUTPUT_FILE}`);
    console.log(`   letters ${count(structured.letters.small)}×2  numbers ${count(structured.numbers.small)}×2  ` +
                `filiere ${count(structured.filiere)}  annees ${count(structured.annees)}  other ${count(structured.other)}`);
} catch (error) {
    console.error(`❌ Failed to generate ${OUTPUT_FILE}:`, error);
    process.exitCode = 1;
}
