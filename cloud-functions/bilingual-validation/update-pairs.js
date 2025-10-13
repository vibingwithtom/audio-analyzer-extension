/**
 * Script to update contributor pairs in validation-data.json from CSV
 *
 * Usage: node update-pairs.js <path-to-csv>
 */

const fs = require('fs');
const path = require('path');

// Get CSV file path from command line argument
const csvPath = process.argv[2];
if (!csvPath) {
  console.error('Error: Please provide path to CSV file');
  console.error('Usage: node update-pairs.js <path-to-csv>');
  process.exit(1);
}

// Read the CSV file
console.log(`Reading CSV from: ${csvPath}`);
const csvContent = fs.readFileSync(csvPath, 'utf8');

// Parse CSV (skip header row)
const lines = csvContent.split('\n').filter(line => line.trim());
const pairs = [];

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;

  // Handle CSV with or without quotes
  const values = line.split(',').map(v => v.trim().replace(/^"(.*)"$/, '$1'));

  if (values.length >= 2 && values[0] && values[1]) {
    pairs.push([values[0], values[1]]);
  }
}

console.log(`Parsed ${pairs.length} contributor pairs from CSV`);

// Read existing validation-data.json
const validationDataPath = path.join(__dirname, 'validation-data.json');
console.log(`Reading validation data from: ${validationDataPath}`);
const validationData = JSON.parse(fs.readFileSync(validationDataPath, 'utf8'));

// Update contributor pairs
const oldPairCount = validationData.contributorPairs.length;
validationData.contributorPairs = pairs;

console.log(`Updated contributor pairs: ${oldPairCount} -> ${pairs.length}`);

// Write updated validation data back to file
fs.writeFileSync(validationDataPath, JSON.stringify(validationData, null, 2), 'utf8');
console.log(`Successfully updated ${validationDataPath}`);

// Show sample of new pairs
console.log('\nSample of updated pairs (first 5):');
pairs.slice(0, 5).forEach((pair, idx) => {
  console.log(`  ${idx + 1}. [${pair[0]}, ${pair[1]}]`);
});

console.log('\nDone! Remember to deploy the cloud function:');
console.log('  cd cloud-functions/bilingual-validation');
console.log('  gcloud functions deploy bilingualValidation \\');
console.log('    --runtime nodejs20 \\');
console.log('    --trigger-http \\');
console.log('    --allow-unauthenticated \\');
console.log('    --region us-central1');
