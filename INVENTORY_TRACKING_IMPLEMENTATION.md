# Inventory Tracking System Implementation

## Overview
Complete inventory tracking system for the pharmacy module that tracks medicine quantities, manages stock levels, and integrates with the entire prescription pipeline.

## Database Changes

### Migration
Run the migration to add inventory fields to the medicines table:

```bash
cd server
npx prisma migrate dev --name add_inventory_tracking
```

Or manually run the SQL migration:
```bash
cd server/prisma/migrations/add_inventory_tracking
# Review migration.sql, then apply it to your database
```

### Schema Updates
The `Medicine` model now includes:
- `quantity` (Int, default: 0) - Current stock quantity
- `reorder_level` (Int, default: 10) - Minimum stock before reorder alert
- `unit` (String, default: 'units') - Unit of measurement
- `last_restocked` (DateTime?) - Last restock timestamp
- `last_restocked_by` (Int?) - User who last restocked

## Backend API Endpoints

### Inventory Management
- `GET /api/pharmacy/inventory` - Get all medicines with inventory (supports search, filters, pagination)
- `GET /api/pharmacy/inventory/stats` - Get inventory statistics
- `PATCH /api/pharmacy/inventory/:id` - Update single medicine inventory
- `POST /api/pharmacy/inventory/bulk` - Bulk update inventory (for initial seeding)

### Updated Endpoints
- `GET /api/pharmacy/queue` - Now includes stock status for each prescription
- `PATCH /api/pharmacy/prescriptions/:id/dispense` - Checks stock and decrements quantity
- `GET /api/pharmacy/medicines/autocomplete` - Includes quantity information
- `POST /api/pharmacy/search-medicines` - Includes quantity information
- `GET /api/doctor/medicines/autocomplete` - Includes quantity information

## Frontend Components

### New Components
1. **InventoryManagement.jsx** - Main inventory management interface
   - View all medicines with stock levels
   - Filter by low stock, out of stock
   - Update individual medicine inventory
   - Search functionality
   - Pagination

2. **BulkInventoryUpdate.jsx** - Bulk update modal
   - Updates all low/zero stock medicines
   - Sets default quantities

### Updated Components
1. **PharmacyQueue.jsx** - Shows stock status for each prescription
   - Displays "Out of Stock", "Low Stock", or "In Stock" badges
   - Disables dispense button for out-of-stock medicines
   - Shows available quantity in dispense modal

2. **MedicineAutocomplete.jsx** (Doctor) - Shows stock information
   - Displays stock badges in suggestions
   - Shows quantity and unit
   - Highlights low/out of stock medicines

3. **PharmacyDashboard.jsx** - Added "Inventory Management" tab

## Workflow Integration

### Prescription Flow
1. **Doctor prescribes medicine** → Medicine autocomplete shows stock status
2. **Prescription created** → Linked to medicine record (if available)
3. **Pharmacy queue** → Shows stock status for each prescription
4. **Dispense** → 
   - Checks if sufficient stock available
   - Decrements quantity automatically
   - Prevents dispensing if out of stock
5. **Stockout** → Pharmacist can mark as stockout, doctor notified

### Stock Management Flow
1. **Initial Seeding** → Use seed script or bulk update
2. **Daily Management** → Pharmacist updates inventory via UI
3. **Low Stock Alerts** → Medicines below reorder level highlighted
4. **Restocking** → Update quantity, system tracks who and when

## Seeding Initial Inventory

### Option 1: Using the Seed Script
```bash
cd server
node scripts/seedInventory.js --default-quantity=100 --default-reorder=10 --unit=units
```

Options:
- `--default-quantity=N` - Set default quantity (default: 100)
- `--default-reorder=N` - Set default reorder level (default: 10)
- `--unit=UNIT` - Set default unit (default: 'units')
- `--low-stock-only` - Only update medicines with quantity <= reorder_level
- `--zero-only` - Only update medicines with quantity = 0

### Option 2: Using Bulk Update API
Use the "Bulk Update" button in the Inventory Management UI, which will:
- Update all zero stock medicines to 100 units
- Update all low stock medicines to reorder_level + 50

### Option 3: Manual Entry
Use the Inventory Management interface to update medicines individually.

## Features

### Stock Status Indicators
- **Green Badge**: In Stock (quantity > reorder_level)
- **Orange Badge**: Low Stock (quantity <= reorder_level but > 0)
- **Red Badge**: Out of Stock (quantity = 0)

### Automatic Stock Decrement
When a prescription is dispensed:
1. System checks if medicine is linked (has `medicine_id`)
2. Verifies sufficient stock available
3. Decrements quantity automatically
4. Prevents dispensing if insufficient stock

### Stock Alerts
- Low stock medicines highlighted in inventory list
- Out of stock medicines cannot be dispensed
- Stock status shown in prescription queue
- Doctor sees stock status when prescribing

## Usage Examples

### Viewing Inventory
1. Navigate to Pharmacy → Inventory Management
2. Use filters to find low stock or out of stock medicines
3. Search by name, generic name, or NDC code

### Updating Stock
1. Click "Update" button next to medicine
2. Enter new quantity and reorder level
3. Select unit (units, tablets, bottles, etc.)
4. Click "Update Inventory"

### Bulk Update
1. Click "Bulk Update" button
2. System updates all low/zero stock medicines
3. Progress bar shows completion status

### Dispensing with Stock Check
1. View prescription in queue
2. Stock status shown automatically
3. If out of stock, "Dispense" button disabled
4. If low stock, warning shown
5. Enter quantity to dispense (validated against available stock)
6. System automatically decrements stock on successful dispense

## Database Indexes
- Index on `quantity` for fast low stock queries
- Index on `name`, `generic_name`, `ndc_code` for search

## Notes
- Stock tracking is optional - prescriptions without `medicine_id` still work
- Backward compatible with existing prescriptions
- All inventory changes are logged via audit logger
- Stock status updates in real-time across all modules
