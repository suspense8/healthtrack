import { useState, useEffect } from 'react';
import {
  Box, Heading, VStack, FormControl, FormLabel, Input, Textarea, Button, HStack,
  Tabs, TabList, TabPanels, Tab, TabPanel, Select, Divider, Text, IconButton,
  Table, Thead, Tbody, Tr, Th, Td, useToast, Badge, SimpleGrid, Radio, RadioGroup, Stack,
  Alert, AlertIcon, useDisclosure
} from '@chakra-ui/react';
import { ArrowBackIcon, AddIcon, DeleteIcon, SearchIcon } from '@chakra-ui/icons';
import api from '../../../services/api';
import PatientHistoryView from './PatientHistoryView';
import DiseaseSearchModal from './DiseaseSearchModal';

export default function ConsultationView({ visit, onBack, onComplete }) {
  const [formData, setFormData] = useState({
    symptoms: '',
    physical_exam: '',
    diagnosis: '',
    doctor_notes: '',
    disposition: 'Discharged',
    referral_dest: '',
    admission_notes: '',
    follow_up_date: ''
  });

  // Admission-specific state
  const [admissionData, setAdmissionData] = useState({
    ward_id: '',
    priority: 'Normal',
    admission_reason: '',
    initial_orders: ''
  });
  const [wards, setWards] = useState([]);

  const [prescriptions, setPrescriptions] = useState([]);
  const [newPrescription, setNewPrescription] = useState({ medication_name: '', dosage: '', frequency: '', duration: '' });
  
  const [labOrders, setLabOrders] = useState([]);
  const [newLabOrder, setNewLabOrder] = useState({ test_type: '', urgency: 'Routine' });

  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const toast = useToast();
  
  // Disease search modal
  const { isOpen: isDiseaseSearchOpen, onOpen: onDiseaseSearchOpen, onClose: onDiseaseSearchClose } = useDisclosure();
  
  // Get doctor token from localStorage
  const doctorToken = localStorage.getItem('token_doctor');

  const handleDiseaseSelect = (disease) => {
    setFormData(prev => ({
      ...prev,
      diagnosis: disease.name + (prev.diagnosis ? `, ${prev.diagnosis}` : '')
    }));
    toast({
      title: 'Disease added to diagnosis',
      description: disease.name,
      status: 'success',
      duration: 2000
    });
  };

  // Fetch wards when disposition is set to Admitted
  useEffect(() => {
    if (formData.disposition === 'Admitted' && wards.length === 0) {
      fetchWards();
    }
  }, [formData.disposition]);

  const fetchWards = async () => {
    try {
      const res = await api.get('/admission/wards');
      setWards(res.data);
    } catch (error) {
      console.error('Failed to fetch wards', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAdmissionChange = (e) => {
    const { name, value } = e.target;
    setAdmissionData(prev => ({ ...prev, [name]: value }));
  };

  const addPrescription = () => {
    if (!newPrescription.medication_name) return;
    setPrescriptions([...prescriptions, newPrescription]);
    setNewPrescription({ medication_name: '', dosage: '', frequency: '', duration: '' });
  };

  const removePrescription = (index) => {
    setPrescriptions(prescriptions.filter((_, i) => i !== index));
  };

  const addLabOrder = () => {
    if (!newLabOrder.test_type) return;
    setLabOrders([...labOrders, newLabOrder]);
    setNewLabOrder({ test_type: '', urgency: 'Routine' });
  };

  const removeLabOrder = (index) => {
    setLabOrders(labOrders.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    // Validate admission data if disposition is Admitted
    if (formData.disposition === 'Admitted') {
      if (!admissionData.ward_id || !admissionData.admission_reason) {
        toast({ title: 'Please select a ward and enter admission reason', status: 'warning' });
        return;
      }
    }

    setLoading(true);
    try {
      // First, submit the consultation
      await api.post('/doctor/consultation', {
        visit_id: visit.visit_id,
        ...formData,
        prescriptions,
        lab_orders: labOrders
      });

      // If admission is required, create admission request
      if (formData.disposition === 'Admitted') {
        await api.post('/admission/request', {
          patient_id: visit.patient.patient_id,
          visit_id: visit.visit_id,
          ward_id: parseInt(admissionData.ward_id),
          priority: admissionData.priority,
          admission_reason: admissionData.admission_reason,
          initial_orders: admissionData.initial_orders
        });
        toast({ title: 'Admission request sent to nursing station', status: 'info' });
      }

      toast({ title: 'Consultation Completed', status: 'success' });
      onComplete();
    } catch (error) {
      console.error("Consultation submit failed", error);
      toast({ title: 'Submission Failed', status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (showHistory) {
    return <PatientHistoryView patient={visit.patient} onBack={() => setShowHistory(false)} />;
  }

  return (
    <Box bg="white" p={6} borderRadius="lg" boxShadow="sm">
      <HStack justify="space-between" mb={6}>
        <HStack>
          <Button leftIcon={<ArrowBackIcon />} variant="ghost" onClick={onBack}>Back</Button>
          <Heading size="md">Consultation: {visit.patient.first_name} {visit.patient.last_name}</Heading>
        </HStack>
        <Button colorScheme="blue" variant="outline" onClick={() => setShowHistory(true)}>
          View Patient History
        </Button>
      </HStack>

      <HStack align="start" spacing={8} mb={6}>
        <Box flex={1} p={4} bg="blue.50" borderRadius="md">
          <Heading size="sm" mb={2}>Vitals (Nurse Triage)</Heading>
          <Text><strong>BP:</strong> {visit.systolic_bp}/{visit.diastolic_bp} mmHg</Text>
          <Text><strong>HR:</strong> {visit.heart_rate} bpm</Text>
          <Text><strong>Temp:</strong> {visit.temperature} °C</Text>
          <Text><strong>Weight:</strong> {visit.weight} kg</Text>
          <Text><strong>Nurse Notes:</strong> {visit.nurse_notes || 'None'}</Text>
        </Box>
        <Box flex={1} p={4} bg="gray.50" borderRadius="md">
          <Heading size="sm" mb={2}>Visit Info</Heading>
          <Text><strong>Reason:</strong> {visit.visit_reason}</Text>
          <Text><strong>Type:</strong> {visit.visit_type}</Text>
          <Badge colorScheme={visit.is_emergency ? 'red' : 'green'}>
            {visit.is_emergency ? 'EMERGENCY' : 'Standard'}
          </Badge>
        </Box>
      </HStack>

      <Tabs variant="enclosed" colorScheme="blue">
        <TabList>
          <Tab>Clinical Notes</Tab>
          <Tab>Diagnosis & Plan</Tab>
          <Tab>Prescriptions ({prescriptions.length})</Tab>
          <Tab>Lab Orders ({labOrders.length})</Tab>
        </TabList>

        <TabPanels>
          {/* 1. Clinical Notes */}
          <TabPanel>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Symptoms & History</FormLabel>
                <Textarea 
                  name="symptoms" 
                  value={formData.symptoms} 
                  onChange={handleChange} 
                  placeholder="Patient complaints, duration, severity..." 
                  rows={4} 
                />
              </FormControl>
              <FormControl>
                <FormLabel>Physical Examination</FormLabel>
                <Textarea 
                  name="physical_exam" 
                  value={formData.physical_exam} 
                  onChange={handleChange} 
                  placeholder="General exam, focused exam findings..." 
                  rows={4} 
                />
              </FormControl>
              <FormControl>
                <FormLabel>Private Doctor Notes</FormLabel>
                <Textarea 
                  name="doctor_notes" 
                  value={formData.doctor_notes} 
                  onChange={handleChange} 
                  placeholder="Internal notes not visible to patient..." 
                />
              </FormControl>
            </VStack>
          </TabPanel>

          {/* 2. Diagnosis & Plan */}
          <TabPanel>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Diagnosis</FormLabel>
                <HStack>
                  <Input 
                    name="diagnosis" 
                    value={formData.diagnosis} 
                    onChange={handleChange} 
                    placeholder="Primary and secondary diagnosis..." 
                    flex={1}
                  />
                  <Button
                    leftIcon={<SearchIcon />}
                    colorScheme="purple"
                    variant="outline"
                    onClick={onDiseaseSearchOpen}
                  >
                    Find Disease
                  </Button>
                </HStack>
                <Text fontSize="xs" color="gray.500" mt={1}>
                  Use AI-powered search to find diseases by symptoms
                </Text>
              </FormControl>

              <Divider />

              <FormControl>
                <FormLabel>Disposition</FormLabel>
                <Select name="disposition" value={formData.disposition} onChange={handleChange}>
                  <option value="Discharged">Discharged Home</option>
                  <option value="Admitted">Admit to Ward</option>
                  <option value="Referred">Refer to Specialist/Hospital</option>
                </Select>
              </FormControl>

              {formData.disposition === 'Referred' && (
                <FormControl isRequired>
                  <FormLabel>Referral Destination</FormLabel>
                  <Input 
                    name="referral_dest" 
                    value={formData.referral_dest} 
                    onChange={handleChange} 
                    placeholder="e.g. City General Hospital" 
                  />
                </FormControl>
              )}

              {formData.disposition === 'Admitted' && (
                <Box p={4} bg="orange.50" borderRadius="md" borderLeft="4px solid" borderColor="orange.400">
                  <Heading size="sm" mb={4} color="orange.700">Admission Request</Heading>
                  
                  <Alert status="info" mb={4} borderRadius="md">
                    <AlertIcon />
                    This will send an admission request to the nursing station for bed assignment.
                  </Alert>

                  <SimpleGrid columns={2} spacing={4}>
                    <FormControl isRequired>
                      <FormLabel>Select Ward</FormLabel>
                      <Select 
                        name="ward_id" 
                        value={admissionData.ward_id} 
                        onChange={handleAdmissionChange}
                        placeholder="Choose a ward"
                      >
                        {wards.map(ward => (
                          <option key={ward.ward_id} value={ward.ward_id}>
                            {ward.ward_name} ({ward.available_beds} beds available)
                          </option>
                        ))}
                      </Select>
                    </FormControl>

                    <FormControl>
                      <FormLabel>Priority</FormLabel>
                      <RadioGroup 
                        name="priority" 
                        value={admissionData.priority} 
                        onChange={(val) => setAdmissionData(prev => ({ ...prev, priority: val }))}
                      >
                        <Stack direction="row" spacing={4}>
                          <Radio value="Normal" colorScheme="green">Normal</Radio>
                          <Radio value="Urgent" colorScheme="orange">Urgent</Radio>
                          <Radio value="Critical" colorScheme="red">Critical</Radio>
                        </Stack>
                      </RadioGroup>
                    </FormControl>
                  </SimpleGrid>

                  <FormControl mt={4} isRequired>
                    <FormLabel>Admission Reason</FormLabel>
                    <Textarea 
                      name="admission_reason"
                      value={admissionData.admission_reason}
                      onChange={handleAdmissionChange}
                      placeholder="e.g. Pre-eclampsia risk, severe malaria, dehydration, early labor signs..."
                      rows={2}
                    />
                  </FormControl>

                  <FormControl mt={4}>
                    <FormLabel>Initial Orders</FormLabel>
                    <Textarea 
                      name="initial_orders"
                      value={admissionData.initial_orders}
                      onChange={handleAdmissionChange}
                      placeholder="Monitoring frequency, IV fluids, medications, restrictions (fasting, mobility, etc.)..."
                      rows={3}
                    />
                  </FormControl>
                </Box>
              )}

              <FormControl>
                <FormLabel>Follow-up Appointment</FormLabel>
                <Input 
                  type="datetime-local" 
                  name="follow_up_date" 
                  value={formData.follow_up_date} 
                  onChange={handleChange} 
                />
              </FormControl>
            </VStack>
          </TabPanel>

          {/* 3. Prescriptions */}
          <TabPanel>
            <VStack spacing={4} align="stretch">
              <HStack align="end">
                <FormControl flex={2}>
                  <FormLabel>Medication</FormLabel>
                  <Input 
                    placeholder="e.g. Amoxicillin" 
                    value={newPrescription.medication_name}
                    onChange={(e) => setNewPrescription({...newPrescription, medication_name: e.target.value})}
                  />
                </FormControl>
                <FormControl flex={1}>
                  <FormLabel>Dosage</FormLabel>
                  <Input 
                    placeholder="e.g. 500mg" 
                    value={newPrescription.dosage}
                    onChange={(e) => setNewPrescription({...newPrescription, dosage: e.target.value})}
                  />
                </FormControl>
                <FormControl flex={1}>
                  <FormLabel>Freq</FormLabel>
                  <Input 
                    placeholder="e.g. TDS" 
                    value={newPrescription.frequency}
                    onChange={(e) => setNewPrescription({...newPrescription, frequency: e.target.value})}
                  />
                </FormControl>
                <FormControl flex={1}>
                  <FormLabel>Duration</FormLabel>
                  <Input 
                    placeholder="e.g. 5 days" 
                    value={newPrescription.duration}
                    onChange={(e) => setNewPrescription({...newPrescription, duration: e.target.value})}
                  />
                </FormControl>
                <Button colorScheme="green" onClick={addPrescription} leftIcon={<AddIcon />}>Add</Button>
              </HStack>

              <Table size="sm" variant="simple">
                <Thead><Tr><Th>Medication</Th><Th>Dosage</Th><Th>Freq</Th><Th>Duration</Th><Th></Th></Tr></Thead>
                <Tbody>
                  {prescriptions.map((p, i) => (
                    <Tr key={i}>
                      <Td>{p.medication_name}</Td>
                      <Td>{p.dosage}</Td>
                      <Td>{p.frequency}</Td>
                      <Td>{p.duration}</Td>
                      <Td><IconButton icon={<DeleteIcon />} size="xs" colorScheme="red" onClick={() => removePrescription(i)} /></Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </VStack>
          </TabPanel>

          {/* 4. Lab Orders */}
          <TabPanel>
            <VStack spacing={4} align="stretch">
              <HStack align="end">
                <FormControl flex={3}>
                  <FormLabel>Test Type</FormLabel>
                  <Input 
                    placeholder="e.g. Malaria Parasite, FBC" 
                    value={newLabOrder.test_type}
                    onChange={(e) => setNewLabOrder({...newLabOrder, test_type: e.target.value})}
                  />
                </FormControl>
                <FormControl flex={1}>
                  <FormLabel>Urgency</FormLabel>
                  <Select 
                    value={newLabOrder.urgency}
                    onChange={(e) => setNewLabOrder({...newLabOrder, urgency: e.target.value})}
                  >
                    <option value="Routine">Routine</option>
                    <option value="Urgent">Urgent</option>
                    <option value="Stat">Stat (Immediate)</option>
                  </Select>
                </FormControl>
                <Button colorScheme="green" onClick={addLabOrder} leftIcon={<AddIcon />}>Order</Button>
              </HStack>

              <Table size="sm" variant="simple">
                <Thead><Tr><Th>Test</Th><Th>Urgency</Th><Th></Th></Tr></Thead>
                <Tbody>
                  {labOrders.map((l, i) => (
                    <Tr key={i}>
                      <Td>{l.test_type}</Td>
                      <Td><Badge colorScheme={l.urgency === 'Stat' ? 'red' : l.urgency === 'Urgent' ? 'orange' : 'gray'}>{l.urgency}</Badge></Td>
                      <Td><IconButton icon={<DeleteIcon />} size="xs" colorScheme="red" onClick={() => removeLabOrder(i)} /></Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </VStack>
          </TabPanel>
        </TabPanels>
      </Tabs>

      <Divider my={6} />

      <HStack justify="flex-end">
        <Button size="lg" onClick={onBack}>Cancel</Button>
        <Button colorScheme="blue" size="lg" onClick={handleSubmit} isLoading={loading}>
          Finalize Consultation
        </Button>
      </HStack>

      {/* Disease Search Modal */}
      <DiseaseSearchModal
        isOpen={isDiseaseSearchOpen}
        onClose={onDiseaseSearchClose}
        onSelectDisease={handleDiseaseSelect}
        authToken={doctorToken}
      />
    </Box>
  );
}
