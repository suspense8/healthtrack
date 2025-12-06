-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateTable
CREATE TABLE "Patient" (
    "patient_id" SERIAL NOT NULL,
    "first_name" VARCHAR(150) NOT NULL,
    "last_name" VARCHAR(150) NOT NULL,
    "middle_name" VARCHAR(150),
    "date_of_birth" DATE,
    "gender" VARCHAR(16),
    "national_id" VARCHAR(64),
    "patient_type" VARCHAR(32) NOT NULL,
    "phone_number" VARCHAR(32),
    "email" VARCHAR(255),
    "address" TEXT,
    "emergency_contact_name" VARCHAR(150),
    "emergency_contact_phone" VARCHAR(32),
    "allergies" TEXT,
    "existing_conditions" TEXT,
    "first_visit" BOOLEAN NOT NULL DEFAULT true,
    "partial_profile" BOOLEAN NOT NULL DEFAULT false,
    "is_temp_record" BOOLEAN NOT NULL DEFAULT false,
    "id_verification_status" VARCHAR(32),
    "date_registered" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("patient_id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "appointment_id" SERIAL NOT NULL,
    "patient_id" INTEGER NOT NULL,
    "doctor_id" INTEGER,
    "scheduled_date" TIMESTAMP(3) NOT NULL,
    "created_by" INTEGER,
    "status" VARCHAR(32) NOT NULL DEFAULT 'Scheduled',
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("appointment_id")
);

-- CreateTable
CREATE TABLE "AttendanceLog" (
    "visit_id" SERIAL NOT NULL,
    "patient_id" INTEGER NOT NULL,
    "visit_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "visit_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "visit_reason" TEXT,
    "is_emergency" BOOLEAN NOT NULL DEFAULT false,
    "referred_by" VARCHAR(128),
    "visit_type" VARCHAR(32) NOT NULL DEFAULT 'Walk-in',
    "appointment_id" INTEGER,
    "queue_number" INTEGER NOT NULL,
    "queue_status" VARCHAR(32) NOT NULL DEFAULT 'Waiting',
    "needs_vitals" BOOLEAN NOT NULL DEFAULT true,
    "no_show" BOOLEAN NOT NULL DEFAULT false,
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "systolic_bp" INTEGER,
    "diastolic_bp" INTEGER,
    "heart_rate" INTEGER,
    "respiratory_rate" INTEGER,
    "temperature" DOUBLE PRECISION,
    "oxygen_saturation" INTEGER,
    "weight" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "triage_level" VARCHAR(16),
    "nurse_notes" TEXT,
    "symptoms" TEXT,
    "physical_exam" TEXT,
    "doctor_notes" TEXT,
    "diagnosis" TEXT,
    "treatment_plan" TEXT,
    "disposition" VARCHAR(32),
    "referral_dest" VARCHAR(128),
    "admission_notes" TEXT,

    CONSTRAINT "AttendanceLog_pkey" PRIMARY KEY ("visit_id")
);

-- CreateTable
CREATE TABLE "LabOrder" (
    "order_id" SERIAL NOT NULL,
    "visit_id" INTEGER NOT NULL,
    "patient_id" INTEGER NOT NULL,
    "test_type" VARCHAR(128) NOT NULL,
    "urgency" VARCHAR(32) NOT NULL DEFAULT 'Routine',
    "status" VARCHAR(32) NOT NULL DEFAULT 'Pending',
    "results" TEXT,
    "ordered_by" INTEGER,
    "technician_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabOrder_pkey" PRIMARY KEY ("order_id")
);

-- CreateTable
CREATE TABLE "Prescription" (
    "prescription_id" SERIAL NOT NULL,
    "visit_id" INTEGER NOT NULL,
    "patient_id" INTEGER NOT NULL,
    "medication_name" VARCHAR(128) NOT NULL,
    "dosage" VARCHAR(64) NOT NULL,
    "frequency" VARCHAR(64) NOT NULL,
    "duration" VARCHAR(64) NOT NULL,
    "quantity" INTEGER,
    "instructions" TEXT,
    "status" VARCHAR(32) NOT NULL DEFAULT 'Pending',
    "prescribed_by" INTEGER,
    "pharmacist_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prescription_pkey" PRIMARY KEY ("prescription_id")
);

-- CreateTable
CREATE TABLE "ReceptionAudit" (
    "audit_id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "action" VARCHAR(64) NOT NULL,
    "entity" VARCHAR(64) NOT NULL,
    "entity_id" INTEGER,
    "before_snapshot" TEXT,
    "after_snapshot" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReceptionAudit_pkey" PRIMARY KEY ("audit_id")
);

-- CreateTable
CREATE TABLE "User" (
    "user_id" SERIAL NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" VARCHAR(20) NOT NULL DEFAULT 'receptionist',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "Ward" (
    "ward_id" SERIAL NOT NULL,
    "ward_name" VARCHAR(64) NOT NULL,
    "ward_type" VARCHAR(32) NOT NULL,
    "total_beds" INTEGER NOT NULL DEFAULT 10,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ward_pkey" PRIMARY KEY ("ward_id")
);

-- CreateTable
CREATE TABLE "Bed" (
    "bed_id" SERIAL NOT NULL,
    "ward_id" INTEGER NOT NULL,
    "bed_number" VARCHAR(16) NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'Available',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bed_pkey" PRIMARY KEY ("bed_id")
);

-- CreateTable
CREATE TABLE "Admission" (
    "admission_id" SERIAL NOT NULL,
    "patient_id" INTEGER NOT NULL,
    "visit_id" INTEGER NOT NULL,
    "ward_id" INTEGER NOT NULL,
    "bed_id" INTEGER,
    "admission_status" VARCHAR(32) NOT NULL DEFAULT 'Pending',
    "priority" VARCHAR(16) NOT NULL DEFAULT 'Normal',
    "admission_reason" TEXT NOT NULL,
    "initial_orders" TEXT,
    "doctor_id" INTEGER NOT NULL,
    "nurse_id" INTEGER,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "admitted_at" TIMESTAMP(3),
    "discharged_at" TIMESTAMP(3),
    "discharge_summary" TEXT,
    "discharge_meds" TEXT,
    "follow_up_date" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Admission_pkey" PRIMARY KEY ("admission_id")
);

-- CreateTable
CREATE TABLE "AdmissionNote" (
    "note_id" SERIAL NOT NULL,
    "admission_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "note_type" VARCHAR(32) NOT NULL,
    "content" TEXT NOT NULL,
    "systolic_bp" INTEGER,
    "diastolic_bp" INTEGER,
    "heart_rate" INTEGER,
    "temperature" DOUBLE PRECISION,
    "oxygen_saturation" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdmissionNote_pkey" PRIMARY KEY ("note_id")
);

-- CreateTable
CREATE TABLE "diseases" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "extract" TEXT,
    "symptoms" TEXT,
    "wikipedia_url" VARCHAR(512),
    "embedding" vector(384),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "diseases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Patient_national_id_key" ON "Patient"("national_id");

-- CreateIndex
CREATE INDEX "Patient_first_name_last_name_idx" ON "Patient"("first_name", "last_name");

-- CreateIndex
CREATE INDEX "Patient_phone_number_idx" ON "Patient"("phone_number");

-- CreateIndex
CREATE INDEX "Appointment_scheduled_date_idx" ON "Appointment"("scheduled_date");

-- CreateIndex
CREATE INDEX "AttendanceLog_patient_id_idx" ON "AttendanceLog"("patient_id");

-- CreateIndex
CREATE INDEX "AttendanceLog_queue_status_idx" ON "AttendanceLog"("queue_status");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Ward_ward_name_key" ON "Ward"("ward_name");

-- CreateIndex
CREATE UNIQUE INDEX "Bed_ward_id_bed_number_key" ON "Bed"("ward_id", "bed_number");

-- CreateIndex
CREATE INDEX "Admission_patient_id_idx" ON "Admission"("patient_id");

-- CreateIndex
CREATE INDEX "Admission_admission_status_idx" ON "Admission"("admission_status");

-- CreateIndex
CREATE INDEX "Admission_ward_id_idx" ON "Admission"("ward_id");

-- CreateIndex
CREATE INDEX "AdmissionNote_admission_id_idx" ON "AdmissionNote"("admission_id");

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient"("patient_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceLog" ADD CONSTRAINT "AttendanceLog_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient"("patient_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabOrder" ADD CONSTRAINT "LabOrder_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "AttendanceLog"("visit_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabOrder" ADD CONSTRAINT "LabOrder_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient"("patient_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "AttendanceLog"("visit_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient"("patient_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bed" ADD CONSTRAINT "Bed_ward_id_fkey" FOREIGN KEY ("ward_id") REFERENCES "Ward"("ward_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Admission" ADD CONSTRAINT "Admission_ward_id_fkey" FOREIGN KEY ("ward_id") REFERENCES "Ward"("ward_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Admission" ADD CONSTRAINT "Admission_bed_id_fkey" FOREIGN KEY ("bed_id") REFERENCES "Bed"("bed_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionNote" ADD CONSTRAINT "AdmissionNote_admission_id_fkey" FOREIGN KEY ("admission_id") REFERENCES "Admission"("admission_id") ON DELETE CASCADE ON UPDATE CASCADE;
