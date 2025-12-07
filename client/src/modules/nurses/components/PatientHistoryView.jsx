import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, VStack, Heading, Text, Button, Accordion, AccordionItem, AccordionButton, AccordionPanel, AccordionIcon,
  Badge, SimpleGrid, Divider, Spinner, Center, HStack, Table, Thead, Tbody, Tr, Th, Td, useToast
} from '@chakra-ui/react';
import { ArrowBackIcon, CalendarIcon } from '@chakra-ui/icons';
import { FiUsers, FiActivity, FiCheckSquare, FiClipboard } from 'react-icons/fi';
import { FaUserNurse, FaBed, FaSignOutAlt } from 'react-icons/fa';
import api from '../../../services/api';
import ModuleLayout from '../../../components/shared/ModuleLayout';

// Map queue status to colors
const getStatusColor = (status) => {
  const colors = {
    'Waiting': 'yellow',
    'Emergency': 'red',
    'In Vitals': 'orange',
    'Ready for Doctor': 'blue',
    'With Doctor': 'purple',
    'Pharmacy': 'teal',
    'Pending Admission': 'orange',
    'Admitted': 'pink',
    'Completed': 'green',
    'Discharged': 'green'
  };
  return colors[status] || 'gray';
};

const navItems = [
  { id: 'queue', label: 'Vitals Queue', icon: FiActivity },
  { id: 'admissions', label: 'Admission Requests', icon: FiClipboard },
  { id: 'ward', label: 'Ward Management', icon: FaBed },
  { id: 'discharges', label: 'Pending Discharges', icon: FaSignOutAlt },
  { id: 'completed', label: 'Completed Today', icon: FiCheckSquare },
  { id: 'patients', label: 'Patient Management', icon: FiUsers },
];

