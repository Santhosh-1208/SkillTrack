const fs = require('fs');
const path = require('path');
const jsonPath = path.join(__dirname, 'collections.json');
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

db = db.getSiblingDB('skilltrackv1');

for (const [colName, docs] of Object.entries(data)) {
    if (Array.isArray(docs) && docs.length > 0) {
        // Drop existing collection to avoid duplicates
        db[colName].drop();
        
        // Insert new documents
        const res = db[colName].insertMany(docs);
        print(`Successfully inserted ${docs.length} documents into collection: ${colName}`);
    } else {
        print(`Skipped ${colName} (no documents found)`);
    }
}
