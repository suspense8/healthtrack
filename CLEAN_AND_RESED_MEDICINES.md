# Clean and Reseed Medicines Database

## Overview
This process will:
1. Clean the medicines.json file by removing duplicates (same name, different brands)
2. Clear existing medicines from the database
3. Reseed with the cleaned data

## Step-by-Step Instructions

### Step 1: Clean the Medicines JSON File

```bash
cd server
node scripts/cleanMedicines.js
```

This will:
- Create a backup of the original `medicines.json` as `medicines_backup.json`
- Generate a cleaned version as `medicines_cleaned.json`
- Remove duplicates based on normalized medicine names
- Show statistics about duplicates removed

**Output:**
- `server/data/medicines_backup.json` - Original file backup
- `server/data/medicines_cleaned.json` - Cleaned file (no duplicates)

### Step 2: Review the Cleaned File (Optional)

```bash
# Check the cleaned file
cat server/data/medicines_cleaned.json | head -50

# Compare counts
echo "Original entries:" && cat server/data/medicines.json | jq '. | length'
echo "Cleaned entries:" && cat server/data/medicines_cleaned.json | jq '. | length'
```

### Step 3: Clear Existing Medicines from Database

```bash
cd server
node scripts/clearMedicines.js
```

This will:
- Delete all medicines from the database
- Reset the sequence counter
- Preserve prescriptions (but set `medicine_id` to NULL)

**⚠️ Warning:** This removes all medicines. Make sure you want to proceed.

### Step 4: Replace Original File (Optional)

If you want to use the cleaned file as the new default:

```bash
cd server/data
cp medicines_cleaned.json medicines.json
```

Or keep both and the seed script will automatically use `medicines_cleaned.json` if it exists.

### Step 5: Reseed Medicines

```bash
cd server
node scripts/seedMedicines.js
```

This will:
- Use `medicines_cleaned.json` if it exists, otherwise `medicines.json`
- Parse and deduplicate medicines
- Generate vector embeddings for each medicine
- Insert into database with inventory fields (quantity=0 by default)

**Note:** This process may take a while depending on the number of medicines and your system performance.

### Step 6: Set Initial Inventory (Optional)

After seeding, set initial inventory values:

```bash
cd server
node scripts/seedInventory.js --default-quantity=100 --default-reorder=10 --unit=units
```

Or use the UI:
1. Login as pharmacist
2. Go to Pharmacy → Inventory Management
3. Click "Bulk Update"

## Complete Command Sequence

```bash
# 1. Clean medicines JSON
cd server
node scripts/cleanMedicines.js

# 2. Clear database
node scripts/clearMedicines.js

# 3. Reseed with cleaned data
node scripts/seedMedicines.js

# 4. Set initial inventory (optional)
node scripts/seedInventory.js --default-quantity=100 --default-reorder=10
```

## Verification

After reseeding, verify the data:

```bash
# Check medicine count
cd server
npx prisma studio
# Or use SQL:
# SELECT COUNT(*) FROM medicines;
# SELECT name, COUNT(*) FROM medicines GROUP BY name HAVING COUNT(*) > 1;
```

## Rollback

If something goes wrong:

```bash
# Restore original file
cd server/data
cp medicines_backup.json medicines.json

# Clear and reseed with original
node scripts/clearMedicines.js
node scripts/seedMedicines.js
```

## Notes

- The cleaning script removes duplicates based on **normalized medicine names** (case-insensitive, trimmed)
- Only the **first occurrence** of each medicine name is kept
- Manufacturer and NDC code differences are ignored for deduplication
- Prescriptions are preserved but will have `medicine_id = NULL` after clearing
- The seed script automatically uses `medicines_cleaned.json` if it exists
