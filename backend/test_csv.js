const fs = require('fs');
const path = require('path');

const CSV_PATH = path.join(__dirname, '../data/daily-crop-prices.csv');

console.log('CSV Path:', CSV_PATH);
console.log('File exists:', fs.existsSync(CSV_PATH));

if (fs.existsSync(CSV_PATH)) {
  const csvContent = fs.readFileSync(CSV_PATH, 'utf8');
  const lines = csvContent.split('\n').slice(1); // Skip header
  const cropsMap = new Map();
  
  console.log('First few lines:');
  lines.slice(0, 5).forEach((line, index) => {
    console.log(`${index + 1}: ${line}`);
  });
  
  lines.forEach(line => {
    if (line.trim()) {
      const parts = line.split(',');
      if (parts.length >= 3) {
        const cropName = parts[1].trim();
        const category = parts[2].trim();
        if (cropName && category) {
          cropsMap.set(cropName.toLowerCase(), {
            name: cropName,
            category: category
          });
        }
      }
    }
  });
  
  const crops = Array.from(cropsMap.entries()).map(([key, value]) => ({
    id: key.replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
    name: value.name,
    category: value.category,
    displayName: value.name
  }));
  
  console.log(`\nFound ${crops.length} unique crops:`);
  crops.slice(0, 10).forEach(crop => {
    console.log(`- ${crop.name} (${crop.category}) -> ID: ${crop.id}`);
  });
}
