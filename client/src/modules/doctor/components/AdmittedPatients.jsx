import { useState, useEffect } from 'react';
import {
  Box, Heading, Table, Thead, Tbody, Tr, Th, Td, Badge, Button, 
  HStack, Text, Spinner, Center, VStack, useToast, useDisclosure,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton, ModalFooter,
  FormControl, FormLabel, Textarea, Input, Tabs, TabList, TabPanels, Tab, TabPanel,
  SimpleGrid, Divider, Select
} from '@chakra-ui/react';
import { ViewIcon, CheckIcon } from '@chakra-ui/icons';
import api from '../../../services/api';

export default function AdmittedPatients() {
  const [admissions, setAdmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAdmission, setSelectedAdmission] = useState(null);
  const [dischargeData, setDischargeData] = useState({
    discharge_summary: '',
    discharge_meds: '',
    follow_up_date: ''
  });
  const [processing, setProcessing] = useState(false);
  
  const { isOpen: isViewOpen, onOpen: onViewOpen, onClose: onViewClose } = useDisclosure();
  const { isOpen: isDischargeOpen, onOpen: onDischargeOpen, onClose: onDischargeClose } = useDisclosure();
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

  const openViewModal = (admission) => {
    setSelectedAdmission(admission);
    onViewOpen();
  };

  const openDischargeModal = (admission) => {
    setSelectedAdmission(admission);
    setDischargeData({
      discharge_summary: '',
      discharge_meds: '',
      follow_up_date: ''
    });
    onDischargeOpen();
  };

  const handleInitiateDischarge = async () => {
    if (!dischargeData.discharge_summary.trim()) {
      toast({ title: 'Please enter a discharge summary', status: 'warning' });
      return;
    }

    setProcessing(true);
    try {
      await api.patch(`/admission/${selectedAdmission.admission_id}/initiate-discharge`, dischargeData);
      toast({ title: 'Discharge initiated - awaiting nurse confirmation', status: 'info' });
      onDischargeClose();
      fetchAdmissions();
    } catch (error) {
      toast({ title: 'Failed to initiate discharge', status: 'error' });
    } finally {
      setProcessing(false);
    }
  };

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
                  <Button size="xs" colorScheme="blue" leftIcon={<ViewIcon />} onClick={() => openViewModal(adm)}>
                    View
                  </Button>
                  {adm.admission_status === 'Admitted' && (
                    <Button size="xs" colorScheme="green" leftIcon={<CheckIcon />} onClick={() => openDischargeModal(adm)}>
                      Discharge
                    </Button>
                  )}
                </HStack>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>

      {/* View Admission Details Modal */}
      <Modal isOpen={isViewOpen} onClose={onViewClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            Admission Details: {selectedAdmission?.patient?.first_name} {selectedAdmission?.patient?.last_name}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedAdmission && (
              <Tabs variant="enclosed" colorScheme="green">
                <TabList>
                  <Tab>Admission Info</Tab>
                  <Tab>Progress Notes ({selectedAdmission.notes?.length || 0})</Tab>
                </TabList>
                <TabPanels>
                  <TabPanel>
                    <SimpleGrid columns={2} spacing={4}>
                      <Box>
                        <Text fontSize="xs" color="gray.500">Ward / Bed</Text>
                        <Text fontWeight="bold">{selectedAdmission.ward?.ward_name} - {selectedAdmission.bed?.bed_number}</Text>
                      </Box>
                      <Box>
                        <Text fontSize="xs" color="gray.500">Admitted On</Text>
                        <Text>{new Date(selectedAdmission.admitted_at).toLocaleString()}</Text>
                      </Box>
                      <Box gridColumn="span 2">
                        <Text fontSize="xs" color="gray.500">Admission Reason</Text>
                        <Text>{selectedAdmission.admission_reason}</Text>
                      </Box>
                      <Box gridColumn="span 2">
                        <Text fontSize="xs" color="gray.500">Initial Orders</Text>
                        <Text>{selectedAdmission.initial_orders || 'None'}</Text>
                      </Box>
                    </SimpleGrid>
                  </TabPanel>
                  <TabPanel>
                    <VStack spacing={3} align="stretch" maxH="400px" overflowY="auto">
                      {selectedAdmission.notes?.map((note) => (
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
                      {(!selectedAdmission.notes || selectedAdmission.notes.length === 0) && (
                        <Text color="gray.500" textAlign="center">No notes recorded yet</Text>
                      )}
                    </VStack>
                  </TabPanel>
                </TabPanels>
              </Tabs>
            )}
          </ModalBody>
          <ModalFooter>
            <Button onClick={onViewClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Discharge Modal */}
      <Modal isOpen={isDischargeOpen} onClose={onDischargeClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Discharge Patient</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedAdmission && (
              <VStack spacing={4} align="stretch">
                <Box p={3} bg="blue.50" borderRadius="md">
                  <Text fontWeight="bold">
                    {selectedAdmission.patient?.first_name} {selectedAdmission.patient?.last_name}
                  </Text>
                  <Text fontSize="sm">
                    {selectedAdmission.ward?.ward_name} - Bed {selectedAdmission.bed?.bed_number}
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    Admitted: {new Date(selectedAdmission.admitted_at).toLocaleDateString()}
                  </Text>
                </Box>

                <Divider />

                <FormControl isRequired>
                  <FormLabel>Discharge Summary</FormLabel>
                  <Textarea 
                    value={dischargeData.discharge_summary}
                    onChange={(e) => setDischargeData({...dischargeData, discharge_summary: e.target.value})}
                    placeholder="Patient condition at discharge, treatment provided, outcome..."
                    rows={4}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Take-Home Medications</FormLabel>
                  <Textarea 
                    value={dischargeData.discharge_meds}
                    onChange={(e) => setDischargeData({...dischargeData, discharge_meds: e.target.value})}
                    placeholder="Prescriptions for patient to take home..."
                    rows={3}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Follow-Up Appointment</FormLabel>
                  <Input 
                    type="datetime-local"
                    value={dischargeData.follow_up_date}
                    onChange={(e) => setDischargeData({...dischargeData, follow_up_date: e.target.value})}
                  />
                </FormControl>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button mr={3} onClick={onDischargeClose}>Cancel</Button>
            <Button 
              colorScheme="green" 
              onClick={handleInitiateDischarge}
              isLoading={processing}
            >
              Initiate Discharge
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
