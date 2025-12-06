# Njala University Clinic System

## Prerequisites

- Node.js (v18+)
- MS SQL Server Express (Instance: `SQLEXPRESS02`)

## Setup

### Server

1.  Navigate to `server/`:
    ```bash
    cd server
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Setup Database:
    - Ensure MS SQL Server is running.
    - Run migrations:
    ```bash
    npx prisma migrate dev --name init
    ```
4.  Start Server:
    ```bash
    npm start
    ```
    Server runs on `http://localhost:3000`.

### Client

1.  Navigate to `client/`:
    ```bash
    cd client
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start Development Server:
    ```bash
    npm run dev
    ```
    Client runs on `http://localhost:5173`.

## Features

### Receptionist Portal

- **Patient Search**: Multi-strategy search (ID, Phone, Name+DOB)
- **New Patient Registration**: Full demographic capture with temporary patient support for emergencies
- **Returning Patient Verification**: Confirm and update contact details
- **Check-in**: Log visits with queue assignment
- **Queue Management**: Real-time queue board with status updates
- **Offline Support**: PWA with offline data sync

### Comprehensive Flow

1. **Patient Arrival**: Search by ID, phone, or name
2. **New Patient**: Register with full details or create temporary emergency patient
3. **Returning Patient**: Verify contact information
4. **Visit Logging**: Check-in with reason, emergency flag, referral info
5. **Queue Handover**: Automatic queue number assignment and status tracking
6. **Edge Cases**:
   - Temporary patients for emergencies
   - Abandoned visit tracking
   - Duplicate prevention
   - Offline mode with sync

## API Endpoints

### Authentication

- `POST /auth/register` - Register receptionist
- `POST /auth/login` - Login

### Reception

- `POST /api/reception/patients` - Create patient
- `GET /api/reception/patients?query=&searchType=` - Search patients
- `GET /api/reception/patients/:id` - Get patient details
- `PUT /api/reception/patients/:id` - Update patient
- `PUT /api/reception/patients/:id/verify` - Verify returning patient
- `POST /api/reception/checkin` - Check-in patient
- `GET /api/reception/queue` - Get queue
- `PATCH /api/reception/visits/:id/status` - Update visit status
- `POST /api/reception/sync` - Sync offline actions

## Database Schema

### Key Tables

- **Patients**: Demographics, contact, medical context, verification status
- **AttendanceLog**: Visit records with queue management
- **Users**: Receptionist accounts
- **ReceptionAudit**: Audit trail

### New Fields

- `is_temp_record`: Flag for emergency temporary patients
- `id_verification_status`: Track verification state
- `visit_date` & `visit_time`: Separate date and time tracking
