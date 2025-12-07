import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Heading, Text, Button, FormControl, FormLabel, Textarea, Input, VStack, HStack,
  Divider, useToast, Spinner, Center, Badge, IconButton
} from '@chakra-ui/react';
import { ArrowBackIcon, CloseIcon, AddIcon } from '@chakra-ui/icons';
import api from '../../../services/api';
import DoctorLayout from './DoctorLayout';
import MedicineAutocomplete from './MedicineAutocomplete';

export default function DischargeView() {
  const { admissionId } = useParams();
  const navigate = useNavigate();
  const [admission, setAdmission] = useState(null);
  const [dischargeData, setDischargeData] = useState({
    discharge_summary: '',
    discharge_meds: '',
    follow_up_date: ''
  });
  const [takeHomeMeds, setTakeHomeMeds] = useState([]); // Array of {name, medicine_id}
  const [currentMedInput, setCurrentMedInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const toast = useToast();

  useEffect(() => {
    const fetchAdmission = async () => {
      try {
        const res = await api.get(`/admission/${admissionId}`);
        setAdmission(res.data);
      } catch (error) {
        toast({ title: 'Failed to load admission', status: 'error' });
        navigate('/doctor/admitted');
      } finally {
        setFetching(false);
      }
    };
    if (admissionId) {
      fetchAdmission();
    }
  }, [admissionId, navigate, toast]);

  // Update discharge_meds when takeHomeMeds changes
  useEffect(() => {
    const medsString = takeHomeMeds.map(med => med.name).join(', ');
    setDischargeData(prev => ({ ...prev, discharge_meds: medsString }));
  }, [takeHomeMeds]);

  const handleMedicineSelect = (medicine) => {
    // Check if medicine is already added
    const exists = takeHomeMeds.some(med => med.medicine_id === medicine.id);
    if (!exists) {
      setTakeHomeMeds([...takeHomeMeds, { name: medicine.name, medicine_id: medicine.id }]);
      setCurrentMedInput(''); // Clear input after selection
    } else {
      toast({ title: 'Medicine already added', status: 'info', duration: 2000 });
    }
  };

  const handleAddFreeText = () => {
    if (currentMedInput.trim()) {
      // Check if medicine is already added
      const exists = takeHomeMeds.some(med => med.name.toLowerCase() === currentMedInput.trim().toLowerCase());
      if (!exists) {
        setTakeHomeMeds([...takeHomeMeds, { name: currentMedInput.trim(), medicine_id: null }]);
        setCurrentMedInput('');
      } else {
        toast({ title: 'Medicine already added', status: 'info', duration: 2000 });
      }
    }
  };

  const handleRemoveMedicine = (index) => {
    setTakeHomeMeds(takeHomeMeds.filter((_, i) => i !== index));
  };

  const handleInitiateDischarge = async () => {
    if (!dischargeData.discharge_summary.trim()) {
      toast({ title: 'Please enter a discharge summary', status: 'warning' });
      return;
    }

    setLoading(true);
    try {
      await api.patch(`/admission/${admissionId}/initiate-discharge`, dischargeData);
      toast({ title: 'Discharge initiated - awaiting nurse confirmation', status: 'info' });
      navigate('/doctor/admitted');
    } catch (error) {
      toast({ title: 'Failed to initiate discharge', status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <DoctorLayout activeTab="admitted" setActiveTab={(tab) => navigate(`/doctor/${tab}`)}>
        <Center h="200px"><Spinner /></Center>
      </DoctorLayout>
    );
  }

  if (!admission) {
    return null;
  }

  return (
    <DoctorLayout activeTab="admitted" setActiveTab={(tab) => navigate(`/doctor/${tab}`)}>
      <Box bg="white" p={6} borderRadius="lg" boxShadow="sm">
        <HStack mb={6}>
          <Button leftIcon={<ArrowBackIcon />} variant="ghost" onClick={() => navigate('/doctor/admitted')}>
            Back
          </Button>
          <Heading size="md">Discharge Patient</Heading>
        </HStack>

        <VStack spacing={4} align="stretch" maxW="600px">
          <Box p={3} bg="blue.50" borderRadius="md">
            <Text fontWeight="bold">
              {admission.patient?.first_name} {admission.patient?.last_name}
            </Text>
            <Text fontSize="sm">
              {admission.ward?.ward_name} - Bed {admission.bed?.bed_number}
            </Text>
            <Text fontSize="sm" color="gray.600">
              Admitted: {new Date(admission.admitted_at).toLocaleDateString()}
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
            <VStack spacing={2} align="stretch">
              <Box>
                <MedicineAutocomplete
                  value={currentMedInput}
                  onChange={setCurrentMedInput}
                  onSelect={handleMedicineSelect}
                  placeholder="Search medicine by name, generic name, or NDC code..."
                  requireSelection={false}
                  selectedMedicineId={null}
                />
              </Box>
              {currentMedInput.trim() && (
                <Button
                  leftIcon={<AddIcon />}
                  colorScheme="blue"
                  onClick={handleAddFreeText}
                  isDisabled={!currentMedInput.trim()}
                  size="sm"
                  alignSelf="flex-start"
                >
                  Add as Free Text
                </Button>
              )}
              
              {takeHomeMeds.length > 0 && (
                <Box
                  p={3}
                  border="1px"
                  borderColor="gray.200"
                  borderRadius="md"
                  bg="gray.50"
                >
                  <VStack spacing={2} align="stretch">
                    {takeHomeMeds.map((med, index) => (
                      <HStack key={index} justify="space-between" p={2} bg="white" borderRadius="md">
                        <Badge colorScheme={med.medicine_id ? "green" : "gray"} fontSize="sm" p={1} px={2}>
                          {med.name}
                        </Badge>
                        <IconButton
                          icon={<CloseIcon />}
                          size="xs"
                          variant="ghost"
                          colorScheme="red"
                          onClick={() => handleRemoveMedicine(index)}
                          aria-label="Remove medicine"
                        />
                      </HStack>
                    ))}
                  </VStack>
                </Box>
              )}
            </VStack>
          </FormControl>

          <FormControl>
            <FormLabel>Follow-Up Appointment</FormLabel>
            <Input 
              type="datetime-local"
              value={dischargeData.follow_up_date}
              onChange={(e) => setDischargeData({...dischargeData, follow_up_date: e.target.value})}
            />
          </FormControl>

          <HStack mt={4}>
            <Button variant="ghost" onClick={() => navigate('/doctor/admitted')}>
              Cancel
            </Button>
            <Button 
              colorScheme="green" 
              onClick={handleInitiateDischarge}
              isLoading={loading}
            >
              Initiate Discharge
            </Button>
          </HStack>
        </VStack>
      </Box>
    </DoctorLayout>
  );
}





