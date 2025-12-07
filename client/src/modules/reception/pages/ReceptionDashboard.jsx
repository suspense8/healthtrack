import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Heading, useDisclosure } from '@chakra-ui/react';
import { FiSearch, FiCalendar, FiUserPlus, FiList, FiClipboard } from 'react-icons/fi';
import { FaClipboardList } from 'react-icons/fa';
import ModuleLayout from '../../../components/shared/ModuleLayout';
import PatientSearch from '../components/PatientSearch';
import RegisterPatient from '../components/RegisterPatient';
import QueueBoard from '../components/QueueBoard';
import AttendanceRecords from '../components/AttendanceRecords';
import ReceptionAppointments from '../components/ReceptionAppointments';

const navItems = [
  { id: 'search', label: 'Search & Check-In', icon: FiSearch },
  { id: 'appointments', label: 'Appointments', icon: FiCalendar },
  { id: 'register', label: 'Register Patient', icon: FiUserPlus },
  { id: 'queue', label: 'Queue Board', icon: FiList },
  { id: 'attendance', label: 'Attendance Records', icon: FiClipboard },
];

export default function ReceptionDashboard() {
  const { tab } = useParams();
  const navigate = useNavigate();
  
  // Default to 'search' if no tab specified
  const activeTab = tab || 'search';
  
  // Navigate to tab
  const setActiveTab = (newTab) => {
    navigate(`/reception/${newTab}`);
  };
  
  // Redirect to default if invalid tab
  useEffect(() => {
    const validTabs = ['search', 'appointments', 'register', 'queue', 'attendance'];
    if (tab && !validTabs.includes(tab)) {
      navigate('/reception/search', { replace: true });
    }
  }, [tab, navigate]);

  const handlePatientRegistered = (patient, isEmergency = false) => {
    if (isEmergency) {
      setActiveTab('queue');
    } else {
      navigate(`/reception/checkin/${patient.patient_id}`);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'search':
        return <PatientSearch />;
      case 'appointments':
        return <ReceptionAppointments onCheckIn={() => setActiveTab('queue')} />;
      case 'register':
        return <RegisterPatient onPatientRegistered={handlePatientRegistered} />;
      case 'queue':
        return <QueueBoard />;
      case 'attendance':
        return <AttendanceRecords />;
      default:
        return <PatientSearch />;
    }
  };

  return (
    <ModuleLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      navItems={navItems}
      title="Reception"
      color="blue"
      moduleIcon={FaClipboardList}
    >
      <Heading mb={6} textTransform="capitalize">
        {navItems.find(n => n.id === activeTab)?.label || 'Dashboard'}
      </Heading>
      
      <Box bg="white" p={6} borderRadius="lg" boxShadow="sm">
        {renderContent()}
      </Box>
    </ModuleLayout>
  );
}
