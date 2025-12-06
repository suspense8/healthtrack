import { useState } from 'react';
import { Box, Heading } from '@chakra-ui/react';
import { FiUsers, FiActivity, FiCheckSquare, FiHome, FiClipboard } from 'react-icons/fi';
import { FaUserNurse, FaBed, FaSignOutAlt } from 'react-icons/fa';
import ModuleLayout from '../../../components/shared/ModuleLayout';
import NurseQueue from '../components/NurseQueue';
import AdmissionsQueue from '../components/AdmissionsQueue';
import WardDashboard from '../components/WardDashboard';
import DischargeQueue from '../components/DischargeQueue';
import CompletedToday from '../components/CompletedToday';

const navItems = [
  { id: 'queue', label: 'Vitals Queue', icon: FiActivity },
  { id: 'admissions', label: 'Admission Requests', icon: FiClipboard },
  { id: 'ward', label: 'Ward Management', icon: FaBed },
  { id: 'discharges', label: 'Pending Discharges', icon: FaSignOutAlt },
  { id: 'completed', label: 'Completed Today', icon: FiCheckSquare },
];

export default function NurseDashboard() {
  const [activeTab, setActiveTab] = useState('queue');

  const renderContent = () => {
    switch (activeTab) {
      case 'queue':
        return <NurseQueue status="active" />;
      case 'admissions':
        return <AdmissionsQueue />;
      case 'ward':
        return <WardDashboard />;
      case 'discharges':
        return <DischargeQueue />;
      case 'completed':
        return <CompletedToday />;
      default:
        return <NurseQueue status="active" />;
    }
  };

  return (
    <ModuleLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      navItems={navItems}
      title="Nurse Station"
      color="purple"
      moduleIcon={FaUserNurse}
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
