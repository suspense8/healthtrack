import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Heading, Input, InputGroup, InputLeftElement, Table, Thead, Tbody, Tr, Th, Td, Button,
  VStack, Text, useToast, HStack
} from '@chakra-ui/react';
import { SearchIcon } from '@chakra-ui/icons';
import api from '../../../services/api';

export default function PatientManagement() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleSearch = async () => {
    if (!searchQuery) return;
    setLoading(true);
    try {
      // Use doctor-specific patient search endpoint
      const res = await api.get(`/doctor/patients/search?query=${searchQuery}`);
      setPatients(res.data);
    } catch (error) {
      console.error("Search failed", error);
      toast({
        title: 'Search failed',
        description: error.response?.data?.error || 'Failed to search patients',
        status: 'error',
        duration: 3000
      });
    } finally {
      setLoading(false);
    }
  };


  return (
    <Box bg="white" p={6} borderRadius="lg" boxShadow="sm">
      <HStack justify="space-between" mb={4}>
        <Heading size="md">Patient Management</Heading>
        {patients.length > 0 && (
          <Button size="sm" onClick={handleSearch} isLoading={loading}>
            Refresh
          </Button>
        )}
      </HStack>
      
      <VStack spacing={4} align="stretch">
        <InputGroup>
          <InputLeftElement pointerEvents="none" children={<SearchIcon color="gray.300" />} />
          <Input 
            placeholder="Search by name, ID, or phone..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button ml={2} onClick={handleSearch} isLoading={loading}>Search</Button>
        </InputGroup>

        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>Name</Th>
              <Th>ID</Th>
              <Th>Phone</Th>
              <Th>Age</Th>
              <Th>Action</Th>
            </Tr>
          </Thead>
          <Tbody>
            {patients.map((patient) => (
              <Tr key={patient.patient_id}>
                <Td>{patient.first_name} {patient.last_name}</Td>
                <Td>{patient.national_id || 'N/A'}</Td>
                <Td>{patient.phone_number}</Td>
                <Td>{patient.date_of_birth ? new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear() : 'N/A'}</Td>
                <Td>
                  <Button size="sm" variant="outline" onClick={() => navigate(`/doctor/patient/${patient.patient_id}/history`)}>
                    View History
                  </Button>
                </Td>
              </Tr>
            ))}
            {patients.length === 0 && searchQuery && !loading && (
              <Tr><Td colSpan={5} textAlign="center">No patients found</Td></Tr>
            )}
          </Tbody>
        </Table>
      </VStack>
    </Box>
  );
}
