-- Add inventory tracking fields to medicines table
ALTER TABLE "medicines" 
ADD COLUMN IF NOT EXISTS "quantity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "reorder_level" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN IF NOT EXISTS "unit" VARCHAR(32) NOT NULL DEFAULT 'units',
ADD COLUMN IF NOT EXISTS "last_restocked" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "last_restocked_by" INTEGER,
ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Create index for low stock queries
CREATE INDEX IF NOT EXISTS "medicines_quantity_idx" ON "medicines"("quantity");

-- Update existing medicines to have updated_at
UPDATE "medicines" SET "updated_at" = "created_at" WHERE "updated_at" IS NULL;
