import { useState } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton,
  Button, FormControl, FormLabel, Input, Select, Switch, Textarea, useToast, VStack
} from '@chakra-ui/react';
import api from '../../../services/api';
import { useOffline } from '../../../context/OfflineContext';

export default function CheckInModal({ isOpen, onClose, patient }) {
  const [visitReason, setVisitReason] = useState('');
  const [visitType, setVisitType] = useState('Walk-in');
  const [isEmergency, setIsEmergency] = useState(false);
  const [referredBy, setReferredBy] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const { addOfflineAction, isOnline } = useOffline();

  const handleSubmit = async () => {
    setLoading(true);
    const payload = {
      patient_id: patient.patient_id,
      visit_reason: visitReason,
      visit_type: visitType,
      is_emergency: isEmergency,
      referred_by: referredBy || null
    };

    try {
      const res = await api.post('/reception/checkin', payload);
      toast({ 
        title: 'Check-in successful', 
        description: `Queue Number: ${res.data.queue_number}`,
        status: 'success' 
      });
      onClose();
    } catch (error) {
      if (!isOnline || error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
        addOfflineAction('CHECK_IN', payload);
        onClose();
      } else {
        toast({ title: 'Check-in failed', description: error.response?.data?.error, status: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Check In: {patient.first_name} {patient.last_name}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4}>
            <FormControl>
              <FormLabel>Visit Type</FormLabel>
              <Select value={visitType} onChange={(e) => setVisitType(e.target.value)}>
                <option value="Walk-in">Walk-in</option>
                <option value="Appointment">Appointment</option>
              </Select>
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Reason for Visit</FormLabel>
              <Textarea 
                placeholder="e.g. Fever, Headache, Checkup" 
                value={visitReason} 
                onChange={(e) => setVisitReason(e.target.value)} 
              />
            </FormControl>
            <FormControl>
              <FormLabel>Referred By (Optional)</FormLabel>
              <Input 
                placeholder="e.g. Dr. Smith, Clinic Name"
                value={referredBy} 
                onChange={(e) => setReferredBy(e.target.value)} 
              />
            </FormControl>
            <FormControl display="flex" alignItems="center">
              <FormLabel htmlFor="emergency-switch" mb="0">
                Is Emergency?
              </FormLabel>
              <Switch 
                id="emergency-switch" 
                colorScheme="red" 
                isChecked={isEmergency} 
                onChange={(e) => setIsEmergency(e.target.checked)} 
              />
            </FormControl>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>Cancel</Button>
          <Button colorScheme={isOnline ? "blue" : "orange"} onClick={handleSubmit} isLoading={loading}>
            {isOnline ? 'Confirm Check-In' : 'Save Offline'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
