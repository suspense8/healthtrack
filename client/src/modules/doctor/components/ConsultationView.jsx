import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Heading, VStack, FormControl, FormLabel, Input, Textarea, Button, HStack,
  Tabs, TabList, TabPanels, Tab, TabPanel, Select, Divider, Text, IconButton,
  Table, Thead, Tbody, Tr, Th, Td, useToast, Badge, SimpleGrid, Radio, RadioGroup, Stack,
  Alert, AlertIcon, Spinner, Center, FormErrorMessage, FormHelperText, Tooltip, Icon
} from '@chakra-ui/react';
import { ArrowBackIcon, AddIcon, DeleteIcon, WarningIcon, InfoIcon } from '@chakra-ui/icons';
import api from '../../../services/api';
import PatientHistoryView from './PatientHistoryView';
import DiagnosisAutocomplete from './DiagnosisAutocomplete';
import MedicineAutocomplete from './MedicineAutocomplete';
import DoctorLayout from './DoctorLayout';
import {
  validatePrescription,
  getStandardFrequencies,
  getDosageForms,
  getRoutes,
  getCompatibleForms,
  getSpecialInstructionSuggestions
} from '../../../utils/prescriptionValidation';

export default function ConsultationView({ visit: visitProp, onBack: onBackProp, onComplete: onCompleteProp }) {
  const { visitId } = useParams();
  const navigate = useNavigate();
  const [visit, setVisit] = useState(visitProp);
  const [fetching, setFetching] = useState(!!visitId && !visitProp);
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
  const [newPrescription, setNewPrescription] = useState({ 
    medication_name: '', 
    medicine_id: null, 
    strength: '',
    dosage_form: '',
    dosage: '', 
    route: '',
    frequency: '', 
    duration: '',
    special_instructions: ''
  });
  const [prescriptionErrors, setPrescriptionErrors] = useState({});
  const [prescriptionWarnings, setPrescriptionWarnings] = useState([]);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  
  const [labOrders, setLabOrders] = useState([]);
  const [newLabOrder, setNewLabOrder] = useState({ test_type: '', urgency: 'Routine' });

  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const toast = useToast();

  // Fetch visit if visitId is in URL
  useEffect(() => {
    const fetchVisit = async () => {
      try {
        const res = await api.get(`/doctor/visits/${visitId}`);
        setVisit(res.data);
      } catch (error) {
        toast({ title: 'Failed to load visit', status: 'error' });
        navigate('/doctor/consultation');
      } finally {
        setFetching(false);
      }
    };
    if (visitId && !visitProp) {
      fetchVisit();
    }
  }, [visitId, visitProp, navigate, toast]);

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
    // Validate prescription
    const validation = validatePrescription(
      newPrescription, 
      visit?.patient?.weight || null, 
      prescriptions
    );
    
    if (!validation.valid) {
      setPrescriptionErrors(validation.fieldErrors);
      toast({
        title: 'Prescription validation failed',
        description: validation.errors[0] || 'Please fix the errors before adding',
        status: 'error',
        duration: 4000
      });
      return;
    }
    
    // Show warnings but allow override
    if (validation.warnings.length > 0) {
      const hasErrors = Object.keys(validation.fieldErrors).length > 0;
      if (!hasErrors) {
        // Show warnings but allow adding
        toast({
          title: 'Prescription added with warnings',
          description: validation.warnings[0],
          status: 'warning',
          duration: 3000
        });
      }
    }
    
    // Check if override is required
    if (validation.requiresOverride) {
      setShowOverrideModal(true);
      return;
    }
    
    // Add prescription
    setPrescriptions([...prescriptions, { ...newPrescription }]);
    setNewPrescription({ 
      medication_name: '', 
      medicine_id: null, 
      strength: '',
      dosage_form: '',
      dosage: '', 
      route: '',
      frequency: '', 
      duration: '',
      special_instructions: ''
    });
    setPrescriptionErrors({});
    setPrescriptionWarnings({});
    
    toast({
      title: 'Prescription added',
      status: 'success',
      duration: 2000
    });
  };

  const handleMedicineSelect = (medicine) => {
    const updated = {
      ...newPrescription,
      medication_name: medicine.name,
      medicine_id: medicine.id
    };
    
    // Get special instruction suggestions
    const suggestions = getSpecialInstructionSuggestions(medicine.name);
    if (suggestions.length > 0 && !newPrescription.special_instructions) {
      // Auto-fill first suggestion as a hint
      updated.special_instructions = suggestions[0];
    }
    
    setNewPrescription(updated);
    
    // Clear errors for medication name immediately when medicine is selected
    setPrescriptionErrors(prev => {
      const newErrors = { ...prev };
      if (newErrors.medication_name) {
        delete newErrors.medication_name;
      }
      return newErrors;
    });
    
    // Validate in real-time (validatePrescriptionField will respect medicine_id and not re-add error)
    setTimeout(() => {
      validatePrescriptionField(updated);
    }, 0);
  };

  const removePrescription = (index) => {
    setPrescriptions(prescriptions.filter((_, i) => i !== index));
  };
  
  // Real-time validation for prescription fields
  const validatePrescriptionField = (prescription) => {
    const validation = validatePrescription(prescription, visit?.patient?.weight || null, prescriptions);
    
    // If medicine_id is set, clear medication_name error (medicine was selected from database)
    const fieldErrors = { ...validation.fieldErrors };
    if (prescription.medicine_id && fieldErrors.medication_name) {
      delete fieldErrors.medication_name;
    }
    
    setPrescriptionErrors(fieldErrors);
    setPrescriptionWarnings(validation.warnings || []);
    return validation;
  };
  
  // Handle field changes with validation
  const handlePrescriptionFieldChange = (field, value) => {
    const updated = { ...newPrescription, [field]: value };
    setNewPrescription(updated);
    
    // If route or dosage_form changes, check compatibility
    if (field === 'route' && updated.dosage_form) {
      const compatibleForms = getCompatibleForms(value);
      if (!compatibleForms.includes(updated.dosage_form)) {
        setPrescriptionErrors(prev => ({
          ...prev,
          dosage_form: [`Route "${value}" is not compatible with dosage form "${updated.dosage_form}"`]
        }));
      }
    }
    
    if (field === 'dosage_form' && updated.route) {
      const compatibleForms = getCompatibleForms(updated.route);
      if (!compatibleForms.includes(value)) {
        setPrescriptionErrors(prev => ({
          ...prev,
          dosage_form: [`Dosage form "${value}" is not compatible with route "${updated.route}"`]
        }));
      }
    }
    
    // Validate on change
    validatePrescriptionField(updated);
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
      if (onCompleteProp) {
        onCompleteProp();
      } else {
        navigate('/doctor/consultation');
      }
    } catch (error) {
      console.error("Consultation submit failed", error);
      toast({ title: 'Submission Failed', status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (onBackProp) {
      onBackProp();
    } else {
      navigate('/doctor/consultation');
    }
  };

  if (fetching) {
    return (
      <DoctorLayout activeTab="consultation" setActiveTab={(tab) => navigate(`/doctor/${tab}`)}>
        <Center h="200px"><Spinner /></Center>
      </DoctorLayout>
    );
  }

  if (!visit) {
    return null;
  }

  if (showHistory) {
    return <PatientHistoryView patient={visit.patient} onBack={() => setShowHistory(false)} />;
  }

  return (
    <DoctorLayout activeTab="consultation" setActiveTab={(tab) => navigate(`/doctor/${tab}`)}>
      <Box bg="white" p={6} borderRadius="lg" boxShadow="sm">
        <HStack justify="space-between" mb={6}>
          <HStack>
            <Button leftIcon={<ArrowBackIcon />} variant="ghost" onClick={handleBack}>Back</Button>
            <Heading size="md">Consultation: {visit.patient.first_name} {visit.patient.last_name}</Heading>
          </HStack>
          <Button colorScheme="blue" variant="outline" onClick={() => navigate(`/doctor/consultation/${visitId}/history`)}>
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
                <DiagnosisAutocomplete
                  value={formData.diagnosis}
                  onChange={handleChange}
                  symptoms={formData.symptoms}
                  placeholder="Start typing or search by symptoms..."
                />
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
              <Box 
                p={4} 
                border="1px" 
                borderColor="gray.200" 
                borderRadius="md" 
                bg="gray.50"
              >
                <VStack spacing={4} align="stretch">
                  {/* Medication Name */}
                  <FormControl isRequired isInvalid={!!prescriptionErrors.medication_name}>
                    <FormLabel fontWeight="semibold">
                      Medication Name
                      <Tooltip label="Search and select from database for best results, or enter manually">
                        <Icon as={InfoIcon} ml={2} color="blue.500" boxSize={3} />
                      </Tooltip>
                    </FormLabel>
                    <MedicineAutocomplete
                      value={newPrescription.medication_name}
                      onChange={(value) => handlePrescriptionFieldChange('medication_name', value)}
                      onSelect={handleMedicineSelect}
                      placeholder="Search medicine by name, generic name, or NDC code..."
                      requireSelection={false}
                      error={prescriptionErrors.medication_name?.[0]}
                      selectedMedicineId={newPrescription.medicine_id}
                    />
                    {prescriptionErrors.medication_name && (
                      <FormErrorMessage>{prescriptionErrors.medication_name[0]}</FormErrorMessage>
                    )}
                  </FormControl>
                  
                  {/* Strength and Dosage Form */}
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                    <FormControl isRequired isInvalid={!!prescriptionErrors.strength}>
                      <FormLabel>Strength</FormLabel>
                      <Input 
                        placeholder="e.g. 500mg, 1g, 125mg/5ml" 
                        value={newPrescription.strength}
                        onChange={(e) => handlePrescriptionFieldChange('strength', e.target.value)}
                      />
                      {prescriptionErrors.strength && (
                        <FormErrorMessage>{prescriptionErrors.strength[0]}</FormErrorMessage>
                      )}
                      <FormHelperText>Format: number + unit (mg, g, ml, etc.)</FormHelperText>
                    </FormControl>
                    
                    <FormControl isRequired isInvalid={!!prescriptionErrors.dosage_form}>
                      <FormLabel>Dosage Form</FormLabel>
                      <Select
                        placeholder="Select form"
                        value={newPrescription.dosage_form}
                        onChange={(e) => handlePrescriptionFieldChange('dosage_form', e.target.value)}
                      >
                        {getDosageForms().map(form => (
                          <option key={form} value={form}>{form}</option>
                        ))}
                      </Select>
                      {prescriptionErrors.dosage_form && (
                        <FormErrorMessage>{prescriptionErrors.dosage_form[0]}</FormErrorMessage>
                      )}
                    </FormControl>
                  </SimpleGrid>
                  
                  {/* Route and Dose */}
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                    <FormControl isRequired isInvalid={!!prescriptionErrors.route}>
                      <FormLabel>Route of Administration</FormLabel>
                      <Select
                        placeholder="Select route"
                        value={newPrescription.route}
                        onChange={(e) => handlePrescriptionFieldChange('route', e.target.value)}
                      >
                        {getRoutes().map(route => (
                          <option key={route} value={route}>{route}</option>
                        ))}
                      </Select>
                      {prescriptionErrors.route && (
                        <FormErrorMessage>{prescriptionErrors.route[0]}</FormErrorMessage>
                      )}
                    </FormControl>
                    
                    <FormControl isRequired isInvalid={!!prescriptionErrors.dosage}>
                      <FormLabel>Dose (per administration)</FormLabel>
                      <Input 
                        placeholder="e.g. 500mg, 1 tablet" 
                        value={newPrescription.dosage}
                        onChange={(e) => handlePrescriptionFieldChange('dosage', e.target.value)}
                      />
                      {prescriptionErrors.dosage && (
                        <FormErrorMessage>{prescriptionErrors.dosage[0]}</FormErrorMessage>
                      )}
                      <FormHelperText>Single dose amount per administration</FormHelperText>
                    </FormControl>
                  </SimpleGrid>
                  
                  {/* Frequency and Duration */}
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                    <FormControl isRequired isInvalid={!!prescriptionErrors.frequency}>
                      <FormLabel>Frequency</FormLabel>
                      <Select
                        placeholder="Select or type frequency"
                        value={newPrescription.frequency}
                        onChange={(e) => handlePrescriptionFieldChange('frequency', e.target.value)}
                      >
                        <option value="">-- Select Standard Frequency --</option>
                        {getStandardFrequencies().map(freq => (
                          <option key={freq.value} value={freq.value}>{freq.label}</option>
                        ))}
                      </Select>
                      {!getStandardFrequencies().find(f => f.value === newPrescription.frequency) && newPrescription.frequency && (
                        <Input
                          mt={2}
                          placeholder="Or enter custom frequency (e.g. 3x daily)"
                          value={newPrescription.frequency}
                          onChange={(e) => handlePrescriptionFieldChange('frequency', e.target.value)}
                        />
                      )}
                      {prescriptionErrors.frequency && (
                        <FormErrorMessage>{prescriptionErrors.frequency[0]}</FormErrorMessage>
                      )}
                    </FormControl>
                    
                    <FormControl isRequired isInvalid={!!prescriptionErrors.duration}>
                      <FormLabel>Duration</FormLabel>
                      <Input 
                        placeholder="e.g. 5 days, 2 weeks" 
                        value={newPrescription.duration}
                        onChange={(e) => handlePrescriptionFieldChange('duration', e.target.value)}
                      />
                      {prescriptionErrors.duration && (
                        <FormErrorMessage>{prescriptionErrors.duration[0]}</FormErrorMessage>
                      )}
                    </FormControl>
                  </SimpleGrid>
                  
                  {/* Special Instructions */}
                  <FormControl>
                    <FormLabel>Special Instructions</FormLabel>
                    <Textarea
                      placeholder="e.g. Take with food, Shake well, Do not drive..."
                      value={newPrescription.special_instructions}
                      onChange={(e) => handlePrescriptionFieldChange('special_instructions', e.target.value)}
                      rows={2}
                    />
                    {newPrescription.medication_name && getSpecialInstructionSuggestions(newPrescription.medication_name).length > 0 && (
                      <FormHelperText>
                        Suggestions: {getSpecialInstructionSuggestions(newPrescription.medication_name).join(', ')}
                      </FormHelperText>
                    )}
                  </FormControl>
                  
                  {/* Validation Summary */}
                  {Object.keys(prescriptionErrors).length > 0 && (
                    <Alert status="error" borderRadius="md">
                      <AlertIcon />
                      <VStack align="start" spacing={1}>
                        <Text fontWeight="bold">Please fix the following errors:</Text>
                        {Object.entries(prescriptionErrors).map(([field, errors]) => (
                          <Text key={field} fontSize="sm">• {Array.isArray(errors) ? errors[0] : errors}</Text>
                        ))}
                      </VStack>
                    </Alert>
                  )}
                  
                  {Array.isArray(prescriptionWarnings) && prescriptionWarnings.length > 0 && Object.keys(prescriptionErrors).length === 0 && (
                    <Alert status="warning" borderRadius="md">
                      <AlertIcon />
                      <VStack align="start" spacing={1}>
                        <Text fontWeight="bold">Warnings:</Text>
                        {prescriptionWarnings.map((warning, idx) => (
                          <Text key={idx} fontSize="sm">• {warning}</Text>
                        ))}
                      </VStack>
                    </Alert>
                  )}
                  
                  <Button 
                    colorScheme="green" 
                    onClick={addPrescription} 
                    leftIcon={<AddIcon />}
                    size="md"
                    w="full"
                    isDisabled={Object.keys(prescriptionErrors).length > 0}
                  >
                    Add Prescription
                  </Button>
                </VStack>
              </Box>

              {prescriptions.length > 0 && (
                <Box border="1px" borderColor="gray.200" borderRadius="md" overflowX="auto">
                  <Table size="sm" variant="simple">
                    <Thead bg="gray.100">
                      <Tr>
                        <Th>Medication</Th>
                        <Th>Strength</Th>
                        <Th>Form</Th>
                        <Th>Route</Th>
                        <Th>Dose</Th>
                        <Th>Frequency</Th>
                        <Th>Duration</Th>
                        <Th>Instructions</Th>
                        <Th></Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {prescriptions.map((p, i) => (
                        <Tr key={i} _hover={{ bg: 'gray.50' }}>
                          <Td fontWeight="semibold">{p.medication_name}</Td>
                          <Td>{p.strength || '-'}</Td>
                          <Td>{p.dosage_form || '-'}</Td>
                          <Td>{p.route || '-'}</Td>
                          <Td>{p.dosage}</Td>
                          <Td>{p.frequency}</Td>
                          <Td>{p.duration}</Td>
                          <Td>
                            {p.special_instructions ? (
                              <Tooltip label={p.special_instructions}>
                                <Text fontSize="xs" color="gray.600" noOfLines={1}>
                                  {p.special_instructions}
                                </Text>
                              </Tooltip>
                            ) : '-'}
                          </Td>
                          <Td>
                            <IconButton 
                              icon={<DeleteIcon />} 
                              size="xs" 
                              colorScheme="red" 
                              variant="ghost"
                              onClick={() => removePrescription(i)}
                              aria-label="Remove prescription"
                            />
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </Box>
              )}
              
              {prescriptions.length === 0 && (
                <Box textAlign="center" py={8} border="1px" borderColor="gray.200" borderRadius="md" bg="gray.50">
                  <Text color="gray.500">No prescriptions added yet</Text>
                </Box>
              )}
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
        <Button size="lg" onClick={handleBack}>Cancel</Button>
        <Button colorScheme="blue" size="lg" onClick={handleSubmit} isLoading={loading}>
          Finalize Consultation
        </Button>
      </HStack>
      </Box>
    </DoctorLayout>
  );
}
