import { useState, useEffect } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton,
  Button, FormControl, FormLabel, Input, VStack, useToast
} from '@chakra-ui/react';
import api from '../../../services/api';

export default function PatientVerificationModal({ isOpen, onClose, patient }) {
  const [formData, setFormData] = useState({
    phone_number: '',
    address: '',
    emergency_contact_name: '',
    emergency_contact_phone: ''
  });
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (patient) {
      setFormData({
        phone_number: patient.phone_number || '',
        address: patient.address || '',
        emergency_contact_name: patient.emergency_contact_name || '',
        emergency_contact_phone: patient.emergency_contact_phone || ''
      });
    }
  }, [patient]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await api.put(`/reception/patients/${patient.patient_id}/verify`, formData);
      toast({ title: 'Patient details verified', status: 'success' });
      onClose();
    } catch (error) {
      toast({ title: 'Verification failed', description: error.response?.data?.error, status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Verify Patient Details: {patient?.first_name} {patient?.last_name}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4}>
            <FormControl>
              <FormLabel>Phone Number</FormLabel>
              <Input 
                name="phone_number"
                value={formData.phone_number} 
                onChange={handleChange} 
              />
            </FormControl>
            <FormControl>
              <FormLabel>Address</FormLabel>
              <Input 
                name="address"
                value={formData.address} 
                onChange={handleChange} 
              />
            </FormControl>
            <FormControl>
              <FormLabel>Emergency Contact Name</FormLabel>
              <Input 
                name="emergency_contact_name"
                value={formData.emergency_contact_name} 
                onChange={handleChange} 
              />
            </FormControl>
            <FormControl>
              <FormLabel>Emergency Contact Phone</FormLabel>
              <Input 
                name="emergency_contact_phone"
                value={formData.emergency_contact_phone} 
                onChange={handleChange} 
              />
            </FormControl>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>Cancel</Button>
          <Button colorScheme="blue" onClick={handleSubmit} isLoading={loading}>
            Confirm & Verify
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
