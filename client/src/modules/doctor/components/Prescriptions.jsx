import { useState, useEffect } from 'react';
import {
  Box, Heading, Table, Thead, Tbody, Tr, Th, Td, Badge, Button, 
  HStack, Text, Spinner, Center, Select, Input, InputGroup, InputLeftElement,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton,
  VStack, Divider, useDisclosure
} from '@chakra-ui/react';
import { SearchIcon, ViewIcon } from '@chakra-ui/icons';
import { FaPills } from 'react-icons/fa';
import api from '../../../services/api';

export default function Prescriptions() {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();

  const fetchPrescriptions = async () => {
    setLoading(true);
    try {
      const res = await api.get('/doctor/prescriptions');
      setPrescriptions(res.data);
    } catch (error) {
      console.error('Failed to fetch prescriptions', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending': return 'orange';
      case 'Dispensed': return 'green';
      case 'Cancelled': return 'red';
      case 'Stockout': return 'gray';
      default: return 'blue';
    }
  };

  const filteredPrescriptions = prescriptions.filter(p => {
    const matchesFilter = filter === 'all' || p.status === filter;
    const matchesSearch = search === '' || 
      p.medication_name.toLowerCase().includes(search.toLowerCase()) ||
      `${p.patient.first_name} ${p.patient.last_name}`.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleViewDetails = (prescription) => {
    setSelectedPrescription(prescription);
    onOpen();
  };

  if (loading) {
    return <Center h="300px"><Spinner size="xl" color="blue.500" /></Center>;
  }

  return (
    <Box>
      <Box bg="white" p={6} borderRadius="lg" boxShadow="sm">
        <HStack justify="space-between" mb={6}>
          <HStack>
            <FaPills size={24} color="#3182CE" />
            <Heading size="md">Prescription Records</Heading>
          </HStack>
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
              <option value="Cancelled">Cancelled</option>
              <option value="Stockout">Stockout</option>
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
              <Th>Actions</Th>
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
                <Td>
                  <Button 
                    size="sm" 
                    leftIcon={<ViewIcon />} 
                    colorScheme="blue" 
                    variant="outline"
                    onClick={() => handleViewDetails(rx)}
                  >
                    View
                  </Button>
                </Td>
              </Tr>
            ))}
            {filteredPrescriptions.length === 0 && (
              <Tr>
                <Td colSpan={8} textAlign="center" color="gray.500">
                  No prescriptions found
                </Td>
              </Tr>
            )}
          </Tbody>
        </Table>
      </Box>

      {/* Prescription Detail Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Prescription Details</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {selectedPrescription && (
              <VStack align="stretch" spacing={4}>
                <Box p={4} bg="blue.50" borderRadius="md">
                  <Text fontWeight="bold" color="blue.700">Patient Information</Text>
                  <Text>Name: {selectedPrescription.patient.first_name} {selectedPrescription.patient.last_name}</Text>
                  <Text>Phone: {selectedPrescription.patient.phone_number}</Text>
                </Box>

                <Divider />

                <Box p={4} bg="green.50" borderRadius="md">
                  <Text fontWeight="bold" color="green.700">Medication</Text>
                  <Text fontSize="lg">{selectedPrescription.medication_name}</Text>
                  <HStack mt={2}>
                    <Badge>{selectedPrescription.dosage}</Badge>
                    <Badge>{selectedPrescription.frequency}</Badge>
                    <Badge>{selectedPrescription.duration}</Badge>
                  </HStack>
                  {selectedPrescription.instructions && (
                    <Text mt={2} fontStyle="italic">{selectedPrescription.instructions}</Text>
                  )}
                </Box>

                <Divider />

                <Box p={4} bg="gray.50" borderRadius="md">
                  <Text fontWeight="bold">Visit Information</Text>
                  {selectedPrescription.visit && (
                    <>
                      <Text>Date: {new Date(selectedPrescription.visit.visit_date).toLocaleDateString()}</Text>
                      <Text>Diagnosis: {selectedPrescription.visit.diagnosis || 'N/A'}</Text>
                    </>
                  )}
                </Box>

                <HStack justify="space-between">
                  <Text fontSize="sm" color="gray.500">
                    Prescribed: {new Date(selectedPrescription.created_at).toLocaleString()}
                  </Text>
                  <Badge colorScheme={getStatusColor(selectedPrescription.status)} fontSize="md" px={3} py={1}>
                    {selectedPrescription.status}
                  </Badge>
                </HStack>
              </VStack>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
}
