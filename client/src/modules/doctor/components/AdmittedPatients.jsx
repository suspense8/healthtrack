import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Heading, Table, Thead, Tbody, Tr, Th, Td, Badge, Button, 
  HStack, Text, Spinner, Center, VStack, useToast
} from '@chakra-ui/react';
import { ViewIcon, CheckIcon } from '@chakra-ui/icons';
import api from '../../../services/api';

export default function AdmittedPatients() {
  const navigate = useNavigate();
  const [admissions, setAdmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const fetchAdmissions = async () => {
    try {
      const res = await api.get('/admission/admitted');
      setAdmissions(res.data);
    } catch (error) {
      console.error('Failed to fetch admissions', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmissions();
  }, []);


  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Critical': return 'red';
      case 'Urgent': return 'orange';
      default: return 'green';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Admitted': return 'blue';
      case 'Pending Discharge': return 'orange';
      case 'Discharged': return 'green';
      default: return 'gray';
    }
  };

  if (loading) {
    return <Center h="300px"><Spinner size="xl" color="green.500" /></Center>;
  }

  if (admissions.length === 0) {
    return (
      <Center h="200px">
        <VStack>
          <Text color="gray.500" fontSize="lg">No admitted patients</Text>
        </VStack>
      </Center>
    );
  }

  return (
    <Box>
      <HStack justify="space-between" mb={4}>
        <Heading size="sm">Admitted Patients ({admissions.length})</Heading>
        <Button size="sm" onClick={fetchAdmissions} isLoading={loading}>
          Refresh
        </Button>
      </HStack>

      <Table variant="simple">
        <Thead>
          <Tr>
            <Th>Patient</Th>
            <Th>Ward / Bed</Th>
            <Th>Diagnosis</Th>
            <Th>Priority</Th>
            <Th>Status</Th>
            <Th>Admitted</Th>
            <Th>Actions</Th>
          </Tr>
        </Thead>
        <Tbody>
          {admissions.map((adm) => (
            <Tr key={adm.admission_id}>
              <Td fontWeight="bold">
                {adm.patient?.first_name} {adm.patient?.last_name}
              </Td>
              <Td>
                {adm.ward?.ward_name} - {adm.bed?.bed_number}
              </Td>
              <Td maxW="200px" isTruncated>{adm.admission_reason}</Td>
              <Td>
                <Badge colorScheme={getPriorityColor(adm.priority)}>{adm.priority}</Badge>
              </Td>
              <Td>
                <Badge colorScheme={getStatusColor(adm.admission_status)}>{adm.admission_status}</Badge>
              </Td>
              <Td fontSize="sm">{new Date(adm.admitted_at).toLocaleDateString()}</Td>
              <Td>
                <HStack spacing={2}>
                  <Button size="xs" colorScheme="blue" leftIcon={<ViewIcon />} onClick={() => navigate(`/doctor/admission/${adm.admission_id}`)}>
                    View
                  </Button>
                  {adm.admission_status === 'Admitted' && (
                    <Button size="xs" colorScheme="green" leftIcon={<CheckIcon />} onClick={() => navigate(`/doctor/discharge/${adm.admission_id}`)}>
                      Discharge
                    </Button>
                  )}
                </HStack>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
}
