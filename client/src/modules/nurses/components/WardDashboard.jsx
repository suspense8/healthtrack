import { useState, useEffect } from 'react';
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
  const [wards, setWards] = useState([]);
  const [selectedWard, setSelectedWard] = useState(null);
  const [admittedPatients, setAdmittedPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [noteType, setNoteType] = useState('Observation');
  const [noteContent, setNoteContent] = useState('');
  const [vitals, setVitals] = useState({});
  const [processing, setProcessing] = useState(false);
  
  const { isOpen: isPatientOpen, onOpen: onPatientOpen, onClose: onPatientClose } = useDisclosure();
  const { isOpen: isNoteOpen, onOpen: onNoteOpen, onClose: onNoteClose } = useDisclosure();
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
    setSelectedPatient(patient);
    onPatientOpen();
  };

  const openAddNote = (patient) => {
    setSelectedPatient(patient);
    setNoteType('Observation');
    setNoteContent('');
    setVitals({});
    onNoteOpen();
  };

  const handleAddNote = async () => {
    if (!noteContent.trim()) {
      toast({ title: 'Please enter note content', status: 'warning' });
      return;
    }

    setProcessing(true);
    try {
      await api.post(`/admission/${selectedPatient.admission_id}/notes`, {
        note_type: noteType,
        content: noteContent,
        vitals: noteType === 'Vitals' ? vitals : null
      });
      toast({ title: 'Note added', status: 'success' });
      onNoteClose();
      fetchAdmittedPatients();
    } catch (error) {
      toast({ title: 'Failed to add note', status: 'error' });
    } finally {
      setProcessing(false);
    }
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
                    <Button size="xs" colorScheme="purple" variant="outline" onClick={() => openAddNote(adm)}>
                      Add Note
                    </Button>
                  </HStack>
                </Box>
              ))}
            </SimpleGrid>
          )}
        </Box>
      )}

      {/* Patient Details Modal */}
      <Modal isOpen={isPatientOpen} onClose={onPatientClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {selectedPatient?.patient?.first_name} {selectedPatient?.patient?.last_name}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedPatient && (
              <Tabs variant="enclosed" colorScheme="purple">
                <TabList>
                  <Tab>Admission Info</Tab>
                  <Tab>Notes ({selectedPatient.notes?.length || 0})</Tab>
                </TabList>
                <TabPanels>
                  <TabPanel>
                    <SimpleGrid columns={2} spacing={4}>
                      <Box>
                        <Text fontSize="xs" color="gray.500">Ward / Bed</Text>
                        <Text fontWeight="bold">{selectedPatient.ward?.ward_name} - {selectedPatient.bed?.bed_number}</Text>
                      </Box>
                      <Box>
                        <Text fontSize="xs" color="gray.500">Priority</Text>
                        <Badge colorScheme={selectedPatient.priority === 'Critical' ? 'red' : 'orange'}>
                          {selectedPatient.priority}
                        </Badge>
                      </Box>
                      <Box gridColumn="span 2">
                        <Text fontSize="xs" color="gray.500">Admission Reason</Text>
                        <Text>{selectedPatient.admission_reason}</Text>
                      </Box>
                      <Box gridColumn="span 2">
                        <Text fontSize="xs" color="gray.500">Initial Orders</Text>
                        <Text>{selectedPatient.initial_orders || 'None specified'}</Text>
                      </Box>
                    </SimpleGrid>
                  </TabPanel>
                  <TabPanel>
                    <VStack spacing={3} align="stretch" maxH="400px" overflowY="auto">
                      {selectedPatient.notes?.map((note) => (
                        <Box key={note.note_id} p={3} bg="gray.50" borderRadius="md">
                          <HStack justify="space-between" mb={1}>
                            <Badge>{note.note_type}</Badge>
                            <Text fontSize="xs" color="gray.500">
                              {new Date(note.created_at).toLocaleString()}
                            </Text>
                          </HStack>
                          <Text fontSize="sm">{note.content}</Text>
                          {note.systolic_bp && (
                            <Text fontSize="xs" color="blue.600" mt={1}>
                              Vitals: BP {note.systolic_bp}/{note.diastolic_bp}, HR {note.heart_rate}, Temp {note.temperature}°C
                            </Text>
                          )}
                        </Box>
                      ))}
                      {(!selectedPatient.notes || selectedPatient.notes.length === 0) && (
                        <Text color="gray.500" textAlign="center">No notes yet</Text>
                      )}
                    </VStack>
                  </TabPanel>
                </TabPanels>
              </Tabs>
            )}
          </ModalBody>
          <ModalFooter>
            <Button onClick={onPatientClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Add Note Modal */}
      <Modal isOpen={isNoteOpen} onClose={onNoteClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add Note</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Note Type</FormLabel>
                <Select value={noteType} onChange={(e) => setNoteType(e.target.value)}>
                  <option value="Observation">Observation</option>
                  <option value="Vitals">Vitals Check</option>
                  <option value="Medication">Medication Admin</option>
                  <option value="Progress">Progress Note</option>
                </Select>
              </FormControl>

              {noteType === 'Vitals' && (
                <SimpleGrid columns={2} spacing={3} w="full">
                  <FormControl>
                    <FormLabel size="sm">Systolic BP</FormLabel>
                    <Input 
                      type="number" 
                      size="sm"
                      value={vitals.systolic_bp || ''}
                      onChange={(e) => setVitals({...vitals, systolic_bp: parseInt(e.target.value)})}
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel size="sm">Diastolic BP</FormLabel>
                    <Input 
                      type="number" 
                      size="sm"
                      value={vitals.diastolic_bp || ''}
                      onChange={(e) => setVitals({...vitals, diastolic_bp: parseInt(e.target.value)})}
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel size="sm">Heart Rate</FormLabel>
                    <Input 
                      type="number" 
                      size="sm"
                      value={vitals.heart_rate || ''}
                      onChange={(e) => setVitals({...vitals, heart_rate: parseInt(e.target.value)})}
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel size="sm">Temperature °C</FormLabel>
                    <Input 
                      type="number" 
                      step="0.1"
                      size="sm"
                      value={vitals.temperature || ''}
                      onChange={(e) => setVitals({...vitals, temperature: parseFloat(e.target.value)})}
                    />
                  </FormControl>
                </SimpleGrid>
              )}

              <FormControl>
                <FormLabel>Notes</FormLabel>
                <Textarea 
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Enter your observations..."
                  rows={4}
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button mr={3} onClick={onNoteClose}>Cancel</Button>
            <Button colorScheme="purple" onClick={handleAddNote} isLoading={processing}>
              Save Note
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
