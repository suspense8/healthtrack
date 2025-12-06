BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[AttendanceLog] ADD [admission_notes] TEXT,
[physical_exam] TEXT,
[referral_dest] VARCHAR(128),
[symptoms] TEXT;

-- CreateTable
CREATE TABLE [dbo].[Ward] (
    [ward_id] INT NOT NULL IDENTITY(1,1),
    [ward_name] VARCHAR(64) NOT NULL,
    [ward_type] VARCHAR(32) NOT NULL,
    [total_beds] INT NOT NULL CONSTRAINT [Ward_total_beds_df] DEFAULT 10,
    [description] TEXT,
    [is_active] BIT NOT NULL CONSTRAINT [Ward_is_active_df] DEFAULT 1,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [Ward_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Ward_pkey] PRIMARY KEY CLUSTERED ([ward_id]),
    CONSTRAINT [Ward_ward_name_key] UNIQUE NONCLUSTERED ([ward_name])
);

-- CreateTable
CREATE TABLE [dbo].[Bed] (
    [bed_id] INT NOT NULL IDENTITY(1,1),
    [ward_id] INT NOT NULL,
    [bed_number] VARCHAR(16) NOT NULL,
    [status] VARCHAR(32) NOT NULL CONSTRAINT [Bed_status_df] DEFAULT 'Available',
    [notes] TEXT,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [Bed_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [Bed_pkey] PRIMARY KEY CLUSTERED ([bed_id]),
    CONSTRAINT [Bed_ward_id_bed_number_key] UNIQUE NONCLUSTERED ([ward_id],[bed_number])
);

-- CreateTable
CREATE TABLE [dbo].[Admission] (
    [admission_id] INT NOT NULL IDENTITY(1,1),
    [patient_id] INT NOT NULL,
    [visit_id] INT NOT NULL,
    [ward_id] INT NOT NULL,
    [bed_id] INT,
    [admission_status] VARCHAR(32) NOT NULL CONSTRAINT [Admission_admission_status_df] DEFAULT 'Pending',
    [priority] VARCHAR(16) NOT NULL CONSTRAINT [Admission_priority_df] DEFAULT 'Normal',
    [admission_reason] TEXT NOT NULL,
    [initial_orders] TEXT,
    [doctor_id] INT NOT NULL,
    [nurse_id] INT,
    [requested_at] DATETIME2 NOT NULL CONSTRAINT [Admission_requested_at_df] DEFAULT CURRENT_TIMESTAMP,
    [admitted_at] DATETIME2,
    [discharged_at] DATETIME2,
    [discharge_summary] TEXT,
    [discharge_meds] TEXT,
    [follow_up_date] DATETIME2,
    [rejection_reason] TEXT,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [Admission_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [Admission_pkey] PRIMARY KEY CLUSTERED ([admission_id])
);

-- CreateTable
CREATE TABLE [dbo].[AdmissionNote] (
    [note_id] INT NOT NULL IDENTITY(1,1),
    [admission_id] INT NOT NULL,
    [user_id] INT NOT NULL,
    [note_type] VARCHAR(32) NOT NULL,
    [content] TEXT NOT NULL,
    [systolic_bp] INT,
    [diastolic_bp] INT,
    [heart_rate] INT,
    [temperature] FLOAT(53),
    [oxygen_saturation] INT,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [AdmissionNote_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [AdmissionNote_pkey] PRIMARY KEY CLUSTERED ([note_id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Admission_patient_id_idx] ON [dbo].[Admission]([patient_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Admission_admission_status_idx] ON [dbo].[Admission]([admission_status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Admission_ward_id_idx] ON [dbo].[Admission]([ward_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AdmissionNote_admission_id_idx] ON [dbo].[AdmissionNote]([admission_id]);

-- AddForeignKey
ALTER TABLE [dbo].[Bed] ADD CONSTRAINT [Bed_ward_id_fkey] FOREIGN KEY ([ward_id]) REFERENCES [dbo].[Ward]([ward_id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Admission] ADD CONSTRAINT [Admission_ward_id_fkey] FOREIGN KEY ([ward_id]) REFERENCES [dbo].[Ward]([ward_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Admission] ADD CONSTRAINT [Admission_bed_id_fkey] FOREIGN KEY ([bed_id]) REFERENCES [dbo].[Bed]([bed_id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AdmissionNote] ADD CONSTRAINT [AdmissionNote_admission_id_fkey] FOREIGN KEY ([admission_id]) REFERENCES [dbo].[Admission]([admission_id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
