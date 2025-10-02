const fs = require('fs');
const path = require('path');

// --- Configuration ---
const ASSETS_DIR = path.join(__dirname, 'clean', 'assets', 'insignes');
const OUTPUT_FILE = path.join(__dirname, 'clean', 'insignes-list.json');
const WEB_ROOT = path.join(__dirname, 'clean');

/**
 * Recursively finds and categorizes all image files.
 * @param {string} dir The directory to search.
 * @returns {object} A structured object of all found images.
 */
function findAndStructureImageFiles(dir) {
    const structure = {
        numbers: { small: {}, big: {} },
        letters: { small: {}, big: {} },
        other: {}
    };

    try {
        const categories = fs.readdirSync(dir);

        for (const categoryName of categories) {
            const categoryPath = path.join(dir, categoryName);
            if (!fs.statSync(categoryPath).isDirectory()) continue;

            const items = fs.readdirSync(categoryPath);
            let hasSizeSubDirs = items.some(item => fs.statSync(path.join(categoryPath, item)).isDirectory());

            if (hasSizeSubDirs) {
                for (const sizeDirName of items) {
                    const sizePath = path.join(categoryPath, sizeDirName);
                    if (!fs.statSync(sizePath).isDirectory()) continue;

                    // --- KEY CHANGE IS HERE ---
                    // Map folder names ('min', 'maj') to JSON keys ('small', 'big')
                    let targetSizeKey;
                    if (sizeDirName === 'petit' || sizeDirName === 'min') {
                        targetSizeKey = 'small';
                    } else if (sizeDirName === 'grand' || sizeDirName === 'maj') {
                        targetSizeKey = 'big';
                    } else {
                        continue; // Ignore unrecognized size folders
                    }

                    const files = fs.readdirSync(sizePath);
                    for (const file of files) {
                        if (!/\.(png|jpg|jpeg|gif|svg)$/i.test(file)) continue;

                        const webPath = './' + path.relative(WEB_ROOT, path.join(sizePath, file)).replace(/\\/g, '/');
                        const displayName = path.parse(file).name.replace(/_maj|_min/, '').replace(/_/g, ' ');

                        if (categoryName === 'chiffres') {
                            structure.numbers[targetSizeKey][displayName] = webPath;
                        } else if (categoryName === 'lettres') {
                             structure.letters[targetSizeKey][displayName] = webPath;
                        }
                    }
                }
            } else { // This is a category without sizes, like 'filiere'
                for (const file of items) {
                     if (!/\.(png|jpg|jpeg|gif|svg)$/i.test(file)) continue;
                     const webPath = './' + path.relative(WEB_ROOT, path.join(categoryPath, file)).replace(/\\/g, '/');
                     const displayName = path.parse(file).name.replace(/-10-mm$/, '').replace(/_/g, ' ');
                     structure.other[displayName] = webPath;
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