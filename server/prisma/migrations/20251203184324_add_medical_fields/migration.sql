BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[AttendanceLog] ADD [diagnosis] TEXT,
[diastolic_bp] INT,
[disposition] VARCHAR(32),
[doctor_notes] TEXT,
[heart_rate] INT,
[height] FLOAT(53),
[nurse_notes] TEXT,
[oxygen_saturation] INT,
[respiratory_rate] INT,
[systolic_bp] INT,
[temperature] FLOAT(53),
[treatment_plan] TEXT,
[triage_level] VARCHAR(16),
[weight] FLOAT(53);

-- CreateTable
CREATE TABLE [dbo].[LabOrder] (
    [order_id] INT NOT NULL IDENTITY(1,1),
    [visit_id] INT NOT NULL,
    [patient_id] INT NOT NULL,
    [test_type] VARCHAR(128) NOT NULL,
    [urgency] VARCHAR(32) NOT NULL CONSTRAINT [LabOrder_urgency_df] DEFAULT 'Routine',
    [status] VARCHAR(32) NOT NULL CONSTRAINT [LabOrder_status_df] DEFAULT 'Pending',
    [results] TEXT,
    [ordered_by] INT,
    [technician_id] INT,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [LabOrder_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [LabOrder_pkey] PRIMARY KEY CLUSTERED ([order_id])
);

-- CreateTable
CREATE TABLE [dbo].[Prescription] (
    [prescription_id] INT NOT NULL IDENTITY(1,1),
    [visit_id] INT NOT NULL,
    [patient_id] INT NOT NULL,
    [medication_name] VARCHAR(128) NOT NULL,
    [dosage] VARCHAR(64) NOT NULL,
    [frequency] VARCHAR(64) NOT NULL,
    [duration] VARCHAR(64) NOT NULL,
    [quantity] INT,
    [instructions] TEXT,
    [status] VARCHAR(32) NOT NULL CONSTRAINT [Prescription_status_df] DEFAULT 'Pending',
    [prescribed_by] INT,
    [pharmacist_id] INT,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [Prescription_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [Prescription_pkey] PRIMARY KEY CLUSTERED ([prescription_id])
);

-- AddForeignKey
ALTER TABLE [dbo].[LabOrder] ADD CONSTRAINT [LabOrder_visit_id_fkey] FOREIGN KEY ([visit_id]) REFERENCES [dbo].[AttendanceLog]([visit_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[LabOrder] ADD CONSTRAINT [LabOrder_patient_id_fkey] FOREIGN KEY ([patient_id]) REFERENCES [dbo].[Patient]([patient_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Prescription] ADD CONSTRAINT [Prescription_visit_id_fkey] FOREIGN KEY ([visit_id]) REFERENCES [dbo].[AttendanceLog]([visit_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Prescription] ADD CONSTRAINT [Prescription_patient_id_fkey] FOREIGN KEY ([patient_id]) REFERENCES [dbo].[Patient]([patient_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
