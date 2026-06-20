-- AlterTable
ALTER TABLE "AttendanceLog" ADD COLUMN     "emergency_subtype" VARCHAR(32);

-- CreateTable
CREATE TABLE "ObstetricVisit" (
    "obstetric_visit_id" SERIAL NOT NULL,
    "visit_id" INTEGER NOT NULL,
    "gravida" INTEGER,
    "para" INTEGER,
    "gestational_age_weeks" INTEGER,
    "edd" DATE,
    "previous_csection" BOOLEAN NOT NULL DEFAULT false,
    "hypertension" BOOLEAN NOT NULL DEFAULT false,
    "gestational_diabetes" BOOLEAN NOT NULL DEFAULT false,
    "multiple_gestation" BOOLEAN NOT NULL DEFAULT false,
    "preeclampsia_risk" BOOLEAN NOT NULL DEFAULT false,
    "membranes_ruptured" BOOLEAN NOT NULL DEFAULT false,
    "rupture_time" TIMESTAMP(3),
    "contraction_frequency" VARCHAR(64),
    "cervical_dilation_cm" INTEGER,
    "fetal_heart_rate" INTEGER,
    "fetal_presentation" VARCHAR(32),
    "fetal_station" INTEGER,
    "bleeding_severity" VARCHAR(16),
    "fetal_distress" BOOLEAN NOT NULL DEFAULT false,
    "maternal_distress" BOOLEAN NOT NULL DEFAULT false,
    "labor_stage" VARCHAR(16),
    "management_plan" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ObstetricVisit_pkey" PRIMARY KEY ("obstetric_visit_id")
);

-- CreateTable
CREATE TABLE "Delivery" (
    "delivery_id" SERIAL NOT NULL,
    "obstetric_visit_id" INTEGER NOT NULL,
    "delivery_time" TIMESTAMP(3) NOT NULL,
    "delivery_type" VARCHAR(32) NOT NULL,
    "conducted_by_user_id" INTEGER NOT NULL,
    "assisted_by_user_id" INTEGER,
    "baby_sex" VARCHAR(16),
    "birth_weight_grams" INTEGER,
    "apgar_1_min" INTEGER,
    "apgar_5_min" INTEGER,
    "cord_ph" DOUBLE PRECISION,
    "resuscitation_needed" BOOLEAN NOT NULL DEFAULT false,
    "resuscitation_details" TEXT,
    "placenta_delivered" BOOLEAN NOT NULL DEFAULT false,
    "placenta_delivery_time" TIMESTAMP(3),
    "estimated_blood_loss_ml" INTEGER,
    "perineal_tear" VARCHAR(32),
    "complications" TEXT,
    "postpartum_bp_systolic" INTEGER,
    "postpartum_bp_diastolic" INTEGER,
    "uterus_firm" BOOLEAN,
    "excessive_bleeding" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Delivery_pkey" PRIMARY KEY ("delivery_id")
);

-- CreateTable
CREATE TABLE "PartographEntry" (
    "entry_id" SERIAL NOT NULL,
    "obstetric_visit_id" INTEGER NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recorded_by_user_id" INTEGER NOT NULL,
    "hours_in_labor" DOUBLE PRECISION,
    "cervical_dilation_cm" INTEGER,
    "contractions_per_10min" INTEGER,
    "contraction_duration_sec" INTEGER,
    "fetal_heart_rate" INTEGER,
    "blood_pressure_systolic" INTEGER,
    "blood_pressure_diastolic" INTEGER,
    "pulse" INTEGER,
    "temperature" DOUBLE PRECISION,
    "fluids_given" VARCHAR(128),
    "medications_given" TEXT,
    "prolonged_labor_alert" BOOLEAN NOT NULL DEFAULT false,
    "fetal_distress_alert" BOOLEAN NOT NULL DEFAULT false,
    "maternal_distress_alert" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,

    CONSTRAINT "PartographEntry_pkey" PRIMARY KEY ("entry_id")
);

-- CreateTable
CREATE TABLE "Task" (
    "task_id" SERIAL NOT NULL,
    "task_type" VARCHAR(32) NOT NULL,
    "assigned_role" VARCHAR(32) NOT NULL,
    "assigned_user_id" INTEGER,
    "visit_id" INTEGER NOT NULL,
    "status" VARCHAR(16) NOT NULL DEFAULT 'pending',
    "priority" VARCHAR(16) NOT NULL DEFAULT 'normal',
    "due_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "completed_by_user_id" INTEGER,
    "description" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("task_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ObstetricVisit_visit_id_key" ON "ObstetricVisit"("visit_id");

-- CreateIndex
CREATE INDEX "ObstetricVisit_visit_id_idx" ON "ObstetricVisit"("visit_id");

-- CreateIndex
CREATE UNIQUE INDEX "Delivery_obstetric_visit_id_key" ON "Delivery"("obstetric_visit_id");

-- CreateIndex
CREATE INDEX "Delivery_obstetric_visit_id_idx" ON "Delivery"("obstetric_visit_id");

-- CreateIndex
CREATE INDEX "Delivery_delivery_time_idx" ON "Delivery"("delivery_time");

-- CreateIndex
CREATE INDEX "PartographEntry_obstetric_visit_id_idx" ON "PartographEntry"("obstetric_visit_id");

-- CreateIndex
CREATE INDEX "PartographEntry_recorded_at_idx" ON "PartographEntry"("recorded_at");

-- CreateIndex
CREATE INDEX "Task_assigned_role_status_idx" ON "Task"("assigned_role", "status");

-- CreateIndex
CREATE INDEX "Task_visit_id_idx" ON "Task"("visit_id");

-- CreateIndex
CREATE INDEX "Task_status_idx" ON "Task"("status");

-- CreateIndex
CREATE INDEX "Task_priority_idx" ON "Task"("priority");

-- AddForeignKey
ALTER TABLE "ObstetricVisit" ADD CONSTRAINT "ObstetricVisit_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "AttendanceLog"("visit_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_obstetric_visit_id_fkey" FOREIGN KEY ("obstetric_visit_id") REFERENCES "ObstetricVisit"("obstetric_visit_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartographEntry" ADD CONSTRAINT "PartographEntry_obstetric_visit_id_fkey" FOREIGN KEY ("obstetric_visit_id") REFERENCES "ObstetricVisit"("obstetric_visit_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "AttendanceLog"("visit_id") ON DELETE CASCADE ON UPDATE CASCADE;
