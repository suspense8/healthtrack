import { useState } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton,
  Button, FormControl, FormLabel, Input, Select, Textarea, SimpleGrid, VStack,
  NumberInput, NumberInputField, HStack, RadioGroup, Radio, Stack, useToast
} from '@chakra-ui/react';
import api from '../../../services/api';

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
                <HStack>
                  <Input placeholder="Sys" name="systolic_bp" value={formData.systolic_bp} onChange={handleChange} />
                  <Input placeholder="Dia" name="diastolic_bp" value={formData.diastolic_bp} onChange={handleChange} />
                </HStack>
              </FormControl>
              <FormControl>
                <FormLabel>Heart Rate (bpm)</FormLabel>
                <Input name="heart_rate" value={formData.heart_rate} onChange={handleChange} />
              </FormControl>
              <FormControl>
                <FormLabel>Resp. Rate (bpm)</FormLabel>
                <Input name="respiratory_rate" value={formData.respiratory_rate} onChange={handleChange} />
              </FormControl>
              <FormControl>
                <FormLabel>Temperature (°C)</FormLabel>
                <Input name="temperature" value={formData.temperature} onChange={handleChange} />
              </FormControl>
              <FormControl>
                <FormLabel>O2 Saturation (%)</FormLabel>
                <Input name="oxygen_saturation" value={formData.oxygen_saturation} onChange={handleChange} />
              </FormControl>
              <FormControl>
                <FormLabel>Weight (kg)</FormLabel>
                <Input name="weight" value={formData.weight} onChange={handleChange} />
              </FormControl>
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
