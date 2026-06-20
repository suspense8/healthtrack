import { useState } from 'react';
import {
  Box, VStack, HStack, Heading, FormControl, FormLabel, Input, Button,
  NumberInput, NumberInputField, Checkbox, Textarea, useToast, Alert,
  AlertIcon, AlertTitle, AlertDescription, Text, Divider, Badge, Select
} from '@chakra-ui/react';
import { FaAmbulance } from 'react-icons/fa';
import api from '../../../services/api';

const EMERGENCY_TYPES = [
  { value: 'Labor', label: 'Labor / Active Delivery' },
  { value: 'Heavy Bleeding', label: 'Heavy Bleeding (APH/PPH)' },
  { value: 'Eclampsia', label: 'Eclampsia / Seizure' },
  { value: 'Trauma', label: 'Trauma / Injury' },
  { value: 'Respiratory Distress', label: 'Respiratory Distress' },
  { value: 'Other', label: 'Other Emergency' },
];

export default function EmergencyObstetricRegistration({ onSuccess, onCancel }) {
  const [loading, setLoading] = useState(false);
  const [searchPhone, setSearchPhone] = useState('');
  const [existingPatient, setExistingPatient] = useState(null);
  const toast = useToast();

  const [formData, setFormData] = useState({
    // Patient data (if new)
    first_name: '',
    last_name: '',
    age: '',
    phone_number: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',

    // Emergency type
    emergency_type: 'Labor',

    // Obstetric data (Labor only)
    gravida: '',
    para: '',
    gestational_age_weeks: '',
    previous_csection: false,

    // Complaint
    complaint: ''
  });

  const isLabor = formData.emergency_type === 'Labor';

  const selectedTypeLabel =
    EMERGENCY_TYPES.find(t => t.value === formData.emergency_type)?.label || formData.emergency_type;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const searchPatient = async () => {
    if (!searchPhone) return;

    try {
      const res = await api.get(`/reception/search-patient?phone=${searchPhone}`);
      if (res.data) {
        setExistingPatient(res.data);
        setFormData(prev => ({
          ...prev,
          first_name: res.data.first_name,
          last_name: res.data.last_name,
          age: res.data.age,
          phone_number: res.data.phone_number,
          emergency_contact_name: res.data.emergency_contact_name || '',
          emergency_contact_phone: res.data.emergency_contact_phone || ''
        }));
        toast({
          title: 'Patient found',
          description: `${res.data.first_name} ${res.data.last_name}`,
          status: 'success',
          duration: 3000
        });
      } else {
        toast({
          title: 'Patient not found',
          description: 'Register as new patient',
          status: 'info',
          duration: 3000
        });
        setExistingPatient(null);
      }
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        patient_id: existingPatient?.patient_id || null,
        patient_data: !existingPatient ? {
          first_name: formData.first_name,
          last_name: formData.last_name,
          age: parseInt(formData.age),
          phone_number: formData.phone_number,
          emergency_contact_name: formData.emergency_contact_name,
          emergency_contact_phone: formData.emergency_contact_phone
        } : null,
        emergency_type: formData.emergency_type,
        // Obstetric data only sent for Labor
        obstetric_data: isLabor ? {
          gravida: parseInt(formData.gravida) || null,
          para: parseInt(formData.para) || null,
          gestational_age_weeks: parseInt(formData.gestational_age_weeks) || null,
          previous_csection: formData.previous_csection
        } : null,
        complaint: formData.complaint
      };

      const res = await api.post('/reception/register-emergency-obstetric', payload);

      toast({
        title: 'Emergency registration successful',
        description: `Queue #${res.data.queue_number} - Nurse alerted`,
        status: 'success',
        duration: 5000,
        isClosable: true
      });

      if (onSuccess) {
        onSuccess(res.data);
      }

    } catch (error) {
      console.error('Registration error:', error);
      toast({
        title: 'Registration failed',
        description: error.response?.data?.error || 'Please try again',
        status: 'error',
        duration: 5000
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box bg="white" p={6} borderRadius="lg" boxShadow="md" border="3px solid" borderColor="red.500">
      {/* Emergency Header */}
      <HStack mb={6} spacing={3} bg="red.50" p={4} borderRadius="md">
        <FaAmbulance size={32} color="#E53E3E" />
        <VStack align="start" spacing={0}>
          <Heading size="lg" color="red.600">EMERGENCY REGISTRATION</Heading>
          <Text color="red.500" fontWeight="semibold">{selectedTypeLabel}</Text>
        </VStack>
      </HStack>

      <Alert status="warning" mb={4} borderRadius="md">
        <AlertIcon />
        <Box>
          <AlertTitle>Fast-Track Registration</AlertTitle>
          <AlertDescription>
            Nurse will be notified immediately upon registration
          </AlertDescription>
        </Box>
      </Alert>

      <form onSubmit={handleSubmit}>
        <VStack spacing={5} align="stretch">

          {/* Emergency Type Selector */}
          <Box p={4} bg="red.50" borderRadius="md">
            <FormControl isRequired>
              <FormLabel fontWeight="bold" color="red.700">Emergency Type</FormLabel>
              <Select
                name="emergency_type"
                value={formData.emergency_type}
                onChange={handleChange}
                bg="white"
                borderColor="red.300"
                _hover={{ borderColor: 'red.400' }}
                focusBorderColor="red.500"
              >
                {EMERGENCY_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Divider />

          {/* Patient Search */}
          <Box p={4} bg="blue.50" borderRadius="md">
            <Heading size="sm" mb={3}>1. Search Existing Patient</Heading>
            <HStack>
              <FormControl>
                <FormLabel fontSize="sm">Phone Number</FormLabel>
                <Input
                  bg="white"
                  placeholder="Enter phone number"
                  value={searchPhone}
                  onChange={(e) => setSearchPhone(e.target.value)}
                />
              </FormControl>
              <Button colorScheme="blue" onClick={searchPatient} alignSelf="flex-end">
                Search
              </Button>
            </HStack>
            {existingPatient && (
              <Badge colorScheme="green" mt={2} p={2} fontSize="md">
                ✓ Found: {existingPatient.first_name} {existingPatient.last_name}
              </Badge>
            )}
          </Box>

          <Divider />

          {/* Patient Details */}
          <Box>
            <Heading size="sm" mb={3}>2. Patient Information</Heading>
            <VStack spacing={3}>
              <HStack width="full" spacing={3}>
                <FormControl isRequired>
                  <FormLabel>First Name</FormLabel>
                  <Input
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    placeholder="Jane"
                    isDisabled={!!existingPatient}
                  />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Last Name</FormLabel>
                  <Input
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    placeholder="Doe"
                    isDisabled={!!existingPatient}
                  />
                </FormControl>
              </HStack>

              <HStack width="full" spacing={3}>
                <FormControl isRequired>
                  <FormLabel>Age</FormLabel>
                  <NumberInput min={0} max={120}>
                    <NumberInputField
                      name="age"
                      value={formData.age}
                      onChange={handleChange}
                      placeholder="28"
                      isDisabled={!!existingPatient}
                    />
                  </NumberInput>
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Phone Number</FormLabel>
                  <Input
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={handleChange}
                    placeholder="+231..."
                    isDisabled={!!existingPatient}
                  />
                </FormControl>
              </HStack>

              <HStack width="full" spacing={3}>
                <FormControl>
                  <FormLabel>Emergency Contact Name</FormLabel>
                  <Input
                    name="emergency_contact_name"
                    value={formData.emergency_contact_name}
                    onChange={handleChange}
                    placeholder="John Doe"
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Emergency Contact Phone</FormLabel>
                  <Input
                    name="emergency_contact_phone"
                    value={formData.emergency_contact_phone}
                    onChange={handleChange}
                    placeholder="+231..."
                  />
                </FormControl>
              </HStack>
            </VStack>
          </Box>

          <Divider />

          {/* Obstetric History — Labor only */}
          {isLabor && (
            <Box p={4} bg="pink.50" borderRadius="md">
              <Heading size="sm" mb={3}>3. Obstetric History</Heading>
              <VStack spacing={3}>
                <HStack width="full" spacing={3}>
                  <FormControl>
                    <FormLabel>Gravida (G) - Total Pregnancies</FormLabel>
                    <NumberInput min={0} max={20}>
                      <NumberInputField
                        name="gravida"
                        value={formData.gravida}
                        onChange={handleChange}
                        placeholder="2"
                      />
                    </NumberInput>
                  </FormControl>
                  <FormControl>
                    <FormLabel>Para (P) - Live Births</FormLabel>
                    <NumberInput min={0} max={20}>
                      <NumberInputField
                        name="para"
                        value={formData.para}
                        onChange={handleChange}
                        placeholder="1"
                      />
                    </NumberInput>
                  </FormControl>
                  <FormControl>
                    <FormLabel>Weeks Pregnant</FormLabel>
                    <NumberInput min={1} max={45}>
                      <NumberInputField
                        name="gestational_age_weeks"
                        value={formData.gestational_age_weeks}
                        onChange={handleChange}
                        placeholder="38"
                      />
                    </NumberInput>
                  </FormControl>
                </HStack>

                <FormControl>
                  <Checkbox
                    name="previous_csection"
                    isChecked={formData.previous_csection}
                    onChange={handleChange}
                    colorScheme="red"
                  >
                    <Text fontWeight="semibold">Previous C-Section</Text>
                  </Checkbox>
                </FormControl>
              </VStack>
            </Box>
          )}

          {/* Complaint */}
          <FormControl isRequired>
            <FormLabel>Chief Complaint</FormLabel>
            <Textarea
              name="complaint"
              value={formData.complaint}
              onChange={handleChange}
              placeholder={
                isLabor
                  ? 'e.g., Active labor, contractions every 2 minutes, water broke, bleeding...'
                  : 'Describe the emergency...'
              }
              rows={3}
            />
          </FormControl>

          {/* Action Buttons */}
          <HStack justify="flex-end" pt={4} spacing={3}>
            {onCancel && (
              <Button variant="ghost" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              colorScheme="red"
              size="lg"
              isLoading={loading}
              loadingText="Registering..."
              leftIcon={<FaAmbulance />}
            >
              REGISTER &amp; ALERT NURSE
            </Button>
          </HStack>
        </VStack>
      </form>
    </Box>
  );
}
