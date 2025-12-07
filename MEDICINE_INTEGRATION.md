# Medicine Integration Guide

## Overview
This document describes the integration of the medicines dataset (`medicines.json`) into the Njala University Clinic System, following a similar pattern to the disease integration.

## Architecture

### Database Schema
- **Medicine Model**: Added to `server/prisma/schema.prisma`
  - Fields: `id`, `name`, `generic_name`, `ndc_code`, `manufacturer`, `title`, `ingredients`, `description`, `embedding` (vector), `created_at`
  - Indexes on `name`, `generic_name`, and `ndc_code` for fast lookups
  - Optional foreign key relationship to `Prescription` model via `medicine_id`

### Data Processing
- **Seed Script**: `server/scripts/seedMedicines.js`
  - Parses `medicines.json` (285K+ lines)
  - Extracts unique medicines from products array
  - Generates vector embeddings using Xenova/all-MiniLM-L6-v2 model
  - Stores in PostgreSQL with pgvector extension

### Search Service
- **Vector Search**: Extended `server/src/services/vectorSearch.service.js`
  - `searchMedicines()`: Hybrid search (name matching + fuzzy + vector similarity)
  - `getMedicineById()`: Fetch medicine details
  - Similar to disease search but optimized for medicine data

## API Endpoints

### Doctor Module (`/api/doctor`)
- `POST /search-medicines` - Vector-based medicine search
- `GET /medicines/autocomplete?query=...` - Fast autocomplete (name/generic/NDC)
- `GET /medicines/:id` - Get medicine details

### Pharmacy Module (`/api/pharmacy`)
- `POST /search-medicines` - Vector-based medicine search
- `GET /medicines/autocomplete?query=...` - Fast autocomplete
- `GET /medicines/:id` - Get medicine details

## UI Components

### Doctor Module
- **MedicineAutocomplete** (`client/src/modules/doctor/components/MedicineAutocomplete.jsx`)
  - Autocomplete input with dropdown suggestions
  - Shows medicine name, generic name, manufacturer, NDC code
  - Integrated into prescription form in `ConsultationView`
  - Updates prescription with `medicine_id` when medicine is selected

### Pharmacy Module
- **MedicineSearch** (`client/src/modules/pharmacy/components/MedicineSearch.jsx`)
  - Modal-based search interface
  - Displays detailed medicine information
  - Shows match percentage and match type
  - Can be integrated into dispensing workflow

## Integration Points

### 1. Prescription Creation
- When doctor prescribes medication, `medicine_id` is optionally stored
- Falls back to `medication_name` string if no medicine record found
- Backward compatible with existing prescriptions

### 2. Doctor Consultation Form
- Replaced plain text input with `MedicineAutocomplete` component
- Auto-suggests medicines as user types
- Links prescription to medicine record when available

### 3. Pharmacy Workflow
- Medicine search available for verification during dispensing
- Can check medicine details, ingredients, and NDC codes
- Helps ensure correct medication is dispensed

## Usage

### Seeding Medicines Database
```bash
cd server
node scripts/seedMedicines.js
```

This will:
1. Load the embedding model (first run may take time)
2. Parse `medicines.json`
3. Extract unique medicines from products
4. Generate embeddings for each medicine
5. Insert into database with vector embeddings

### Running Database Migration
```bash
cd server
npx prisma migrate dev --name add_medicines
```

This creates the `medicines` table and updates the `prescriptions` table with `medicine_id` field.

## Data Structure

### Input (medicines.json)
```json
{
  "id": "uuid",
  "title": "Product title",
  "manufacturer": "Manufacturer name",
  "products": [
    {
      "name": "Product name",
      "ndc_code": "NDC code",
      "generic_name": "Generic name",
      "ingredients": [
        {
          "name": "Ingredient name",
          "quantity": "5",
          "unit": "mg"
        }
      ]
    }
  ]
}
```

### Database Record
- Each product becomes a medicine record
- Deduplicated by `name + ndc_code`
- Ingredients stored as formatted text
- Description auto-generated from name, generic, manufacturer, title

## Search Features

### Hybrid Search Strategy
1. **Name Matching** (Priority 1)
   - Exact match: 100% similarity
   - Starts with: 95% similarity
   - Contains: 90% similarity
   - Generic name match: 85% similarity

2. **Fuzzy Matching** (Priority 2)
   - Uses pg_trgm for typo tolerance
   - Threshold: 0.25 similarity

3. **Vector Similarity** (Priority 3)
   - Semantic search on description/ingredients
   - Minimum similarity: 0.3

### Search Fields
- Medicine name
- Generic name
- NDC code
- Manufacturer
- Description (semantic)
- Ingredients (semantic)

## Benefits

1. **Accurate Prescriptions**: Doctors can select from verified medicine database
2. **Drug Information**: Access to ingredients, NDC codes, manufacturers
3. **Fuzzy Search**: Handles typos and variations in medicine names
4. **Semantic Search**: Find medicines by description or use case
5. **Pharmacy Verification**: Pharmacists can verify prescriptions against database
6. **Data Integrity**: Links prescriptions to standardized medicine records

## Future Enhancements

1. **Stock Management**: Link medicines to inventory
2. **Drug Interactions**: Check for interactions between prescribed medicines
3. **Allergy Checking**: Verify against patient allergies
4. **Dosage Suggestions**: AI-powered dosage recommendations
5. **Medicine Images**: Display product images if available
6. **Price Information**: Add pricing data for billing

## Notes

- The medicines dataset is large (285K+ lines), so seeding may take time
- Vector embeddings require pgvector extension in PostgreSQL
- Medicine search is optional - prescriptions can still use free text
- Backward compatible with existing prescriptions that don't have `medicine_id`




