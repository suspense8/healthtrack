-- Add columns as nullable first
ALTER TABLE "User" ADD COLUMN "name" VARCHAR(150);
ALTER TABLE "User" ADD COLUMN "staff_id" VARCHAR(50);
ALTER TABLE "User" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Set default values for existing users (use their username as both name and staff_id)
UPDATE "User" SET "name" = username WHERE "name" IS NULL;
UPDATE "User" SET "staff_id" = username WHERE "staff_id" IS NULL;

-- Now make them required (NOT NULL)
ALTER TABLE "User" ALTER COLUMN "name" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "staff_id" SET NOT NULL;

-- Add unique constraint on staff_id
CREATE UNIQUE INDEX "User_staff_id_key" ON "User"("staff_id");