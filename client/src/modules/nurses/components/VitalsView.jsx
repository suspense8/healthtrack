import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Button, FormControl, FormLabel, Input, Select, Textarea, SimpleGrid, VStack,
  NumberInput, NumberInputField, HStack, RadioGroup, Radio, Stack, useToast,
  Heading, Spinner, Center, Text
} from '@chakra-ui/react';
import { ArrowBackIcon } from '@chakra-ui/icons';
import api from '../../../services/api';
import ValidatedInput from '../../../components/shared/ValidatedInput';
import { getVitalThresholdWarning, validateVitalRange } from '../../../utils/validationSchemas';
import ModuleLayout from '../../../components/shared/ModuleLayout';
import { FaUserNurse } from 'react-icons/fa';

export default function VitalsView() {
  const { visitId } = useParams();
  const navigate = useNavigate();
  const [visit, setVisit] = useState(null);
  const [formData, setFormData] = useState({
    systolic_bp: '', diastolic_bp: '',
    heart_rate: '', respiratory_rate: '',
    temperature: '', oxygen_saturation: '',
    weight: '', height: '',
    triage_level: 'Green',
    nurse_notes: '',
    next_step: 'refer_to_doctor'
  });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const toast = useToast();

  useEffect(() => {
    const fetchVisit = async () => {
      if (!visitId) {
        setFetching(false);
        return;
      }
      
      try {
        const res = await api.get(`/nurses/visits/${visitId}`);
        if (res.data) {
          setVisit(res.data);
          // Pre-fill form if vitals exist
          if (res.data.systolic_bp || res.data.triage_level) {
            setFormData(prev => ({
              ...prev,
              systolic_bp: res.data.systolic_bp || '',
              diastolic_bp: res.data.diastolic_bp || '',
              heart_rate: res.data.heart_rate || '',
              respiratory_rate: res.data.respiratory_rate || '',
              temperature: res.data.temperature || '',
              oxygen_saturation: res.data.oxygen_saturation || '',
              weight: res.data.weight || '',
              height: res.data.height || '',
              triage_level: res.data.triage_level || 'Green',
              nurse_notes: res.data.nurse_notes || ''
            }));
          }
        } else {
          toast({ title: 'Visit not found', status: 'error' });
          navigate('/nurse/queue');
        }
      } catch (error) {
        console.error('Failed to fetch visit:', error);
        toast({ 
          title: 'Failed to load visit', 
          description: error.response?.data?.error || 'Please try again',
          status: 'error' 
        });
        navigate('/nurse/queue');
      } finally {
        setFetching(false);
      }
    };
    
    fetchVisit();
  }, [visitId, navigate, toast]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const getVitalError = (fieldName, value) => {
    if (!value) return null;
    return validateVitalRange(fieldName, value);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await api.post('/nurses/vitals', {
        visit_id: parseInt(visitId),
        ...formData
      });
      toast({ title: 'Vitals recorded successfully', status: 'success' });
      navigate('/nurse/queue');
    } catch (error) {
      toast({ title: 'Failed to save vitals', description: error.response?.data?.error, status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <ModuleLayout
        activeTab="queue"
        setActiveTab={(tab) => navigate(`/nurse/${tab}`)}
        navItems={[]}
        title="Nurse Station"
        color="purple"
        moduleIcon={FaUserNurse}
      >
        <Center h="200px"><Spinner size="xl" /></Center>
      </ModuleLayout>
    );
  }

  if (!visit) {
    return (
      <ModuleLayout
        activeTab="queue"
        setActiveTab={(tab) => navigate(`/nurse/${tab}`)}
        navItems={[]}
        title="Nurse Station"
        color="purple"
        moduleIcon={FaUserNurse}
      >
        <Box bg="white" p={6} borderRadius="lg" boxShadow="sm">
          <Text color="gray.500">Visit not found. Redirecting...</Text>
        </Box>
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout
      activeTab="queue"
      setActiveTab={(tab) => navigate(`/nurse/${tab}`)}
      navItems={[]}
      title="Nurse Station"
      color="purple"
      moduleIcon={FaUserNurse}
    >
      <Box bg="white" p={6} borderRadius="lg" boxShadow="sm">
        <HStack mb={6}>
          <Button leftIcon={<ArrowBackIcon />} variant="ghost" onClick={() => navigate('/nurse/queue')}>
            Back
          </Button>
          <Heading size="md">Record Vitals: {visit?.patient?.first_name || ''} {visit?.patient?.last_name || ''}</Heading>
        </HStack>

        <VStack spacing={4}>
          <SimpleGrid columns={2} spacing={4} w="full">
            <FormControl>
              <FormLabel>Blood Pressure (mmHg)</FormLabel>
              <HStack align="flex-start" spacing={2}>
                <ValidatedInput
                  placeholder="Systolic"
                  name="systolic_bp"
                  value={formData.systolic_bp}
                  onChange={handleChange}
                  type="number"
                  error={getVitalError('systolicBP', formData.systolic_bp)?.message}
                  warning={getVitalThresholdWarning('systolicBP', formData.systolic_bp)}
                  width="100px"
                />
                <Text fontSize="sm" color="gray.500" mt={2}>/</Text>
                <ValidatedInput
                  placeholder="Diastolic"
                  name="diastolic_bp"
                  value={formData.diastolic_bp}
                  onChange={handleChange}
                  type="number"
                  error={getVitalError('diastolicBP', formData.diastolic_bp)?.message}
                  warning={getVitalThresholdWarning('diastolicBP', formData.diastolic_bp)}
                  width="100px"
                />
              </HStack>
            </FormControl>
            <ValidatedInput
              label="Heart Rate (bpm)"
              name="heart_rate"
              value={formData.heart_rate}
              onChange={handleChange}
              type="number"
              error={getVitalError('heartRate', formData.heart_rate)?.message}
              warning={getVitalThresholdWarning('heartRate', formData.heart_rate)}
            />
            <ValidatedInput
              label="Respiratory Rate (bpm)"
              name="respiratory_rate"
              value={formData.respiratory_rate}
              onChange={handleChange}
              type="number"
              error={getVitalError('respiratoryRate', formData.respiratory_rate)?.message}
            />
            <ValidatedInput
              label="Temperature (°C)"
              name="temperature"
              value={formData.temperature}
              onChange={handleChange}
              type="number"
              step="0.1"
              error={getVitalError('temperature', formData.temperature)?.message}
              warning={getVitalThresholdWarning('temperature', formData.temperature)}
            />
            <ValidatedInput
              label="O2 Saturation (%)"
              name="oxygen_saturation"
              value={formData.oxygen_saturation}
              onChange={handleChange}
              type="number"
              error={getVitalError('oxygenSaturation', formData.oxygen_saturation)?.message}
              warning={getVitalThresholdWarning('oxygenSaturation', formData.oxygen_saturation)}
            />
            <ValidatedInput
              label="Weight (kg)"
              name="weight"
              value={formData.weight}
              onChange={handleChange}
              type="number"
              step="0.1"
              error={getVitalError('weight', formData.weight)?.message}
            />
            <ValidatedInput
              label="Height (cm)"
              name="height"
              value={formData.height}
              onChange={handleChange}
              type="number"
              error={getVitalError('height', formData.height)?.message}
            />
          </SimpleGrid>

          <FormControl>
            <FormLabel>Triage Level</FormLabel>
            <Select name="triage_level" value={formData.triage_level} onChange={handleChange} 
              bg={
                formData.triage_level === 'Red' ? 'red.100' : 
                formData.triage_level === 'Yellow' ? 'yellow.100' : 'green.100'
              }
            >
              <option value="Green">Green (Routine)</option>
              <option value="Yellow">Yellow (Urgent)</option>
              <option value="Red">Red (Emergency)</option>
            </Select>
          </FormControl>

          <FormControl>
            <FormLabel>Nurse Notes</FormLabel>
            <Textarea name="nurse_notes" value={formData.nurse_notes} onChange={handleChange} placeholder="Observations..." />
          </FormControl>

          <FormControl as="fieldset">
            <FormLabel as="legend">Next Step</FormLabel>
            <RadioGroup name="next_step" value={formData.next_step} onChange={(val) => setFormData(prev => ({ ...prev, next_step: val }))}>
              <Stack direction="row" spacing={4}>
                <Radio value="refer_to_doctor">Refer to Doctor</Radio>
                <Radio value="treat_by_nurse">Treat by Nurse</Radio>
                <Radio value="discharge">Discharge</Radio>
              </Stack>
            </RadioGroup>
          </FormControl>
        </VStack>

        <HStack mt={6} justify="flex-end">
          <Button variant="ghost" onClick={() => navigate('/nurse/queue')}>
            Cancel
          </Button>
          <Button colorScheme="blue" onClick={handleSubmit} isLoading={loading}>
            Save & Update Status
          </Button>
        </HStack>
      </Box>
    </ModuleLayout>
  );
}

