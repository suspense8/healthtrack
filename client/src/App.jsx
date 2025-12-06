import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Box, Spinner, Center } from '@chakra-ui/react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import ReceptionDashboard from './modules/reception/pages/ReceptionDashboard';
import NurseDashboard from './modules/nurses/pages/NurseDashboard';
import DoctorDashboard from './modules/doctor/pages/DoctorDashboard';
import AdminDashboard from './modules/admin/pages/AdminDashboard';
import PharmacyDashboard from './modules/pharmacy/pages/PharmacyDashboard';

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
      
      {/* Protected module routes */}
      <Route
        path="/reception"
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
            <NurseDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/doctor"
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
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pharmacy"
        element={
          <ProtectedRoute module="pharmacy">
            <PharmacyDashboard />
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
