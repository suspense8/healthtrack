import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Heading, VStack, HStack, Text, Badge, Button, Spinner, Center,
  Alert, AlertIcon, Divider, SimpleGrid, useToast
} from '@chakra-ui/react';
import { CheckIcon, CloseIcon } from '@chakra-ui/icons';
import api from '../../../services/api';

export default function AdmissionsQueue() {
  const navigate = useNavigate();
  const [admissions, setAdmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const fetchAdmissions = async () => {
    try {
      const res = await api.get('/admission/pending');
      setAdmissions(res.data);
    } catch (error) {
      console.error('Failed to fetch admissions', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmissions();
    const interval = setInterval(fetchAdmissions, 30000);
    return () => clearInterval(interval);
  }, []);


  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Critical': return 'red';
      case 'Urgent': return 'orange';
      default: return 'green';
    }
  };

  const calculateAge = (dob) => {
    if (!dob) return 'N/A';
    const ageDiff = Date.now() - new Date(dob).getTime();
    return Math.floor(ageDiff / (1000 * 60 * 60 * 24 * 365));
  };

  if (loading) {
    return <Center h="300px"><Spinner size="xl" color="purple.500" /></Center>;
  }

  if (admissions.length === 0) {
    return (
      <Center h="200px">
        <VStack>
          <CheckIcon boxSize={12} color="green.400" />
          <Text color="gray.500" fontSize="lg">No pending admission requests</Text>
        </VStack>
      </Center>
    );
  }

  return (
    <Box>
      <HStack justify="space-between" mb={4}>
        <Heading size="sm">Pending Admission Requests ({admissions.length})</Heading>
        <Button size="sm" onClick={fetchAdmissions} isLoading={loading}>
          Refresh
        </Button>
      </HStack>

      <VStack spacing={4} align="stretch">
        {admissions.map((adm) => (
          <Box 
            key={adm.admission_id} 
            p={5} 
            bg="white" 
            borderRadius="lg" 
            boxShadow="sm"
            borderLeft="4px solid"
            borderColor={`${getPriorityColor(adm.priority)}.400`}
          >
            <HStack justify="space-between" mb={3}>
              <VStack align="start" spacing={1}>
                <HStack>
                  <Text fontWeight="bold" fontSize="lg">
                    {adm.patient?.first_name} {adm.patient?.last_name}
                  </Text>
                  <Badge colorScheme={getPriorityColor(adm.priority)}>{adm.priority}</Badge>
                </HStack>
                <Text fontSize="sm" color="gray.500">
                  {adm.patient?.gender}, {calculateAge(adm.patient?.date_of_birth)} years | 
                  Ward: {adm.ward?.ward_name}
                </Text>
              </VStack>
              <Text fontSize="sm" color="gray.400">
                {new Date(adm.requested_at).toLocaleTimeString()}
              </Text>
            </HStack>

            <Divider mb={3} />

            <SimpleGrid columns={2} spacing={4} mb={4}>
              <Box>
                <Text fontSize="xs" color="gray.500" textTransform="uppercase">Admission Reason</Text>
                <Text fontWeight="medium">{adm.admission_reason}</Text>
              </Box>
              <Box>
                <Text fontSize="xs" color="gray.500" textTransform="uppercase">Initial Orders</Text>
                <Text fontSize="sm">{adm.initial_orders || 'No specific orders'}</Text>
              </Box>
            </SimpleGrid>

            {/* Vitals Summary */}
            {adm.visit && (
              <Box p={3} bg="blue.50" borderRadius="md" mb={4}>
                <Text fontSize="xs" color="gray.500" mb={1}>Latest Vitals</Text>
                <HStack spacing={6} flexWrap="wrap">
                  <Text fontSize="sm">BP: {adm.visit.systolic_bp}/{adm.visit.diastolic_bp}</Text>
                  <Text fontSize="sm">HR: {adm.visit.heart_rate} bpm</Text>
                  <Text fontSize="sm">Temp: {adm.visit.temperature}°C</Text>
                  <Text fontSize="sm">SpO2: {adm.visit.oxygen_saturation}%</Text>
                </HStack>
                {adm.visit.diagnosis && (
                  <Text fontSize="sm" mt={2}><strong>Diagnosis:</strong> {adm.visit.diagnosis}</Text>
                )}
              </Box>
            )}

            {adm.patient?.allergies && (
              <Alert status="warning" borderRadius="md" mb={4}>
                <AlertIcon />
                <Text fontSize="sm"><strong>Allergies:</strong> {adm.patient.allergies}</Text>
              </Alert>
            )}

            <HStack justify="flex-end" spacing={3}>
              <Button 
                colorScheme="red" 
                variant="outline"
                leftIcon={<CloseIcon />}
                onClick={() => navigate(`/nurse/admissions/reject/${adm.admission_id}`)}
              >
                Reject
              </Button>
              <Button 
                colorScheme="green" 
                leftIcon={<CheckIcon />}
                onClick={() => navigate(`/nurse/admissions/accept/${adm.admission_id}`)}
              >
                Accept & Assign Bed
              </Button>
            </HStack>
          </Box>
        ))}
      </VStack>
    </Box>
  );
}
