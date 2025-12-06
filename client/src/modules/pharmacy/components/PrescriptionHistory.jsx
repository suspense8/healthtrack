import { useState, useEffect } from 'react';
import {
  Box, Heading, Table, Thead, Tbody, Tr, Th, Td, Badge, Button, 
  HStack, Input, InputGroup, InputLeftElement, Select, Spinner, Center
} from '@chakra-ui/react';
import { SearchIcon } from '@chakra-ui/icons';
import api from '../../../services/api';

export default function PrescriptionHistory() {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const fetchPrescriptions = async () => {
    try {
      const res = await api.get(`/pharmacy/prescriptions?status=${filter}`);
      setPrescriptions(res.data);
    } catch (error) {
      console.error('Failed to fetch prescriptions', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrescriptions();
  }, [filter]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending': return 'orange';
      case 'Dispensed': return 'green';
      case 'Cancelled': return 'red';
      case 'Stockout': return 'purple';
      default: return 'gray';
    }
  };

  const filteredPrescriptions = prescriptions.filter(rx => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      rx.medication_name.toLowerCase().includes(searchLower) ||
      `${rx.patient.first_name} ${rx.patient.last_name}`.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return <Center h="300px"><Spinner size="xl" color="teal.500" /></Center>;
  }

  return (
    <Box>
      <HStack justify="space-between" mb={6}>
        <Heading size="sm">Prescription History</Heading>
        <HStack spacing={4}>
          <Button size="sm" onClick={fetchPrescriptions} isLoading={loading}>
            Refresh
          </Button>
          <InputGroup w="250px">
            <InputLeftElement><SearchIcon color="gray.400" /></InputLeftElement>
            <Input 
              placeholder="Search patient or medication..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </InputGroup>
          <Select w="150px" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Dispensed">Dispensed</option>
            <option value="Stockout">Stockout</option>
            <option value="Cancelled">Cancelled</option>
          </Select>
        </HStack>
      </HStack>

      <Table variant="simple">
        <Thead>
          <Tr>
            <Th>Date</Th>
            <Th>Patient</Th>
            <Th>Medication</Th>
            <Th>Dosage</Th>
            <Th>Frequency</Th>
            <Th>Duration</Th>
            <Th>Status</Th>
          </Tr>
        </Thead>
        <Tbody>
          {filteredPrescriptions.map((rx) => (
            <Tr key={rx.prescription_id} _hover={{ bg: 'gray.50' }}>
              <Td>{new Date(rx.created_at).toLocaleDateString()}</Td>
              <Td fontWeight="bold">{rx.patient.first_name} {rx.patient.last_name}</Td>
              <Td>{rx.medication_name}</Td>
              <Td>{rx.dosage}</Td>
              <Td>{rx.frequency}</Td>
              <Td>{rx.duration}</Td>
              <Td>
                <Badge colorScheme={getStatusColor(rx.status)}>{rx.status}</Badge>
              </Td>
            </Tr>
          ))}
          {filteredPrescriptions.length === 0 && (
            <Tr>
              <Td colSpan={7} textAlign="center" color="gray.500">
                No prescriptions found
              </Td>
            </Tr>
          )}
        </Tbody>
      </Table>
    </Box>
  );
}
