import { useState } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton,
  Button, FormControl, FormLabel, Input, Select, Textarea, SimpleGrid, VStack,
  NumberInput, NumberInputField, HStack, RadioGroup, Radio, Stack, useToast
} from '@chakra-ui/react';
import api from '../../../services/api';
import ValidatedInput from '../../../components/shared/ValidatedInput';
import { getVitalThresholdWarning, validateVitalRange } from '../../../utils/validationSchemas';

export default function VitalsForm({ isOpen, onClose, visit, onSuccess }) {
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
  const toast = useToast();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Get validation error for a vital field
  const getVitalError = (fieldName, value) => {
    if (!value) return null;
    return validateVitalRange(fieldName, value);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await api.post('/nurses/vitals', {
        visit_id: visit.visit_id,
        ...formData
      });
      toast({ title: 'Vitals recorded successfully', status: 'success' });
      onSuccess();
      onClose();
    } catch (error) {
      toast({ title: 'Failed to save vitals', description: error.response?.data?.error, status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Record Vitals: {visit?.patient?.first_name} {visit?.patient?.last_name}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
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
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>Cancel</Button>
          <Button colorScheme="blue" onClick={handleSubmit} isLoading={loading}>
            Save & Update Status
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
