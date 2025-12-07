-- AlterTable
ALTER TABLE "Prescription" ADD COLUMN     "medicine_id" INTEGER;

-- CreateTable
CREATE TABLE "medicines" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "generic_name" VARCHAR(255),
    "ndc_code" VARCHAR(32),
    "manufacturer" VARCHAR(255),
    "title" TEXT,
    "ingredients" TEXT,
    "description" TEXT,
    "embedding" vector(384),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medicines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "medicines_name_idx" ON "medicines"("name");

-- CreateIndex
CREATE INDEX "medicines_generic_name_idx" ON "medicines"("generic_name");

-- CreateIndex
CREATE INDEX "medicines_ndc_code_idx" ON "medicines"("ndc_code");

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_medicine_id_fkey" FOREIGN KEY ("medicine_id") REFERENCES "medicines"("id") ON DELETE SET NULL ON UPDATE CASCADE;
