const fs = require('fs');
const path = require('path');

// --- Configuration ---
// MODIFIED: Paths are now relative to the script's location inside the 'extras' folder.
// '..' is used to navigate up one level to the project root.
const PROJECT_ROOT = path.join(__dirname, '..');
const ASSETS_DIR = path.join(PROJECT_ROOT, 'assets', 'insignes');
const OUTPUT_FILE = path.join(PROJECT_ROOT, 'insignes-list.json');

/**
 * Recursively finds and categorizes all image files.
 * @param {string} dir The directory to search.
 * @returns {object} A structured object of all found images.
 */
function findAndStructureImageFiles(dir) {
    const structure = {
        numbers: { small: {}, big: {} },
        letters: { small: {}, big: {} },
        filiere: {},
        annees: {},
        other: {}
    };

    try {
        const categories = fs.readdirSync(dir);

        for (const categoryName of categories) {
            const categoryPath = path.join(dir, categoryName);
            if (!fs.statSync(categoryPath).isDirectory()) continue;

            // --- Logic to handle different category types ---
            if (categoryName === 'chiffres' || categoryName === 'lettres') {
                // Categories with size subdirectories (petit/grand)
                const items = fs.readdirSync(categoryPath);
                for (const sizeDirName of items) {
                    const sizePath = path.join(categoryPath, sizeDirName);
                    if (!fs.statSync(sizePath).isDirectory()) continue;
                    
                    let targetSizeKey;
                    if (sizeDirName === 'petit' || sizeDirName === 'min') targetSizeKey = 'small';
                    else if (sizeDirName === 'grand' || sizeDirName === 'maj') targetSizeKey = 'big';
                    else continue;

                    const files = fs.readdirSync(sizePath);
                    for (const file of files) {
                        if (!/\.(png|jpg|jpeg|gif|svg)$/i.test(file)) continue;
                        // MODIFIED: Correctly calculate the web path relative to the project root
                        const webPath = './' + path.relative(PROJECT_ROOT, path.join(sizePath, file)).replace(/\\/g, '/');
                        const displayName = path.parse(file).name.replace(/_maj|_min/, '').replace(/_/g, ' ');
                        
                        if (categoryName === 'chiffres') structure.numbers[targetSizeKey][displayName] = webPath;
                        else structure.letters[targetSizeKey][displayName] = webPath;
                    }
                }
            } else {
                // Categories without size subdirectories (filiere, annees, other)
                const items = fs.readdirSync(categoryPath);
                for (const file of items) {
                     if (!/\.(png|jpg|jpeg|gif|svg)$/i.test(file)) continue;
                     
                     // MODIFIED: Correctly calculate the web path relative to the project root
                     const webPath = './' + path.relative(PROJECT_ROOT, path.join(categoryPath, file)).replace(/\\/g, '/');
                     const match = file.match(/-(\d+)mm\./i);
                     const size = match ? parseInt(match[1], 10) : null;
                     const displayName = path.parse(file).name.replace(/-\d+mm$/, '').replace(/-/g, ' ');
                     
                     const insigneData = { path: webPath, size_mm: size };

                     // Place the data in the correct category
                     if (categoryName === 'filiere') {
                        structure.filiere[displayName] = insigneData;
                     } else if (categoryName === 'annees') {
                        structure.annees[displayName] = insigneData;
                     } else {
                        // All other folders (like 'pays') are considered 'other'
                         if (!structure.other[categoryName]) {
                            structure.other[categoryName] = {};
                        }
                        structure.other[categoryName][displayName] = insigneData;
                     }
                }
            }
        }
    } catch (error) {
        console.error(`Error processing directory ${dir}:`, error);
    }
    return structure;
}

// --- Main Execution ---
console.log(`🔍 Starting structured scan in: ${ASSETS_DIR}`);
const structuredInsignes = findAndStructureImageFiles(ASSETS_DIR);

try {
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(structuredInsignes, null, 2));
    console.log(`✅ Success! Generated structured JSON at ${OUTPUT_FILE}`);
} catch (error) {
    console.error(`❌ Error writing to output file ${OUTPUT_FILE}:`, error);
}