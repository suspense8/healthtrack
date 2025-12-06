import { useState, useEffect } from 'react';
import {
  Box, SimpleGrid, Stat, StatLabel, StatNumber, StatHelpText, Heading, Text, Button, Icon, Flex
} from '@chakra-ui/react';
import { FiUsers, FiCalendar, FiClock, FiArrowRight } from 'react-icons/fi';
import api from '../../../services/api';

const StatCard = ({ label, value, helpText, icon, onClick, actionText }) => (
  <Box 
    p={6} 
    bg="white" 
    borderRadius="lg" 
    boxShadow="sm" 
    borderLeft="4px solid" 
    borderColor="blue.500"
    position="relative"
  >
    <Flex justify="space-between" align="start">
      <Stat>
        <StatLabel fontSize="lg" color="gray.500">{label}</StatLabel>
        <StatNumber fontSize="4xl" fontWeight="bold" color="blue.600">{value}</StatNumber>
        {helpText && <StatHelpText>{helpText}</StatHelpText>}
      </Stat>
      <Icon as={icon} fontSize="3xl" color="blue.200" />
    </Flex>
    {onClick && (
      <Button 
        mt={4} 
        size="sm" 
        rightIcon={<FiArrowRight />} 
        variant="link" 
        colorScheme="blue"
        onClick={onClick}
      >
        {actionText || 'View Details'}
      </Button>
    )}
  </Box>
);

export default function DoctorAnalytics({ onNavigate }) {
  const [stats, setStats] = useState({
    waitingCount: 0,
    appointmentsTodayCount: 0,
    nextAppointment: null
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/doctor/stats');
        setStats(res.data);
      } catch (error) {
        console.error("Failed to fetch stats", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <Box>
      <Heading size="md" mb={6}>Overview</Heading>
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
        <StatCard 
          label="Waiting for Consultation" 
          value={stats.waitingCount} 
          icon={FiUsers}
          onClick={() => onNavigate('consultation')}
          actionText="Go to Queue"
        />
        <StatCard 
          label="Appointments Today" 
          value={stats.appointmentsTodayCount} 
          icon={FiCalendar}
          onClick={() => onNavigate('appointments')}
          actionText="View Schedule"
        />
        <StatCard 
          label="Next Appointment" 
          value={stats.nextAppointment ? new Date(stats.nextAppointment.scheduled_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
          helpText={stats.nextAppointment ? `${stats.nextAppointment.patient.first_name} ${stats.nextAppointment.patient.last_name}` : 'No upcoming appointments'}
          icon={FiClock}
          onClick={() => onNavigate('appointments')}
          actionText="View Details"
        />
      </SimpleGrid>
    </Box>
  );
}
