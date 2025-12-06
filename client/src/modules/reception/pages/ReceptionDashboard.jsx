import { useState } from 'react';
import { Box, Heading, useDisclosure } from '@chakra-ui/react';
import { FiSearch, FiCalendar, FiUserPlus, FiList, FiClipboard } from 'react-icons/fi';
import { FaClipboardList } from 'react-icons/fa';
import ModuleLayout from '../../../components/shared/ModuleLayout';
import PatientSearch from '../components/PatientSearch';
import RegisterPatient from '../components/RegisterPatient';
import QueueBoard from '../components/QueueBoard';
import AttendanceRecords from '../components/AttendanceRecords';
import CheckInModal from '../components/CheckInModal';
import ReceptionAppointments from '../components/ReceptionAppointments';

const navItems = [
  { id: 'search', label: 'Search & Check-In', icon: FiSearch },
  { id: 'appointments', label: 'Appointments', icon: FiCalendar },
  { id: 'register', label: 'Register Patient', icon: FiUserPlus },
  { id: 'queue', label: 'Queue Board', icon: FiList },
  { id: 'attendance', label: 'Attendance Records', icon: FiClipboard },
];

export default function ReceptionDashboard() {
  const [activeTab, setActiveTab] = useState('search');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const { isOpen: isCheckInOpen, onOpen: onCheckInOpen, onClose: onCheckInClose } = useDisclosure();

  const handlePatientRegistered = (patient, isEmergency = false) => {
    if (isEmergency) {
      setActiveTab('queue');
    } else {
      setSelectedPatient(patient);
      onCheckInOpen();
    }
  };

  const handleCheckInComplete = () => {
    setActiveTab('queue');
    onCheckInClose();
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

      {selectedPatient && (
        <CheckInModal 
          isOpen={isCheckInOpen} 
          onClose={handleCheckInComplete} 
          patient={selectedPatient} 
        />
      )}
    </ModuleLayout>
  );
}
