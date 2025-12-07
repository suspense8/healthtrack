/**
 * Clean Medicines JSON - Remove Duplicates
 * 
 * Removes duplicate medicines with the same name (regardless of manufacturer/NDC)
 * Keeps the first occurrence of each unique medicine name.
 * 
 * Usage: node scripts/cleanMedicines.js
 */

const fs = require('fs');
const path = require('path');

const JSON_PATH = path.join(__dirname, '../data/medicines.json');
const CLEANED_JSON_PATH = path.join(__dirname, '../data/medicines_cleaned.json');
const BACKUP_JSON_PATH = path.join(__dirname, '../data/medicines_backup.json');

function normalizeMedicineName(name) {
  if (!name) return '';
  // Normalize: lowercase, trim, remove extra spaces
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

function areMedicinesSame(med1, med2) {
  // Compare normalized names
  const name1 = normalizeMedicineName(med1.name);
  const name2 = normalizeMedicineName(med2.name);
  
  // Exact match
  if (name1 === name2) return true;
  
  // Check if one is contained in the other (for variations like "Aspirin" vs "Aspirin 81mg")
  // But be careful - we want exact matches primarily
  // For now, only exact matches
  return false;
}

function cleanMedicines() {
  console.log('🧹 Starting medicine cleaning process...\n');
  
  // 1. Backup original file
  console.log('📦 Creating backup of original file...');
  if (fs.existsSync(JSON_PATH)) {
    fs.copyFileSync(JSON_PATH, BACKUP_JSON_PATH);
    console.log(`   Backup created: ${BACKUP_JSON_PATH}\n`);
  } else {
    console.error(`❌ Error: ${JSON_PATH} not found!`);
    process.exit(1);
  }
  
  // 2. Read original file
  console.log('📖 Reading medicines.json...');
  const fileContent = fs.readFileSync(JSON_PATH, 'utf-8');
  const medicinesData = JSON.parse(fileContent);
  console.log(`   Found ${medicinesData.length} entries in original file.\n`);
  
  // 3. Extract all products and deduplicate
  console.log('🔍 Extracting products and finding duplicates...');
  const allProducts = [];
  const seenNames = new Map(); // name -> first occurrence
  
  let totalProducts = 0;
  let duplicateProducts = 0;
  
  for (const entry of medicinesData) {
    if (!entry.products || !Array.isArray(entry.products) || entry.products.length === 0) {
      continue;
    }
    
    for (const product of entry.products) {
      if (!product.name) continue;
      
      totalProducts++;
      const normalizedName = normalizeMedicineName(product.name);
      
      // Check if we've seen this name before
      if (seenNames.has(normalizedName)) {
        duplicateProducts++;
        // Skip this duplicate
        continue;
      }
      
      // First occurrence - keep it
      seenNames.set(normalizedName, {
        name: product.name,
        generic_name: product.generic_name,
        ndc_code: product.ndc_code,
        ingredients: product.ingredients,
        manufacturer: entry.manufacturer,
        title: entry.title
      });
      
      allProducts.push({
        name: product.name,
        generic_name: product.generic_name,
        ndc_code: product.ndc_code,
        ingredients: product.ingredients,
        manufacturer: entry.manufacturer,
        title: entry.title
      });
    }
  }
  
  console.log(`   Total products found: ${totalProducts}`);
  console.log(`   Unique products: ${allProducts.length}`);
  console.log(`   Duplicates removed: ${duplicateProducts}`);
  console.log(`   Reduction: ${((duplicateProducts / totalProducts) * 100).toFixed(2)}%\n`);
  
  // 4. Reconstruct JSON structure (group by manufacturer for cleaner output)
  console.log('📝 Reconstructing JSON structure...');
  const cleanedData = [];
  const manufacturerMap = new Map();
  
  for (const product of allProducts) {
    const manufacturer = product.manufacturer || 'Unknown';
    
    if (!manufacturerMap.has(manufacturer)) {
      manufacturerMap.set(manufacturer, {
        id: `cleaned-${manufacturerMap.size + 1}`,
        title: product.title || '',
        manufacturer: manufacturer,
        products: []
      });
    }
    
    const entry = manufacturerMap.get(manufacturer);
    entry.products.push({
      name: product.name,
      ndc_code: product.ndc_code,
      generic_name: product.generic_name,
      ingredients: product.ingredients
    });
  }
  
  cleanedData.push(...Array.from(manufacturerMap.values()));
  
  // 5. Write cleaned file
  console.log('💾 Writing cleaned data...');
  fs.writeFileSync(CLEANED_JSON_PATH, JSON.stringify(cleanedData, null, 2), 'utf-8');
  console.log(`   Cleaned file saved: ${CLEANED_JSON_PATH}\n`);
  
  // 6. Summary
  console.log('✅ Cleaning complete!\n');
  console.log('📊 Summary:');
  console.log(`   Original entries: ${medicinesData.length}`);
  console.log(`   Original products: ${totalProducts}`);
  console.log(`   Cleaned products: ${allProducts.length}`);
  console.log(`   Duplicates removed: ${duplicateProducts}`);
  console.log(`   Cleaned entries: ${cleanedData.length}`);
  console.log(`\n📁 Files:`);
  console.log(`   Original: ${JSON_PATH}`);
  console.log(`   Backup: ${BACKUP_JSON_PATH}`);
  console.log(`   Cleaned: ${CLEANED_JSON_PATH}`);
  console.log(`\n⚠️  Next steps:`);
  console.log(`   1. Review ${CLEANED_JSON_PATH} to verify cleaning`);
  console.log(`   2. If satisfied, replace original: cp ${CLEANED_JSON_PATH} ${JSON_PATH}`);
  console.log(`   3. Or use cleaned file directly in seed script`);
}

// Run if called directly
if (require.main === module) {
  try {
    cleanMedicines();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

module.exports = { cleanMedicines, normalizeMedicineName };
