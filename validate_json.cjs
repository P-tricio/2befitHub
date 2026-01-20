const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'exercisedb_catalog_2026-01-17.json');

try {
    const content = fs.readFileSync(filePath, 'utf8');
    JSON.parse(content);
    console.log('JSON is valid.');
} catch (error) {
    console.error('JSON is invalid:', error.message);
    process.exit(1);
}
