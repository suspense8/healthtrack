import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Table, Thead, Tbody, Tr, Th, Td, Badge, Button, useToast,
  Tabs, TabList, TabPanels, Tab, TabPanel, HStack, Text, VStack,
  FormControl, FormLabel, Select, Textarea, Heading
} from '@chakra-ui/react';
import { FaHeartbeat, FaStethoscope } from 'react-icons/fa';
import api from '../../../services/api';

export default function SplitDoctorQueue({ onStartConsult }) {
  const navigate = useNavigate();
  const [regularQueue, setRegularQueue] = useState([]);
  const [obstetricQueue, setObstetricQueue] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [admitting, setAdmitting] = useState(false);
  const [admissionForm, setAdmissionForm] = useState({
    ward_type: 'Maternity Ward',
    delivery_plan: 'SVD',
    admission_notes: ''
  });
  const toast = useToast();

  const fetchQueues = async () => {
    setLoading(true);
    try {
      const [regularRes, obstetricRes] = await Promise.all([
        api.get('/doctor/queue?type=regular'),
        api.get('/doctor/queue?type=emergency_obstetric')
      ]);

      setRegularQueue(regularRes.data);
      setObstetricQueue(obstetricRes.data);
    } catch (error) {
      console.error('Failed to fetch queues', error);
      toast({
        title: 'Error loading queues',
        status: 'error',
        duration: 3000
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueues();
    const interval = setInterval(fetchQueues, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleAdmitClick = (visit) => {
    setSelectedVisit(visit);
    const obsv = visit.obstetric_visit;
    const notes = obsv
      ? `Emergency Admission (${visit.emergency_subtype || 'Emergency'})\nG${obsv.gravida ?? '?'}P${obsv.para ?? '?'}, ${obsv.gestational_age_weeks ?? '?'}w\nFHR: ${obsv.fetal_heart_rate ?? '?'}, Dilation: ${obsv.cervical_dilation_cm ?? '?'}cm`
      : `Emergency Admission (${visit.emergency_subtype || 'Emergency'})\nComplaint: ${visit.visit_reason || 'N/A'}`;
    setAdmissionForm(prev => ({ ...prev, admission_notes: notes }));
  };

  const handleAdmissionSubmit = async (visit) => {
    setAdmitting(true);
    try {
      const obsv = visit.obstetric_visit;
      const symptomsText = obsv
        ? (obsv.maternal_distress ? 'Maternal distress' : `Labor - ${visit.emergency_subtype || 'Emergency'}`)
        : (visit.visit_reason || visit.emergency_subtype || 'Emergency');
      const examText = obsv
        ? `G${obsv.gravida ?? '?'}P${obsv.para ?? '?'}, ${obsv.gestational_age_weeks ?? '?'}w, FHR ${obsv.fetal_heart_rate ?? '?'}, Dilation ${obsv.cervical_dilation_cm ?? '?'}cm`
        : `Emergency Type: ${visit.emergency_subtype || 'N/A'}`;
      const diagnosisText = obsv
        ? `${visit.emergency_subtype || 'Labor'} - Emergency Obstetric`
        : `${visit.emergency_subtype || 'Emergency'} - Emergency Case`;
      await api.post('/doctor/consultation', {
        visit_id: visit.visit_id,
        symptoms: symptomsText,
        physical_exam: examText,
        diagnosis: diagnosisText,
        doctor_notes: admissionForm.admission_notes,
        disposition: 'Admitted',
        prescriptions: [],
        lab_orders: []
      });

      await api.post('/admission/request', {
        patient_id: visit.patient.patient_id,
        visit_id: visit.visit_id,
        ward_id: null,
        priority: visit.triage_level === 'Red' ? 'Critical' : 'Normal',
        admission_reason: visit.obstetric_visit
          ? `Emergency ${visit.emergency_subtype || 'Obstetric'} - ${admissionForm.delivery_plan}\n\nObstetric Details:\nG${visit.obstetric_visit?.gravida ?? '?'}P${visit.obstetric_visit?.para ?? '?'}, ${visit.obstetric_visit?.gestational_age_weeks ?? '?'}w\nFHR: ${visit.obstetric_visit?.fetal_heart_rate ?? '?'}, Dilation: ${visit.obstetric_visit?.cervical_dilation_cm ?? '?'}cm\nPreferred Ward: ${admissionForm.ward_type}`
          : `Emergency ${visit.emergency_subtype || 'Case'}\nComplaint: ${visit.visit_reason || 'N/A'}\nPreferred Ward: ${admissionForm.ward_type}`,
        initial_orders: admissionForm.admission_notes
      });

      toast({
        title: 'Patient admitted',
        description: 'Admission request sent to nursing station',
        status: 'success',
        duration: 3000
      });

      setSelectedVisit(null);
      fetchQueues();
    } catch (error) {
      console.error('Admission error:', error);
      toast({
        title: 'Admission failed',
        description: error.response?.data?.error || 'Please try again',
        status: 'error',
        duration: 5000
      });
    } finally {
      setAdmitting(false);
    }
  };

  return (
    <Box>
      <HStack justify="space-between" mb={4}>
        <Button size="sm" onClick={fetchQueues} isLoading={loading}>
          Refresh
        </Button>
      </HStack>

      <Tabs colorScheme="blue" variant="enclosed">
        <TabList>
          <Tab>
            <HStack>
              <FaStethoscope />
              <Text>Regular Queue ({regularQueue.length})</Text>
            </HStack>
          </Tab>
          <Tab>
            <HStack>
              <FaHeartbeat />
              <Text>Emergency Queue ({obstetricQueue.length})</Text>
            </HStack>
          </Tab>
        </TabList>

        <TabPanels>
          <TabPanel px={0}>
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Queue #</Th>
                  <Th>Patient</Th>
                  <Th>Age</Th>
                  <Th>Reason</Th>
                  <Th>Triage</Th>
                  <Th>Action</Th>
                </Tr>
              </Thead>
              <Tbody>
                {regularQueue.map((visit) => (
                  <Tr key={visit.visit_id} _hover={{ bg: 'gray.50' }}>
                    <Td fontWeight="bold">#{visit.queue_number}</Td>
                    <Td>
                      <VStack align="start" spacing={0}>
                        <Text fontWeight="medium">
                          {visit.patient.first_name} {visit.patient.last_name}
                        </Text>
                        {visit.is_emergency && (
                          <Badge colorScheme="red" fontSize="xs">EMERGENCY</Badge>
                        )}
                        {visit.appointment_id && (
                          <Badge colorScheme="blue" fontSize="xs">FOLLOW-UP</Badge>
                        )}
                      </VStack>
                    </Td>
                    <Td>{visit.patient.date_of_birth ? new Date().getFullYear() - new Date(visit.patient.date_of_birth).getFullYear() : '?'}</Td>
                    <Td maxW="200px" isTruncated>{visit.visit_reason}</Td>
                    <Td>
                      <Badge
                        colorScheme={
                          visit.triage_level === 'Red' ? 'red' :
                            visit.triage_level === 'Yellow' ? 'yellow' :
                              'green'
                        }
                      >
                        {visit.triage_level || 'N/A'}
                      </Badge>
                    </Td>
                    <Td>
                      <Button
                        size="sm"
                        colorScheme="blue"
                        leftIcon={<FaStethoscope />}
                        onClick={() => onStartConsult(visit)}
                      >
                        Consult
                      </Button>
                    </Td>
                  </Tr>
                ))}
                {regularQueue.length === 0 && (
                  <Tr>
                    <Td colSpan={6} textAlign="center" color="gray.500">
                      No patients in queue
                    </Td>
                  </Tr>
                )}
              </Tbody>
            </Table>
          </TabPanel>

          <TabPanel px={0}>
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Queue #</Th>
                  <Th>Patient</Th>
                  <Th>Age</Th>
                  <Th>G/P</Th>
                  <Th>Weeks</Th>
                  <Th>FHR</Th>
                  <Th>Dilation</Th>
                  <Th>Risk</Th>
                  <Th>Action</Th>
                </Tr>
              </Thead>
              <Tbody>
                {obstetricQueue.map((visit) => (
                  <>
                    <Tr key={visit.visit_id} _hover={{ bg: 'pink.50' }}>
                      <Td fontWeight="bold">#{visit.queue_number}</Td>
                      <Td>
                        <VStack align="start" spacing={0}>
                          <Text fontWeight="medium">
                            {visit.patient.first_name} {visit.patient.last_name}
                          </Text>
                          <Badge colorScheme="red">{visit.emergency_subtype || 'EMERGENCY'}</Badge>
                        </VStack>
                      </Td>
                      <Td>{visit.patient.date_of_birth ? new Date().getFullYear() - new Date(visit.patient.date_of_birth).getFullYear() : '?'}</Td>
                      <Td>
                        G{visit.obstetric_visit?.gravida || '?'} P{visit.obstetric_visit?.para || '?'}
                      </Td>
                      <Td>{visit.obstetric_visit?.gestational_age_weeks || '?'} wks</Td>
                      <Td>
                        <Badge
                          colorScheme={
                            visit.obstetric_visit?.fetal_heart_rate < 110 || visit.obstetric_visit?.fetal_heart_rate > 160
                              ? 'red'
                              : 'green'
                          }
                        >
                          {visit.obstetric_visit?.fetal_heart_rate || '?'} bpm
                        </Badge>
                      </Td>
                      <Td>{visit.obstetric_visit?.cervical_dilation_cm || '?'} cm</Td>
                      <Td>
                        <Badge
                          colorScheme={
                            visit.triage_level === 'Red' ? 'red' :
                              visit.triage_level === 'Yellow' ? 'yellow' :
                                'green'
                          }
                        >
                          {visit.triage_level || 'N/A'}
                        </Badge>
                      </Td>
                      <Td>
                        <Button
                          size="sm"
                          colorScheme="pink"
                          leftIcon={<FaHeartbeat />}
                          onClick={() => handleAdmitClick(visit)}
                        >
                          Admit
                        </Button>
                      </Td>
                    </Tr>

                    {selectedVisit?.visit_id === visit.visit_id && (
                      <Tr>
                        <Td colSpan={9} bg="pink.50" p={4}>
                          <Box borderLeft="4px solid" borderColor="pink.400" p={4} bg="white" borderRadius="md">
                            <Heading size="sm" mb={4} color="pink.700">Admission Request</Heading>

                            <VStack spacing={3} align="stretch">
                              <HStack spacing={4}>
                                <FormControl>
                                  <FormLabel fontSize="sm">Delivery Plan</FormLabel>
                                  <Select
                                    size="sm"
                                    value={admissionForm.delivery_plan}
                                    onChange={(e) => setAdmissionForm(prev => ({ ...prev, delivery_plan: e.target.value }))}
                                  >
                                    <option value="SVD">Spontaneous Vaginal Delivery</option>
                                    <option value="Assisted">Assisted Delivery</option>
                                    <option value="C-Section">Cesarean Section</option>
                                    <option value="Monitor">Monitor First</option>
                                  </Select>
                                </FormControl>

                                <FormControl>
                                  <FormLabel fontSize="sm">Preferred Ward</FormLabel>
                                  <Select
                                    size="sm"
                                    value={admissionForm.ward_type}
                                    onChange={(e) => setAdmissionForm(prev => ({ ...prev, ward_type: e.target.value }))}
                                  >
                                    <option value="Maternity Ward">Maternity Ward</option>
                                    <option value="Emergency Ward">Emergency Ward</option>
                                    <option value="ICU">ICU (High Risk)</option>
                                  </Select>
                                </FormControl>
                              </HStack>

                              <FormControl>
                                <FormLabel fontSize="sm">Admission Notes</FormLabel>
                                <Textarea
                                  size="sm"
                                  value={admissionForm.admission_notes}
                                  onChange={(e) => setAdmissionForm(prev => ({ ...prev, admission_notes: e.target.value }))}
                                  rows={3}
                                  placeholder="Clinical findings, plan of care..."
                                />
                              </FormControl>

                              <HStack justify="flex-end">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setSelectedVisit(null)}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  colorScheme="pink"
                                  isLoading={admitting}
                                  loadingText="Admitting..."
                                  onClick={() => handleAdmissionSubmit(visit)}
                                >
                                  Submit Admission
                                </Button>
                              </HStack>
                            </VStack>
                          </Box>
                        </Td>
                      </Tr>
                    )}
                  </>
                ))}
                {obstetricQueue.length === 0 && (
                  <Tr>
                    <Td colSpan={9} textAlign="center" color="gray.500">
                      No obstetric emergencies
                    </Td>
                  </Tr>
                )}
              </Tbody>
            </Table>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
}
