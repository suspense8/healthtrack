import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Heading, SimpleGrid, Text, Badge, Button, Spinner, Center,
  VStack, HStack, Grid, GridItem, Icon, Stat, StatLabel, StatNumber,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton, ModalFooter,
  Tabs, TabList, TabPanels, Tab, TabPanel, FormControl, FormLabel, Textarea, Select,
  useToast, useDisclosure, Divider, Input
} from '@chakra-ui/react';
import { FaBed, FaUser, FaNotesMedical, FaThermometerHalf } from 'react-icons/fa';
import api from '../../../services/api';

export default function WardDashboard() {
  const navigate = useNavigate();
  const [wards, setWards] = useState([]);
  const [selectedWard, setSelectedWard] = useState(null);
  const [admittedPatients, setAdmittedPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const fetchWards = async () => {
    try {
      const res = await api.get('/admission/wards');
      setWards(res.data);
      if (!selectedWard && res.data.length > 0) {
        setSelectedWard(res.data[0]);
      }
    } catch (error) {
      console.error('Failed to fetch wards', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdmittedPatients = async () => {
    if (!selectedWard) return;
    try {
      const res = await api.get(`/admission/admitted?wardId=${selectedWard.ward_id}`);
      setAdmittedPatients(res.data);
    } catch (error) {
      console.error('Failed to fetch patients', error);
    }
  };

  useEffect(() => {
    fetchWards();
  }, []);

  useEffect(() => {
    if (selectedWard) {
      fetchAdmittedPatients();
    }
  }, [selectedWard]);

  const openPatientDetails = (patient) => {
    navigate(`/nurse/ward/patient/${patient.admission_id}`);
  };


  const getOccupancyColor = (rate) => {
    if (rate >= 90) return 'red';
    if (rate >= 70) return 'orange';
    return 'green';
  };

  if (loading) {
    return <Center h="300px"><Spinner size="xl" color="purple.500" /></Center>;
  }

  return (
    <Box>
      {/* Ward Selection */}
      <SimpleGrid columns={{ base: 2, md: 3, lg: 6 }} spacing={4} mb={6}>
        {wards.map((ward) => (
          <Box
            key={ward.ward_id}
            p={4}
            bg={selectedWard?.ward_id === ward.ward_id ? 'purple.100' : 'white'}
            borderRadius="lg"
            boxShadow="sm"
            cursor="pointer"
            onClick={() => setSelectedWard(ward)}
            borderWidth={selectedWard?.ward_id === ward.ward_id ? '2px' : '1px'}
            borderColor={selectedWard?.ward_id === ward.ward_id ? 'purple.500' : 'gray.200'}
            _hover={{ borderColor: 'purple.300' }}
          >
            <Text fontWeight="bold" fontSize="sm">{ward.ward_name}</Text>
            <HStack mt={2}>
              <Icon as={FaBed} color="gray.500" />
              <Text fontSize="sm">{ward.available_beds}/{ward.total_beds}</Text>
              <Badge colorScheme={getOccupancyColor(ward.occupancy_rate)}>
                {ward.occupancy_rate}%
              </Badge>
            </HStack>
          </Box>
        ))}
      </SimpleGrid>

      {/* Ward Stats */}
      {selectedWard && (
        <SimpleGrid columns={4} spacing={4} mb={6}>
          <Stat p={4} bg="white" borderRadius="md" boxShadow="sm">
            <StatLabel>Total Beds</StatLabel>
            <StatNumber>{selectedWard.total_beds}</StatNumber>
          </Stat>
          <Stat p={4} bg="white" borderRadius="md" boxShadow="sm">
            <StatLabel>Occupied</StatLabel>
            <StatNumber color="orange.500">{selectedWard.occupied_beds}</StatNumber>
          </Stat>
          <Stat p={4} bg="white" borderRadius="md" boxShadow="sm">
            <StatLabel>Available</StatLabel>
            <StatNumber color="green.500">{selectedWard.available_beds}</StatNumber>
          </Stat>
          <Stat p={4} bg="white" borderRadius="md" boxShadow="sm">
            <StatLabel>Admitted Patients</StatLabel>
            <StatNumber>{admittedPatients.length}</StatNumber>
          </Stat>
        </SimpleGrid>
      )}

      {/* Bed Grid */}
      {selectedWard && (
        <Box>
          <Heading size="sm" mb={4}>
            {selectedWard.ward_name} - Patients
          </Heading>

          {admittedPatients.length === 0 ? (
            <Center h="150px" bg="gray.50" borderRadius="md">
              <Text color="gray.500">No patients currently admitted to this ward</Text>
            </Center>
          ) : (
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
              {admittedPatients.map((adm) => (
                <Box
                  key={adm.admission_id}
                  p={4}
                  bg="white"
                  borderRadius="lg"
                  boxShadow="sm"
                  borderLeft="4px solid"
                  borderColor={adm.priority === 'Critical' ? 'red.400' : adm.priority === 'Urgent' ? 'orange.400' : 'green.400'}
                >
                  <HStack justify="space-between" mb={2}>
                    <VStack align="start" spacing={0}>
                      <Text fontWeight="bold">
                        {adm.patient?.first_name} {adm.patient?.last_name}
                      </Text>
                      <Text fontSize="sm" color="gray.500">
                        Bed: {adm.bed?.bed_number}
                      </Text>
                    </VStack>
                    <Badge colorScheme={adm.priority === 'Critical' ? 'red' : adm.priority === 'Urgent' ? 'orange' : 'green'}>
                      {adm.priority}
                    </Badge>
                  </HStack>

                  <Text fontSize="sm" color="gray.600" mb={3} noOfLines={2}>
                    {adm.admission_reason}
                  </Text>

                  <Text fontSize="xs" color="gray.400" mb={3}>
                    Admitted: {new Date(adm.admitted_at).toLocaleString()}
                  </Text>

                  <HStack>
                    <Button size="xs" colorScheme="blue" onClick={() => openPatientDetails(adm)}>
                      View Details
                    </Button>
                    <Button size="xs" colorScheme="purple" variant="outline" onClick={() => navigate(`/nurse/ward/note/${adm.admission_id}`)}>
                      Add Note
                    </Button>
                  </HStack>
                </Box>
              ))}
            </SimpleGrid>
          )}
        </Box>
      )}

    </Box>
  );
}
