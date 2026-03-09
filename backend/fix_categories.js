require('dotenv').config();
const db = require('./db');
const { categorizeComplaint } = require('./services/processData');

async function fixCategories() {
  console.log('Fetching Other complaints...');
  const res = await db.query("SELECT id, complaint_text FROM complaints WHERE complaint_category = 'Other'");
  
  let updated = 0;
  for (const row of res.rows) {
    const newCat = categorizeComplaint(row.complaint_text);
    if (newCat !== 'Other') {
      await db.query("UPDATE complaints SET complaint_category = $1 WHERE id = $2", [newCat, row.id]);
      updated++;
    }
  }
  console.log(`Updated ${updated} rows from Other to new categories.`);
  process.exit(0);
}

fixCategories();
