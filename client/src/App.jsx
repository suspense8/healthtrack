import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Box, Spinner, Center } from '@chakra-ui/react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Profile from './pages/Profile';
import SettingsPage from './pages/SettingsPage';
import ReceptionDashboard from './modules/reception/pages/ReceptionDashboard';
import NurseDashboard from './modules/nurses/pages/NurseDashboard';
import DoctorDashboard from './modules/doctor/pages/DoctorDashboard';
import AdminDashboard from './modules/admin/pages/AdminDashboard';
import PharmacyDashboard from './modules/pharmacy/pages/PharmacyDashboard';
// Subscreens
import CheckInView from './modules/reception/components/CheckInView';
import PatientDetailView from './modules/nurses/components/PatientDetailView';
import VitalsView from './modules/nurses/components/VitalsView';
import PatientHistoryView from './modules/doctor/components/PatientHistoryView';
import ConsultationView from './modules/doctor/components/ConsultationView';
import PatientVerificationView from './modules/reception/components/PatientVerificationView';
import WardPatientView from './modules/nurses/components/WardPatientView';
import AdmissionDetailView from './modules/doctor/components/AdmissionDetailView';
import DischargeView from './modules/doctor/components/DischargeView';
import AcceptAdmissionView from './modules/nurses/components/AcceptAdmissionView';
import RejectAdmissionView from './modules/nurses/components/RejectAdmissionView';
import ConfirmDischargeView from './modules/nurses/components/ConfirmDischargeView';
import AddNoteView from './modules/nurses/components/AddNoteView';
import NursePatientHistoryView from './modules/nurses/components/PatientHistoryView';

// Map module names to their expected roles
const moduleRoles = {
  reception: 'receptionist',
  nurse: 'nurse',
  doctor: 'doctor',
  admin: 'admin',
  pharmacy: 'pharmacist',
  lab: 'lab_tech'
};

