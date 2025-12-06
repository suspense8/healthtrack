import { useState } from 'react';
import { Box, Heading, Text, VStack, Center } from '@chakra-ui/react';
import DoctorLayout from '../components/DoctorLayout';
import DoctorQueue from '../components/DoctorQueue';
import ConsultationView from '../components/ConsultationView';
import PatientManagement from '../components/PatientManagement';
import Appointments from '../components/Appointments';
import DoctorAnalytics from '../components/DoctorAnalytics';
import Prescriptions from '../components/Prescriptions';
import AdmittedPatients from '../components/AdmittedPatients';

export default function DoctorDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [consultationVisit, setConsultationVisit] = useState(null);

  const handleStartConsult = (visit) => {
    setConsultationVisit(visit);
  };

  const handleConsultComplete = () => {
    setConsultationVisit(null);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DoctorAnalytics onNavigate={setActiveTab} />;
      case 'consultation':
        if (consultationVisit) {
          return (
            <ConsultationView 
              visit={consultationVisit} 
              onBack={() => setConsultationVisit(null)}
              onComplete={handleConsultComplete}
            />
          );
        }
        return (
          <VStack spacing={6} align="stretch">
            <Box bg="white" p={6} borderRadius="lg" boxShadow="sm">
              <Heading size="md" mb={4}>Waiting for Consultation</Heading>
              <DoctorQueue onStartConsult={handleStartConsult} />
            </Box>
          </VStack>
        );
      case 'patients':
        return <PatientManagement />;
      case 'appointments':
        return <Appointments />;
      case 'prescriptions':
        return <Prescriptions />;
      case 'admitted':
        return (
          <Box bg="white" p={6} borderRadius="lg" boxShadow="sm">
            <AdmittedPatients />
          </Box>
        );
      default:
        return <DoctorAnalytics onNavigate={setActiveTab} />;
    }
  };

  return (
    <DoctorLayout activeTab={activeTab} setActiveTab={setActiveTab}>
      <Heading mb={6} textTransform="capitalize">
        {activeTab === 'dashboard' ? 'Overview' : activeTab.replace('-', ' ')}
      </Heading>
      {renderContent()}
    </DoctorLayout>
  );
}
