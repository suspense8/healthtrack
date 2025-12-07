import { useState } from 'react';
import {
  Box, Button, FormControl, FormLabel, Input, Select, VStack, SimpleGrid, 
  Heading, useToast, Textarea, Alert, AlertIcon, AlertTitle, AlertDescription,
  Switch, HStack, Badge, Divider
} from '@chakra-ui/react';
import api from '../../../services/api';
import { useOffline } from '../../../context/OfflineContext';
import ValidatedInput from '../../../components/shared/ValidatedInput';
import PhoneInput from '../../../components/shared/PhoneInput';
import AgeInput from '../../../components/shared/AgeInput';
import { schemas } from '../../../utils/validationSchemas';
import { useFormValidation } from '../../../utils/useFormValidation';
import { extractPhoneDigits } from '../../../utils/textFormatters';

export default function RegisterPatient({ onPatientRegistered }) {
  const [isEmergency, setIsEmergency] = useState(false);
  const [formData, setFormData] = useState({
    // Shared fields
    first_name: '', last_name: '', middle_name: '',
    date_of_birth: '', age: null, gender: '', national_id: '',
    phone_number: '', email: '', address: '',
    emergency_contact_name: '', emergency_contact_phone: '',
    
    // Standard specific
    patient_type: 'Student', 
    allergies: '', existing_conditions: '',

    // Emergency specific
    estimated_age: '',
    chief_complaint: '',
    brought_by: 'Walk-in',
    time_of_arrival: new Date().toISOString().slice(0, 16)
  });
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const toast = useToast();
  const { addOfflineAction, isOnline } = useOffline();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateField = (name, value) => {
    const schema = schemas[name];
    if (!schema) return null;

    if (schema.required && (!value || value.trim() === '')) {
      return schema.required;
    }

    if (!value || value.trim() === '') return null;

    if (schema.pattern && !schema.pattern.value.test(value)) {
      return schema.pattern.message;
    }

    if (schema.minLength && value.length < schema.minLength.value) {
      return schema.minLength.message;
    }

    if (schema.maxLength && value.length > schema.maxLength.value) {
      return schema.maxLength.message;
    }

    return null;
  };

  const handleEmergencyToggle = (e) => {
    setIsEmergency(e.target.checked);
    // Reset form when switching modes to avoid confusion
    resetForm();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (isEmergency) {
      await handleEmergencySubmit();
    } else {
      await handleStandardSubmit();
    }
  };

  const handleStandardSubmit = async () => {
    // Validate required fields
    const validationErrors = {};
    if (!formData.first_name || formData.first_name.trim() === '') {
      validationErrors.first_name = 'First name is required';
    }
    if (!formData.last_name || formData.last_name.trim() === '') {
      validationErrors.last_name = 'Last name is required';
    }
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      toast({ title: 'Validation Error', description: 'Please fill in all required fields', status: 'error' });
      setLoading(false);
      return;
    }

    // Transform data: lowercase names, extract phone digits
    const payload = {
      ...formData,
      first_name: formData.first_name.toLowerCase().trim(),
      last_name: formData.last_name.toLowerCase().trim(),
      middle_name: formData.middle_name ? formData.middle_name.toLowerCase().trim() : null,
      email: formData.email ? formData.email.toLowerCase().trim() : null,
      address: formData.address ? formData.address.toLowerCase().trim() : null,
      allergies: formData.allergies ? formData.allergies.toLowerCase().trim() : null,
      existing_conditions: formData.existing_conditions ? formData.existing_conditions.toLowerCase().trim() : null,
      emergency_contact_name: formData.emergency_contact_name ? formData.emergency_contact_name.toLowerCase().trim() : null,
      phone_number: formData.phone_number ? extractPhoneDigits(formData.phone_number) : null,
      emergency_contact_phone: formData.emergency_contact_phone ? extractPhoneDigits(formData.emergency_contact_phone) : null,
      date_of_birth: formData.date_of_birth ? new Date(formData.date_of_birth) : null,
      age: formData.age || (formData.date_of_birth ? calculateAge(formData.date_of_birth) : null),
      is_temp_record: false,
      id_verification_status: 'verified'
    };

    try {
      const res = await api.post('/reception/patients', payload);
      const newPatient = res.data;
      
      toast({ 
        title: 'Patient Registered Successfully', 
        description: `Patient ID: ${newPatient.patient_id}`,
        status: 'success' 
      });
      
      if (onPatientRegistered) onPatientRegistered(newPatient);
      resetForm();
    } catch (error) {
      handleError(error, 'CREATE_PATIENT', payload);
    } finally {
      setLoading(false);
    }
  };

  const handleEmergencySubmit = async () => {
    const timestamp = Date.now();
    const emergencyName = formData.first_name || 
      `Unknown ${formData.gender || 'Patient'} ${timestamp}`;
    
    const patientPayload = {
      first_name: emergencyName,
      last_name: 'EMERGENCY',
      gender: formData.gender || 'Unknown',
      patient_type: 'External',
      emergency_contact_name: formData.emergency_contact_name || null,
      emergency_contact_phone: formData.emergency_contact_phone || null,
      is_temp_record: true,
      id_verification_status: 'pending',
      national_id: `EMERG-${timestamp}`
    };

    try {
      // 1. Create emergency patient
      const patientRes = await api.post('/reception/patients', patientPayload);
      const patient = patientRes.data;

      // 2. Immediately check in
      const checkInPayload = {
        patient_id: patient.patient_id,
        visit_reason: formData.chief_complaint,
        visit_type: 'Walk-in',
        is_emergency: true,
        referred_by: formData.brought_by
      };

      const visitRes = await api.post('/reception/checkin', checkInPayload);
      
      toast({
        title: '🚨 EMERGENCY PATIENT REGISTERED',
        description: `Queue #${visitRes.data.queue_number} - ALERT TRIAGE NOW!`,
        status: 'error',
        duration: 10000,
        isClosable: true,
        position: 'top'
      });

      if (onPatientRegistered) onPatientRegistered(patient, true); // true = isEmergency
      resetForm();
    } catch (error) {
      handleError(error, 'EMERGENCY_REGISTRATION', { patient: patientPayload, visit: checkInPayload });
    } finally {
      setLoading(false);
    }
  };

  const handleError = (error, actionType, payload) => {
    if (!isOnline || error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      addOfflineAction(actionType, payload);
      resetForm();
    } else {
      toast({ title: 'Registration Failed', description: error.response?.data?.error, status: 'error' });
    }
  };

  const calculateAge = (dob) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= 0 && age <= 120 ? age : null;
  };

  const resetForm = () => {
    setFormData({
      first_name: '', last_name: '', middle_name: '',
      date_of_birth: '', age: null, gender: '', national_id: '',
      phone_number: '', email: '', address: '',
      emergency_contact_name: '', emergency_contact_phone: '',
      patient_type: 'Student', allergies: '', existing_conditions: '',
      estimated_age: '', chief_complaint: '', brought_by: 'Walk-in',
      time_of_arrival: new Date().toISOString().slice(0, 16)
    });
    setErrors({});
  };

  return (
    <Box as="form" onSubmit={handleSubmit} p={4} borderWidth={1} borderRadius="lg" 
         borderColor={isEmergency ? 'red.500' : 'gray.200'} 
         bg={isEmergency ? 'red.50' : 'white'}
         transition="all 0.3s"
    >
      <HStack justify="space-between" mb={6}>
        <Heading size="md" color={isEmergency ? 'red.600' : 'gray.700'}>
          {isEmergency ? '🚨 Emergency Registration' : 'New Patient Registration'}
        </Heading>
        <FormControl display="flex" alignItems="center" width="auto">
          <FormLabel htmlFor="emergency-mode" mb="0" fontWeight="bold" color={isEmergency ? 'red.600' : 'gray.600'}>
            Emergency Mode
          </FormLabel>
          <Switch 
            id="emergency-mode" 
            colorScheme="red" 
            size="lg"
            isChecked={isEmergency} 
            onChange={handleEmergencyToggle} 
          />
        </FormControl>
      </HStack>

      {isEmergency && (
        <Alert status="error" mb={6} borderRadius="md">
          <AlertIcon />
          <Box>
            <AlertTitle>RAPID TRIAGE MODE</AlertTitle>
            <AlertDescription>
              Collect ONLY essential information. Alert clinical team immediately after registration.
            </AlertDescription>
          </Box>
        </Alert>
      )}

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        {/* --- Fields for BOTH Modes --- */}
        <ValidatedInput
          name="first_name"
          label={`Patient Name ${isEmergency ? "(Optional)" : ""}`}
          value={formData.first_name}
          onChange={handleChange}
          placeholder={isEmergency ? "Leave blank if unknown" : "First Name"}
          isRequired={!isEmergency}
          error={errors.first_name}
          schema={schemas.first_name}
        />

        {!isEmergency && (
          <>
            <ValidatedInput
              name="last_name"
              label="Last Name"
              value={formData.last_name}
              onChange={handleChange}
              placeholder="Last Name"
              isRequired
              error={errors.last_name}
              schema={schemas.last_name}
            />
            <ValidatedInput
              name="middle_name"
              label="Middle Name"
              value={formData.middle_name}
              onChange={handleChange}
              placeholder="Middle Name (Optional)"
              error={errors.middle_name}
              schema={schemas.middle_name}
            />
          </>
        )}

        {/* --- Emergency Specific Fields --- */}
        {isEmergency ? (
          <>
            <FormControl isRequired>
              <FormLabel>Estimated Age</FormLabel>
              <Input 
                name="estimated_age" 
                value={formData.estimated_age} 
                onChange={handleChange} 
                placeholder="e.g. 25-30 years"
                bg="white"
              />
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Sex</FormLabel>
              <Select name="gender" value={formData.gender} onChange={handleChange} placeholder="Select" bg="white">
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Unknown">Unknown</option>
              </Select>
            </FormControl>
            <FormControl isRequired gridColumn={{ md: "span 2" }}>
              <FormLabel>Chief Complaint / Emergency Reason</FormLabel>
              <Textarea 
                name="chief_complaint" 
                value={formData.chief_complaint} 
                onChange={handleChange} 
                placeholder="e.g. Severe bleeding, Collapse, Difficulty breathing"
                bg="white"
                rows={2}
              />
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Brought By</FormLabel>
              <Select name="brought_by" value={formData.brought_by} onChange={handleChange} bg="white">
                <option value="Walk-in">Walk-in</option>
                <option value="Friend/Family">Friend/Family</option>
                <option value="Police">Police</option>
                <option value="Campus Security">Campus Security</option>
                <option value="Ambulance">Ambulance</option>
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel>Time of Arrival</FormLabel>
              <Input 
                type="datetime-local" 
                name="time_of_arrival" 
                value={formData.time_of_arrival} 
                onChange={handleChange} 
                bg="white"
              />
            </FormControl>
          </>
        ) : (
          /* --- Standard Specific Fields --- */
          <>
            <FormControl>
              <FormLabel>Date of Birth</FormLabel>
              <Input 
                type="date" 
                name="date_of_birth" 
                value={formData.date_of_birth} 
                onChange={handleChange}
                bg="white"
              />
            </FormControl>
            <AgeInput
              name="age"
              label="Age"
              value={formData.age}
              dateOfBirth={formData.date_of_birth}
              onChange={handleChange}
              allowManualEntry={true}
            />
            <FormControl>
              <FormLabel>Gender</FormLabel>
              <Select name="gender" value={formData.gender} onChange={handleChange} placeholder="Select gender" bg="white">
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel>National / Student ID</FormLabel>
              <Input name="national_id" value={formData.national_id} onChange={handleChange} bg="white" />
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Patient Type</FormLabel>
              <Select name="patient_type" value={formData.patient_type} onChange={handleChange} bg="white">
                <option value="Student">Student</option>
                <option value="Staff">Staff</option>
                <option value="Dependent">Dependent</option>
                <option value="External">External</option>
              </Select>
            </FormControl>
            <PhoneInput
              name="phone_number"
              label="Phone Number"
              value={formData.phone_number}
              onChange={handleChange}
              error={errors.phone_number}
            />
            <ValidatedInput
              name="email"
              label="Email"
              value={formData.email}
              onChange={handleChange}
              placeholder="email@example.com"
              type="email"
              error={errors.email}
              schema={schemas.email}
            />
            <ValidatedInput
              name="address"
              label="Address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Street address"
              as="textarea"
              gridColumn={{ md: "span 2" }}
            />
          </>
        )}

        {/* --- Shared Contact Fields --- */}
        <Divider gridColumn={{ md: "span 2" }} my={2} />
        <Heading size="sm" gridColumn={{ md: "span 2" }}>Emergency Contact {isEmergency && "(Optional)"}</Heading>
        <ValidatedInput
          name="emergency_contact_name"
          label="Contact Name"
          value={formData.emergency_contact_name}
          onChange={handleChange}
          placeholder="Contact Name"
        />
        <PhoneInput
          name="emergency_contact_phone"
          label="Contact Phone"
          value={formData.emergency_contact_phone}
          onChange={handleChange}
        />

        {/* --- Standard Medical Context --- */}
        {!isEmergency && (
          <>
            <Divider gridColumn={{ md: "span 2" }} my={2} />
            <Heading size="sm" gridColumn={{ md: "span 2" }}>Medical Context (Optional)</Heading>
            <ValidatedInput
              name="allergies"
              label="Allergies"
              value={formData.allergies}
              onChange={handleChange}
              placeholder="e.g. Penicillin, Peanuts"
              gridColumn={{ md: "span 2" }}
              helperText="Comma-separated list"
            />
            <ValidatedInput
              name="existing_conditions"
              label="Existing Conditions"
              value={formData.existing_conditions}
              onChange={handleChange}
              placeholder="e.g. Asthma, Diabetes"
              gridColumn={{ md: "span 2" }}
              helperText="Comma-separated list"
            />
          </>
        )}
      </SimpleGrid>

      <Button 
        mt={6} 
        colorScheme={isEmergency ? "red" : (isOnline ? "teal" : "orange")} 
        type="submit" 
        isLoading={loading} 
        width="full"
        size="lg"
      >
        {isEmergency ? '🚨 REGISTER & ALERT TRIAGE' : (isOnline ? 'Register Patient' : 'Save Offline')}
      </Button>
    </Box>
  );
}