// Protected route that checks for role-specific token
const ProtectedRoute = ({ children, module }) => {
  const { isLoggedIn, loading } = useAuth();
  const location = useLocation();
  const requiredRole = moduleRoles[module];

  if (loading) {
    return <Center h="100vh"><Spinner size="xl" color="blue.500" /></Center>;
  }

  // Check if logged in with the correct role
  if (!isLoggedIn(requiredRole)) {
    // Redirect to module-specific login page
    return <Navigate to={`/${module}/login`} state={{ from: location }} replace />;
  }

  return children;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Module-specific login routes */}
      <Route path="/reception/login" element={<Login module="reception" />} />
      <Route path="/nurse/login" element={<Login module="nurse" />} />
      <Route path="/doctor/login" element={<Login module="doctor" />} />
      <Route path="/admin/login" element={<Login module="admin" />} />
      <Route path="/pharmacy/login" element={<Login module="pharmacy" />} />
      <Route path="/lab/login" element={<Login module="lab" />} />
      
      {/* Default login redirects to reception */}
      <Route path="/login" element={<Navigate to="/reception/login" replace />} />
      
      {/* Module-specific profile routes */}
      <Route 
        path="/reception/profile" 
        element={
          <ProtectedRoute module="reception">
            <Profile />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/nurse/profile" 
        element={
          <ProtectedRoute module="nurse">
            <Profile />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/doctor/profile" 
        element={
          <ProtectedRoute module="doctor">
            <Profile />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin/profile" 
        element={
          <ProtectedRoute module="admin">
            <Profile />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/pharmacy/profile" 
        element={
          <ProtectedRoute module="pharmacy">
            <Profile />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/lab/profile" 
        element={
          <ProtectedRoute module="lab">
            <Profile />
          </ProtectedRoute>
        } 
      />
      
      {/* Module-specific settings routes */}
      <Route 
        path="/reception/settings" 
        element={
          <ProtectedRoute module="reception">
            <SettingsPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/nurse/settings" 
        element={
          <ProtectedRoute module="nurse">
            <SettingsPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/doctor/settings" 
        element={
          <ProtectedRoute module="doctor">
            <SettingsPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin/settings" 
        element={
          <ProtectedRoute module="admin">
            <SettingsPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/pharmacy/settings" 
        element={
          <ProtectedRoute module="pharmacy">
            <SettingsPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/lab/settings" 
        element={
          <ProtectedRoute module="lab">
            <SettingsPage />
          </ProtectedRoute>
        } 
      />
      
      {/* Protected module routes with nested tab routes */}
      <Route
        path="/reception"
        element={
          <ProtectedRoute module="reception">
            <Navigate to="/reception/search" replace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reception/:tab"
        element={
          <ProtectedRoute module="reception">
            <ReceptionDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/nurse"
        element={
          <ProtectedRoute module="nurse">
            <Navigate to="/nurse/queue" replace />
          </ProtectedRoute>
        }
      />
      {/* Nurse Subscreens - Must come before /nurse/:tab to avoid route conflicts */}
      <Route
        path="/nurse/patient/:patientId/history"
        element={
          <ProtectedRoute module="nurse">
            <NursePatientHistoryView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/nurse/patient/:visitId"
        element={
          <ProtectedRoute module="nurse">
            <PatientDetailView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/nurse/vitals/:visitId"
        element={
          <ProtectedRoute module="nurse">
            <VitalsView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/nurse/ward/patient/:admissionId"
        element={
          <ProtectedRoute module="nurse">
            <WardPatientView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/nurse/admissions/accept/:admissionId"
        element={
          <ProtectedRoute module="nurse">
            <AcceptAdmissionView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/nurse/admissions/reject/:admissionId"
        element={
          <ProtectedRoute module="nurse">
            <RejectAdmissionView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/nurse/discharge/confirm/:admissionId"
        element={
          <ProtectedRoute module="nurse">
            <ConfirmDischargeView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/nurse/ward/note/:admissionId"
        element={
          <ProtectedRoute module="nurse">
            <AddNoteView />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/nurse/:tab"
        element={
          <ProtectedRoute module="nurse">
            <NurseDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/doctor"
        element={
          <ProtectedRoute module="doctor">
            <Navigate to="/doctor/dashboard" replace />
          </ProtectedRoute>
        }
      />
      
      {/* Doctor Subscreens - Must come before /doctor/:tab to avoid route conflicts */}
      <Route
        path="/doctor/consultation/:visitId"
        element={
          <ProtectedRoute module="doctor">
            <ConsultationView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/doctor/consultation/:visitId/history"
        element={
          <ProtectedRoute module="doctor">
            <PatientHistoryView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/doctor/patient/:patientId/history"
        element={
          <ProtectedRoute module="doctor">
            <PatientHistoryView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/doctor/admission/:admissionId"
        element={
          <ProtectedRoute module="doctor">
            <AdmissionDetailView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/doctor/discharge/:admissionId"
        element={
          <ProtectedRoute module="doctor">
            <DischargeView />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/doctor/:tab"
        element={
          <ProtectedRoute module="doctor">
            <DoctorDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute module="admin">
            <Navigate to="/admin/analytics" replace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/:tab"
        element={
          <ProtectedRoute module="admin">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pharmacy"
        element={
          <ProtectedRoute module="pharmacy">
            <Navigate to="/pharmacy/queue" replace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pharmacy/:tab"
        element={
          <ProtectedRoute module="pharmacy">
            <PharmacyDashboard />
          </ProtectedRoute>
        }
      />
      
      {/* Reception Subscreens */}
      <Route
        path="/reception/checkin/:patientId"
        element={
          <ProtectedRoute module="reception">
            <CheckInView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reception/verify/:patientId"
        element={
          <ProtectedRoute module="reception">
            <PatientVerificationView />
          </ProtectedRoute>
        }
      />
      
      {/* Nurse Subscreens */}
      <Route
        path="/nurse/patient/:visitId"
        element={
          <ProtectedRoute module="nurse">
            <PatientDetailView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/nurse/vitals/:visitId"
        element={
          <ProtectedRoute module="nurse">
            <VitalsView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/nurse/ward/patient/:admissionId"
        element={
          <ProtectedRoute module="nurse">
            <WardPatientView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/nurse/admissions/accept/:admissionId"
        element={
          <ProtectedRoute module="nurse">
            <AcceptAdmissionView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/nurse/admissions/reject/:admissionId"
        element={
          <ProtectedRoute module="nurse">
            <RejectAdmissionView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/nurse/discharge/confirm/:admissionId"
        element={
          <ProtectedRoute module="nurse">
            <ConfirmDischargeView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/nurse/ward/note/:admissionId"
        element={
          <ProtectedRoute module="nurse">
            <AddNoteView />
          </ProtectedRoute>
        }
      />
      
      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/reception/login" replace />} />
      
      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/reception/login" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;