export default function PatientHistoryView({ patient: patientProp, onBack: onBackProp }) {
  const { patientId, visitId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [patient, setPatient] = useState(patientProp);
  const [visit, setVisit] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState((!!patientId || !!visitId) && !patientProp);

  // If visitId is in URL (from visit), fetch visit first to get patient
  useEffect(() => {
    const fetchVisit = async () => {
      try {
        const res = await api.get(`/nurses/visits/${visitId}`);
        setVisit(res.data);
        setPatient(res.data.patient);
      } catch (error) {
        console.error("Failed to fetch visit", error);
        navigate('/nurse/queue');
      } finally {
        setFetching(false);
      }
    };
    
    const fetchPatient = async () => {
      if (!patientId) {
        console.error("No patientId provided");
        navigate('/nurse/patients');
        return;
      }
      
      try {
        const res = await api.get(`/nurses/patients/${patientId}`);
        setPatient(res.data);
        setFetching(false);
      } catch (error) {
        console.error("Failed to fetch patient", error);
        toast({
          title: 'Failed to load patient',
          description: error.response?.data?.error || 'Patient not found',
          status: 'error',
          duration: 3000
        });
        setFetching(false);
        setTimeout(() => {
          navigate('/nurse/patients');
        }, 2000);
      }
    };
    
    if (visitId && !patientProp) {
      fetchVisit();
    } else if (patientId && !patientProp) {
      fetchPatient();
    } else if (!patientId && !visitId && !patientProp) {
      console.error("No patientId or visitId in URL");
      navigate('/nurse/patients');
    }
  }, [patientId, visitId, patientProp, navigate, toast]);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!patient) return;
      try {
        const res = await api.get(`/nurses/patients/${patient.patient_id}/history`);
        setHistory(res.data);
      } catch (error) {
        console.error("Failed to fetch history", error);
      } finally {
        setLoading(false);
      }
    };
    if (patient) {
      fetchHistory();
    }
  }, [patient]);

  const handleBack = () => {
    if (onBackProp) {
      onBackProp();
    } else if (visitId) {
      navigate(`/nurse/patient/${visitId}`);
    } else {
      navigate('/nurse/patients');
    }
  };

  if (fetching || loading) {
    return (
      <ModuleLayout
        activeTab="patients"
        setActiveTab={(tab) => navigate(`/nurse/${tab}`)}
        navItems={navItems}
        title="Nurse Station"
        color="purple"
        moduleIcon={FaUserNurse}
      >
        <Center h="200px"><Spinner /></Center>
      </ModuleLayout>
    );
  }

  if (!patient && !fetching) {
    return (
      <ModuleLayout
        activeTab="patients"
        setActiveTab={(tab) => navigate(`/nurse/${tab}`)}
        navItems={navItems}
        title="Nurse Station"
        color="purple"
        moduleIcon={FaUserNurse}
      >
        <Box bg="white" p={6} borderRadius="lg" boxShadow="sm">
          <Text color="red.500" mb={4}>Patient not found</Text>
          <Button onClick={() => navigate('/nurse/patients')}>Back to Patient Search</Button>
        </Box>
      </ModuleLayout>
    );
  }

  if (!patient) {
    return null;
  }

  return (
    <ModuleLayout
      activeTab="patients"
      setActiveTab={(tab) => navigate(`/nurse/${tab}`)}
      navItems={navItems}
      title="Nurse Station"
      color="purple"
      moduleIcon={FaUserNurse}
    >
      <Box>
        <Button leftIcon={<ArrowBackIcon />} variant="ghost" mb={4} onClick={handleBack}>
          Back to Search
        </Button>

        <Box bg="white" p={6} borderRadius="lg" boxShadow="sm">
        <HStack justify="space-between" mb={6}>
          <Heading size="md">
            Medical History: {patient.first_name} {patient.last_name}
          </Heading>
          <Badge fontSize="0.9em" colorScheme="blue">
            ID: {patient.national_id || 'N/A'}
          </Badge>
        </HStack>

        {history.length === 0 ? (
          <Text color="gray.500" textAlign="center" py={10}>No visit records found for this patient.</Text>
        ) : (
          <Accordion allowMultiple defaultIndex={[0]}>
            {history.map((record) => (
              <AccordionItem key={record.visit_id} border="1px solid" borderColor="gray.200" borderRadius="md" mb={4}>
                <h2>
                  <AccordionButton _expanded={{ bg: 'blue.50', color: 'blue.700' }}>
                    <Box flex="1" textAlign="left">
                      <HStack spacing={3}>
                        <CalendarIcon mr={2} />
                        <Text fontWeight="bold">{new Date(record.visit_date).toLocaleDateString()}</Text>
                        <Badge colorScheme={getStatusColor(record.queue_status)}>{record.queue_status}</Badge>
                        {record.is_emergency && <Badge colorScheme="red">EMERGENCY</Badge>}
                        {record.diagnosis && <Badge ml={2} variant="outline">{record.diagnosis}</Badge>}
                      </HStack>
                    </Box>
                    <AccordionIcon />
                  </AccordionButton>
                </h2>
                <AccordionPanel pb={4}>
                  <VStack align="stretch" spacing={4}>
                    {/* Visit Reason & Symptoms */}
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      <Box>
                        <Text fontWeight="bold" fontSize="sm" color="gray.600">Visit Reason</Text>
                        <Text>{record.visit_reason || 'N/A'}</Text>
                      </Box>
                      {record.symptoms && (
                        <Box>
                          <Text fontWeight="bold" fontSize="sm" color="gray.600">Symptoms</Text>
                          <Text>{record.symptoms}</Text>
                        </Box>
                      )}
                    </SimpleGrid>

                    {/* Vitals Section */}
                    {(record.systolic_bp || record.heart_rate || record.temperature) && (
                      <>
                        <Divider />
                        <Box>
                          <Text fontWeight="bold" fontSize="sm" color="purple.600" mb={2}>Vitals</Text>
                          <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3}>
                            {record.systolic_bp && record.diastolic_bp && (
                              <Box bg="gray.50" p={2} borderRadius="md">
                                <Text fontSize="xs" color="gray.500">Blood Pressure</Text>
                                <Text fontWeight="bold">{record.systolic_bp}/{record.diastolic_bp}</Text>
                              </Box>
                            )}
                            {record.heart_rate && (
                              <Box bg="gray.50" p={2} borderRadius="md">
                                <Text fontSize="xs" color="gray.500">Heart Rate</Text>
                                <Text fontWeight="bold">{record.heart_rate} bpm</Text>
                              </Box>
                            )}
                            {record.temperature && (
                              <Box bg="gray.50" p={2} borderRadius="md">
                                <Text fontSize="xs" color="gray.500">Temperature</Text>
                                <Text fontWeight="bold">{record.temperature}°C</Text>
                              </Box>
                            )}
                            {record.oxygen_saturation && (
                              <Box bg="gray.50" p={2} borderRadius="md">
                                <Text fontSize="xs" color="gray.500">SpO2</Text>
                                <Text fontWeight="bold">{record.oxygen_saturation}%</Text>
                              </Box>
                            )}
                            {record.weight && (
                              <Box bg="gray.50" p={2} borderRadius="md">
                                <Text fontSize="xs" color="gray.500">Weight</Text>
                                <Text fontWeight="bold">{record.weight} kg</Text>
                              </Box>
                            )}
                            {record.height && (
                              <Box bg="gray.50" p={2} borderRadius="md">
                                <Text fontSize="xs" color="gray.500">Height</Text>
                                <Text fontWeight="bold">{record.height} cm</Text>
                              </Box>
                            )}
                          </SimpleGrid>
                          {record.triage_level && (
                            <Badge mt={2} colorScheme={record.triage_level === 'Red' ? 'red' : record.triage_level === 'Yellow' ? 'yellow' : 'green'}>
                              Triage: {record.triage_level}
                            </Badge>
                          )}
                        </Box>
                      </>
                    )}
                    
                    {/* Diagnosis & Treatment */}
                    <Divider />
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      <Box>
                        <Text fontWeight="bold" fontSize="sm" color="gray.600">Diagnosis</Text>
                        <Text>{record.diagnosis || 'Pending'}</Text>
                      </Box>
                      <Box>
                        <Text fontWeight="bold" fontSize="sm" color="gray.600">Treatment Plan</Text>
                        <Text>{record.treatment_plan || 'N/A'}</Text>
                      </Box>
                    </SimpleGrid>

                    {record.doctor_notes && (
                      <Box>
                        <Text fontWeight="bold" fontSize="sm" color="gray.600">Doctor Notes</Text>
                        <Text fontStyle="italic">{record.doctor_notes}</Text>
                      </Box>
                    )}

                    {record.nurse_notes && (
                      <Box>
                        <Text fontWeight="bold" fontSize="sm" color="gray.600">Nurse Notes</Text>
                        <Text fontStyle="italic">{record.nurse_notes}</Text>
                      </Box>
                    )}

                    {/* Prescriptions */}
                    {record.prescriptions && record.prescriptions.length > 0 && (
                      <>
                        <Divider />
                        <Box>
                          <Text fontWeight="bold" fontSize="sm" color="green.600" mb={2}>Prescriptions</Text>
                          <Table size="sm" variant="simple">
                            <Thead>
                              <Tr>
                                <Th>Medication</Th>
                                <Th>Dosage</Th>
                                <Th>Frequency</Th>
                                <Th>Duration</Th>
                                <Th>Status</Th>
                              </Tr>
                            </Thead>
                            <Tbody>
                              {record.prescriptions.map((rx, i) => (
                                <Tr key={i}>
                                  <Td>{rx.medication_name}</Td>
                                  <Td>{rx.dosage}</Td>
                                  <Td>{rx.frequency}</Td>
                                  <Td>{rx.duration}</Td>
                                  <Td>
                                    <Badge colorScheme={rx.status === 'Dispensed' ? 'green' : 'orange'}>{rx.status}</Badge>
                                  </Td>
                                </Tr>
                              ))}
                            </Tbody>
                          </Table>
                        </Box>
                      </>
                    )}

                    {/* Lab Orders */}
                    {record.lab_orders && record.lab_orders.length > 0 && (
                      <>
                        <Divider />
                        <Box>
                          <Text fontWeight="bold" fontSize="sm" color="purple.600" mb={2}>Lab Orders</Text>
                          <Table size="sm" variant="simple">
                            <Thead>
                              <Tr>
                                <Th>Test</Th>
                                <Th>Urgency</Th>
                                <Th>Status</Th>
                                <Th>Results</Th>
                              </Tr>
                            </Thead>
                            <Tbody>
                              {record.lab_orders.map((lab, i) => (
                                <Tr key={i}>
                                  <Td>{lab.test_type}</Td>
                                  <Td>
                                    <Badge colorScheme={lab.urgency === 'Stat' ? 'red' : 'gray'}>{lab.urgency}</Badge>
                                  </Td>
                                  <Td>
                                    <Badge colorScheme={lab.status === 'Completed' ? 'green' : 'orange'}>{lab.status}</Badge>
                                  </Td>
                                  <Td>{lab.results || '-'}</Td>
                                </Tr>
                              ))}
                            </Tbody>
                          </Table>
                        </Box>
                      </>
                    )}
                  </VStack>
                </AccordionPanel>
              </AccordionItem>
            ))}
          </Accordion>
        )}
        </Box>
      </Box>
    </ModuleLayout>
  );
}

