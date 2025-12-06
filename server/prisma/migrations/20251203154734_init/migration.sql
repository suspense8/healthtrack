BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[Patient] (
    [patient_id] INT NOT NULL IDENTITY(1,1),
    [first_name] VARCHAR(150) NOT NULL,
    [last_name] VARCHAR(150) NOT NULL,
    [middle_name] VARCHAR(150),
    [date_of_birth] DATE,
    [gender] VARCHAR(16),
    [national_id] VARCHAR(64),
    [patient_type] VARCHAR(32) NOT NULL,
    [phone_number] VARCHAR(32),
    [email] VARCHAR(255),
    [address] TEXT,
    [emergency_contact_name] VARCHAR(150),
    [emergency_contact_phone] VARCHAR(32),
    [allergies] TEXT,
    [existing_conditions] TEXT,
    [first_visit] BIT NOT NULL CONSTRAINT [Patient_first_visit_df] DEFAULT 1,
    [partial_profile] BIT NOT NULL CONSTRAINT [Patient_partial_profile_df] DEFAULT 0,
    [is_temp_record] BIT NOT NULL CONSTRAINT [Patient_is_temp_record_df] DEFAULT 0,
    [id_verification_status] VARCHAR(32),
    [date_registered] DATETIME2 NOT NULL CONSTRAINT [Patient_date_registered_df] DEFAULT CURRENT_TIMESTAMP,
    [created_by] INT,
    [updated_at] DATETIME2 NOT NULL CONSTRAINT [Patient_updated_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Patient_pkey] PRIMARY KEY CLUSTERED ([patient_id]),
    CONSTRAINT [Patient_national_id_key] UNIQUE NONCLUSTERED ([national_id])
);

-- CreateTable
CREATE TABLE [dbo].[Appointment] (
    [appointment_id] INT NOT NULL IDENTITY(1,1),
    [patient_id] INT NOT NULL,
    [doctor_id] INT,
    [scheduled_date] DATETIME2 NOT NULL,
    [created_by] INT,
    [status] VARCHAR(32) NOT NULL CONSTRAINT [Appointment_status_df] DEFAULT 'Scheduled',
    [reason] TEXT,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [Appointment_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL CONSTRAINT [Appointment_updated_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Appointment_pkey] PRIMARY KEY CLUSTERED ([appointment_id])
);

-- CreateTable
CREATE TABLE [dbo].[AttendanceLog] (
    [visit_id] INT NOT NULL IDENTITY(1,1),
    [patient_id] INT NOT NULL,
    [visit_date] DATETIME2 NOT NULL CONSTRAINT [AttendanceLog_visit_date_df] DEFAULT CURRENT_TIMESTAMP,
    [visit_time] DATETIME2 NOT NULL CONSTRAINT [AttendanceLog_visit_time_df] DEFAULT CURRENT_TIMESTAMP,
    [visit_reason] TEXT,
    [is_emergency] BIT NOT NULL CONSTRAINT [AttendanceLog_is_emergency_df] DEFAULT 0,
    [referred_by] VARCHAR(128),
    [visit_type] VARCHAR(32) NOT NULL CONSTRAINT [AttendanceLog_visit_type_df] DEFAULT 'Walk-in',
    [appointment_id] INT,
    [queue_number] INT NOT NULL,
    [queue_status] VARCHAR(32) NOT NULL CONSTRAINT [AttendanceLog_queue_status_df] DEFAULT 'Waiting',
    [needs_vitals] BIT NOT NULL CONSTRAINT [AttendanceLog_needs_vitals_df] DEFAULT 1,
    [no_show] BIT NOT NULL CONSTRAINT [AttendanceLog_no_show_df] DEFAULT 0,
    [created_by] INT,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [AttendanceLog_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [AttendanceLog_pkey] PRIMARY KEY CLUSTERED ([visit_id])
);

-- CreateTable
CREATE TABLE [dbo].[ReceptionAudit] (
    [audit_id] INT NOT NULL IDENTITY(1,1),
    [user_id] INT,
    [action] VARCHAR(64) NOT NULL,
    [entity] VARCHAR(64) NOT NULL,
    [entity_id] INT,
    [before_snapshot] TEXT,
    [after_snapshot] TEXT,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [ReceptionAudit_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [ReceptionAudit_pkey] PRIMARY KEY CLUSTERED ([audit_id])
);

-- CreateTable
CREATE TABLE [dbo].[User] (
    [user_id] INT NOT NULL IDENTITY(1,1),
    [username] VARCHAR(50) NOT NULL,
    [password_hash] VARCHAR(255) NOT NULL,
    [role] VARCHAR(20) NOT NULL CONSTRAINT [User_role_df] DEFAULT 'receptionist',
    [created_at] DATETIME2 NOT NULL CONSTRAINT [User_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [User_pkey] PRIMARY KEY CLUSTERED ([user_id]),
    CONSTRAINT [User_username_key] UNIQUE NONCLUSTERED ([username])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Patient_first_name_last_name_idx] ON [dbo].[Patient]([first_name], [last_name]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Patient_phone_number_idx] ON [dbo].[Patient]([phone_number]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Appointment_scheduled_date_idx] ON [dbo].[Appointment]([scheduled_date]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AttendanceLog_patient_id_idx] ON [dbo].[AttendanceLog]([patient_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AttendanceLog_queue_status_idx] ON [dbo].[AttendanceLog]([queue_status]);

-- AddForeignKey
ALTER TABLE [dbo].[Appointment] ADD CONSTRAINT [Appointment_patient_id_fkey] FOREIGN KEY ([patient_id]) REFERENCES [dbo].[Patient]([patient_id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[AttendanceLog] ADD CONSTRAINT [AttendanceLog_patient_id_fkey] FOREIGN KEY ([patient_id]) REFERENCES [dbo].[Patient]([patient_id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
