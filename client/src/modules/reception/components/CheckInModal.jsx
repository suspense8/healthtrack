import { useState, useEffect } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton,
  Button, FormControl, FormLabel, Input, Select, Switch, Textarea, useToast, VStack
} from '@chakra-ui/react';
import api from '../../../services/api';
import { useOffline } from '../../../context/OfflineContext';

export default function CheckInModal({ isOpen, onClose, patient }) {
  const [visitReason, setVisitReason] = useState('');
  const [visitType, setVisitType] = useState('Walk-in');
  const [appointments, setAppointments] = useState([]);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState('');
  const [isEmergency, setIsEmergency] = useState(false);
  const [referredBy, setReferredBy] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const { addOfflineAction, isOnline } = useOffline();

  useEffect(() => {
    if (isOpen && patient?.patient_id) {
      const fetchAppointments = async () => {
        try {
          const res = await api.get('/reception/appointments/today');
          const patientAppointments = res.data.filter(
            appt => appt.patient_id === patient.patient_id
          );
          setAppointments(patientAppointments);
          if (patientAppointments.length > 0) {
            setSelectedAppointmentId(patientAppointments[0].appointment_id);
          }
        } catch (error) {
          console.error("Failed to fetch appointments", error);
        }
      };
      fetchAppointments();
    }
  }, [isOpen, patient]);

  const handleSubmit = async () => {
    setLoading(true);
    const payload = {
      patient_id: patient.patient_id,
      visit_reason: visitReason,
      visit_type: visitType,
      is_emergency: isEmergency,
      referred_by: referredBy || null,
      appointment_id: visitType === 'Follow-up' && selectedAppointmentId ? selectedAppointmentId : null
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
                {appointments.length > 0 && <option value="Follow-up">Follow-up (Scheduled)</option>}
                <option value="Appointment">Other Appointment</option>
              </Select>
            </FormControl>

            {visitType === 'Follow-up' && appointments.length > 0 && (
              <FormControl>
                <FormLabel>Select Appointment</FormLabel>
                <Select
                  value={selectedAppointmentId}
                  onChange={(e) => setSelectedAppointmentId(e.target.value)}
                >
                  {appointments.map(appt => (
                    <option key={appt.appointment_id} value={appt.appointment_id}>
                      {new Date(appt.scheduled_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {appt.reason}
                    </option>
                  ))}
                </Select>
              </FormControl>
            )}

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
