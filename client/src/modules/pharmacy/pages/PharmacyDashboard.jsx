import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Heading, SimpleGrid, Stat, StatLabel, StatNumber, HStack, Icon
} from '@chakra-ui/react';
import { FaClock, FaCheckCircle, FaExclamationTriangle, FaPills, FaHistory } from 'react-icons/fa';
import ModuleLayout from '../../../components/shared/ModuleLayout';
import PharmacyQueue from '../components/PharmacyQueue';
import PrescriptionHistory from '../components/PrescriptionHistory';
import InventoryManagement from '../components/InventoryManagement';
import api from '../../../services/api';

const navItems = [
  { id: 'queue', label: 'Dispensing Queue', icon: FaClock },
  { id: 'inventory', label: 'Inventory Management', icon: FaPills },
  { id: 'history', label: 'Prescription History', icon: FaHistory },
];

export default function PharmacyDashboard() {
  const { tab } = useParams();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  
  // Default to 'queue' if no tab specified
  const activeTab = tab || 'queue';
  
  // Navigate to tab
  const setActiveTab = (newTab) => {
    navigate(`/pharmacy/${newTab}`);
  };
  
  // Redirect to default if invalid tab
  useEffect(() => {
    const validTabs = ['queue', 'inventory', 'history'];
    if (tab && !validTabs.includes(tab)) {
      navigate('/pharmacy/queue', { replace: true });
    }
  }, [tab, navigate]);

  const fetchStats = async () => {
    try {
      const res = await api.get('/pharmacy/stats');
      setStats(res.data);
    } catch (error) {
      console.error('Failed to fetch stats', error);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleDispenseComplete = () => {
    fetchStats();
  };

  const StatCard = ({ icon, label, value, color }) => (
    <Stat 
      p={5} 
      bg="white" 
      borderRadius="lg" 
      boxShadow="sm" 
      borderLeft="4px solid" 
      borderColor={`${color}.500`}
    >
      <HStack>
        <Icon as={icon} boxSize={8} color={`${color}.500`} />
        <Box>
          <StatLabel color="gray.500">{label}</StatLabel>
          <StatNumber fontSize="2xl">{value ?? '-'}</StatNumber>
        </Box>
      </HStack>
    </Stat>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'queue':
        return <PharmacyQueue onDispenseComplete={handleDispenseComplete} />;
      case 'inventory':
        return <InventoryManagement />;
      case 'history':
        return <PrescriptionHistory />;
      default:
        return <PharmacyQueue onDispenseComplete={handleDispenseComplete} />;
    }
  };

  return (
    <ModuleLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      navItems={navItems}
      title="Pharmacy"
      color="teal"
      moduleIcon={FaPills}
    >
      <Heading mb={6}>
        {navItems.find(n => n.id === activeTab)?.label || 'Dashboard'}
      </Heading>

      {/* Stats Overview */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6} mb={6}>
        <StatCard icon={FaClock} label="Pending" value={stats?.pendingCount} color="orange" />
        <StatCard icon={FaCheckCircle} label="Dispensed Today" value={stats?.dispensedToday} color="green" />
        <StatCard icon={FaExclamationTriangle} label="Stockout" value={stats?.stockoutCount} color="red" />
        <StatCard icon={FaPills} label="Total Today" value={stats?.totalToday} color="blue" />
      </SimpleGrid>

      {/* Main Content */}
      <Box bg="white" p={6} borderRadius="lg" boxShadow="sm">
        {renderContent()}
      </Box>
    </ModuleLayout>
  );
}
