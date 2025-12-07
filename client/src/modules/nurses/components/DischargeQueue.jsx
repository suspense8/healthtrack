import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Heading, Table, Thead, Tbody, Tr, Th, Td, Badge, Button, 
  HStack, Text, Spinner, Center, VStack, useToast, Alert, AlertIcon, Divider
} from '@chakra-ui/react';
import { CheckIcon } from '@chakra-ui/icons';
import api from '../../../services/api';

export default function DischargeQueue() {
  const navigate = useNavigate();
  const [discharges, setDischarges] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const fetchDischarges = async () => {
    try {
      // Fetch admissions with 'Pending Discharge' status
      const res = await api.get('/admission/admitted');
      const pendingDischarges = res.data.filter(a => a.admission_status === 'Pending Discharge');
      setDischarges(pendingDischarges);
    } catch (error) {
      console.error('Failed to fetch discharges', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDischarges();
    const interval = setInterval(fetchDischarges, 30000);
    return () => clearInterval(interval);
  }, []);


  if (loading) {
    return <Center h="300px"><Spinner size="xl" color="purple.500" /></Center>;
  }

  if (discharges.length === 0) {
    return (
      <Center h="200px">
        <VStack>
          <CheckIcon boxSize={12} color="green.400" />
          <Text color="gray.500" fontSize="lg">No pending discharges</Text>
        </VStack>
      </Center>
    );
  }

  return (
    <Box>
      <HStack justify="space-between" mb={4}>
        <Heading size="sm">Pending Discharges ({discharges.length})</Heading>
        <Button size="sm" onClick={fetchDischarges} isLoading={loading}>
          Refresh
        </Button>
      </HStack>

      <VStack spacing={4} align="stretch">
        {discharges.map((d) => (
          <Box 
            key={d.admission_id} 
            p={5} 
            bg="white" 
            borderRadius="lg" 
            boxShadow="sm"
            borderLeft="4px solid"
            borderColor="orange.400"
          >
            <HStack justify="space-between" mb={3}>
              <VStack align="start" spacing={0}>
                <Text fontWeight="bold" fontSize="lg">
                  {d.patient?.first_name} {d.patient?.last_name}
                </Text>
                <Text fontSize="sm" color="gray.500">
                  {d.ward?.ward_name} - Bed {d.bed?.bed_number}
                </Text>
              </VStack>
              <Badge colorScheme="orange" fontSize="md" px={3} py={1}>Pending Discharge</Badge>
            </HStack>

            <Divider mb={3} />

            <Box mb={4}>
              <Text fontSize="xs" color="gray.500" textTransform="uppercase">Discharge Summary</Text>
              <Text>{d.discharge_summary || 'No summary provided'}</Text>
            </Box>

            {d.discharge_meds && (
              <Box mb={4}>
                <Text fontSize="xs" color="gray.500" textTransform="uppercase">Take-Home Medications</Text>
                <Text fontSize="sm">{d.discharge_meds}</Text>
              </Box>
            )}

            {d.follow_up_date && (
              <Box mb={4}>
                <Text fontSize="xs" color="gray.500" textTransform="uppercase">Follow-Up Appointment</Text>
                <Text fontSize="sm">{new Date(d.follow_up_date).toLocaleString()}</Text>
              </Box>
            )}

            <HStack justify="flex-end">
              <Button 
                colorScheme="green" 
                leftIcon={<CheckIcon />}
                onClick={() => navigate(`/nurse/discharge/confirm/${d.admission_id}`)}
              >
                Confirm Discharge
              </Button>
            </HStack>
          </Box>
        ))}
      </VStack>
    </Box>
  );
}
