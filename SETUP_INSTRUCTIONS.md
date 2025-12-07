# Inventory Tracking System - Setup Instructions

## Step 1: Run Database Migration

```bash
cd server
npx prisma migrate dev --name add_inventory_tracking
```

This will:
- Add inventory fields to the `medicines` table
- Create indexes for performance
- Update existing records

**OR** manually apply the migration:

```bash
cd server/prisma/migrations/add_inventory_tracking
# Review migration.sql
# Then apply it to your database using your preferred method
```

## Step 2: Generate Prisma Client

After migration, regenerate Prisma client:

```bash
cd server
npx prisma generate
```

## Step 3: Seed Initial Inventory (Optional)

You have three options to set initial inventory values:

### Option A: Using the Seed Script (Recommended)

```bash
cd server
node scripts/seedInventory.js --default-quantity=100 --default-reorder=10 --unit=units
```

**Options:**
- `--default-quantity=N` - Set default quantity (default: 100)
- `--default-reorder=N` - Set default reorder level (default: 10)
- `--unit=UNIT` - Set default unit (default: 'units')
- `--low-stock-only` - Only update medicines with quantity <= reorder_level
- `--zero-only` - Only update medicines with quantity = 0

**Examples:**
```bash
# Set all medicines to 100 units
node scripts/seedInventory.js --default-quantity=100

# Only update zero stock medicines to 50 units
node scripts/seedInventory.js --default-quantity=50 --zero-only

# Update low stock medicines to 200 units
node scripts/seedInventory.js --default-quantity=200 --low-stock-only
```

### Option B: Using Bulk Update in UI

1. Start the application
2. Login as pharmacist
3. Navigate to **Pharmacy → Inventory Management**
4. Click **"Bulk Update"** button
5. This will update all low/zero stock medicines automatically

### Option C: Manual Entry via UI

1. Start the application
2. Login as pharmacist
3. Navigate to **Pharmacy → Inventory Management**
4. Click **"Update"** next to each medicine
5. Enter quantity, reorder level, and unit
6. Click **"Update Inventory"**

## Step 4: Verify Installation

1. **Check Database:**
   ```sql
   SELECT id, name, quantity, reorder_level, unit 
   FROM medicines 
   LIMIT 10;
   ```

2. **Check API Endpoints:**
   - `GET /api/pharmacy/inventory` - Should return medicines with inventory
   - `GET /api/pharmacy/inventory/stats` - Should return inventory statistics

3. **Check UI:**
   - Pharmacy Dashboard should show "Inventory Management" tab
   - Medicine autocomplete should show stock badges
   - Prescription queue should show stock status

## Step 5: Test the Workflow

1. **Doctor Prescribes:**
   - Go to Doctor Dashboard
   - Start a consultation
   - Search for a medicine
   - Verify stock status appears in autocomplete

2. **Pharmacy Dispenses:**
   - Go to Pharmacy Queue
   - Verify stock status shown for each prescription
   - Try to dispense - stock should decrement automatically
   - Try to dispense out-of-stock medicine - should be blocked

3. **Inventory Management:**
   - Go to Inventory Management
   - Filter by "Low Stock" or "Out of Stock"
   - Update a medicine's inventory
   - Verify changes reflect in queue

## Troubleshooting

### Migration Fails
- Ensure PostgreSQL is running
- Check database connection string in `.env`
- Verify you have permissions to alter tables

### Stock Not Showing
- Verify migration was applied successfully
- Check that medicines have `quantity` field populated
- Check browser console for API errors

### Dispense Not Working
- Verify medicine is linked (`medicine_id` in prescription)
- Check stock quantity is sufficient
- Review server logs for errors

### Low Stock Query Issues
- The low stock filter uses raw SQL to compare `quantity <= reorder_level`
- If issues occur, check PostgreSQL version (requires 9.1+)

## Next Steps

After setup:
1. Set appropriate reorder levels for each medicine
2. Establish regular inventory review schedule
3. Train staff on inventory management features
4. Set up alerts for low stock medicines (future enhancement)
