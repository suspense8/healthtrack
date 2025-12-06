import { useState, useEffect } from 'react';
import {
  Box, Heading, VStack, Text, Button, Divider, HStack, Badge, Spinner, Center,
  FormControl, FormLabel, Textarea, useToast, Alert, AlertIcon
} from '@chakra-ui/react';
import { ArrowBackIcon, CheckIcon } from '@chakra-ui/icons';
import api from '../../../services/api';

export default function FollowUpView({ appointment, onBack, onComplete }) {
  const [lastVisit, setLastVisit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [prescriptions, setPrescriptions] = useState([]);
  const toast = useToast();

  useEffect(() => {
    const fetchLastVisit = async () => {
      try {
        const res = await api.get(`/doctor/patients/${appointment.patient_id}/last-visit`);
        setLastVisit(res.data);
      } catch (error) {
        console.error("Failed to fetch last visit", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLastVisit();
  }, [appointment.patient_id]);

  const handleRefill = (med) => {
    setPrescriptions([...prescriptions, {
      medication_name: med.medication_name,
      dosage: med.dosage,
      frequency: med.frequency,
      duration: med.duration
    }]);
    toast({ title: 'Prescription Added', status: 'info', duration: 2000 });
  };

  const removePrescription = (index) => {
    setPrescriptions(prescriptions.filter((_, i) => i !== index));
  };

  const handleFinalize = async () => {
    setSubmitting(true);
    try {
      await api.post(`/doctor/appointments/complete`, {
        appointment_id: appointment.appointment_id,
        notes,
        is_final: true,
        prescriptions
      });

      toast({ title: 'Consultation Ended', status: 'success' });
      onComplete();
    } catch (error) {
      toast({ title: 'Failed to complete', status: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Center h="300px"><Spinner /></Center>;

  return (
    <Box bg="white" p={6} borderRadius="lg" boxShadow="sm">
      <HStack mb={6}>
        <Button leftIcon={<ArrowBackIcon />} variant="ghost" onClick={onBack}>Back</Button>
        <Heading size="md">Follow-up: {appointment.patient.first_name} {appointment.patient.last_name}</Heading>
      </HStack>

      <HStack align="start" spacing={8} mb={6}>
        <Box flex={1} p={5} bg="blue.50" borderRadius="md" borderLeft="4px solid" borderColor="blue.500">
          <Heading size="sm" mb={3} color="blue.700">Current Appointment</Heading>
          <Text mb={2}><strong>Reason:</strong> {appointment.reason}</Text>
          <Text mb={2}><strong>Date:</strong> {new Date(appointment.scheduled_date).toLocaleDateString()}</Text>
          <Badge colorScheme={appointment.status === 'Checked In' ? 'green' : 'gray'}>{appointment.status}</Badge>
        </Box>

        <Box flex={1} p={5} bg="orange.50" borderRadius="md" borderLeft="4px solid" borderColor="orange.500">
          <Heading size="sm" mb={3} color="orange.700">Last Visit Context</Heading>
          {lastVisit ? (
            <VStack align="start" spacing={2}>
              <Text><strong>Date:</strong> {new Date(lastVisit.visit_date).toLocaleDateString()}</Text>
              <Text><strong>Diagnosis:</strong> {lastVisit.diagnosis}</Text>
              <Text><strong>Notes:</strong> {lastVisit.doctor_notes}</Text>
              
              {lastVisit.prescriptions && lastVisit.prescriptions.length > 0 && (
                <Box mt={2} w="100%">
                  <Text fontWeight="bold" fontSize="sm">Previous Meds:</Text>
                  {lastVisit.prescriptions.map((med, i) => (
                    <HStack key={i} justify="space-between" bg="white" p={2} borderRadius="md" mt={1}>
                      <Text fontSize="xs">{med.medication_name} ({med.dosage})</Text>
                      <Button size="xs" colorScheme="orange" variant="outline" onClick={() => handleRefill(med)}>
                        Refill
                      </Button>
                    </HStack>
                  ))}
                </Box>
              )}
            </VStack>
          ) : (
            <Text fontStyle="italic" color="gray.500">No previous visit records found.</Text>
          )}
        </Box>
      </HStack>

      <Divider my={6} />

      <Heading size="sm" mb={4}>Consultation Outcome</Heading>
      
      {prescriptions.length > 0 && (
        <Box mb={6}>
          <Text fontWeight="bold" mb={2}>New Prescriptions:</Text>
          <VStack align="stretch">
            {prescriptions.map((p, i) => (
              <HStack key={i} bg="green.50" p={2} borderRadius="md" justify="space-between">
                <Text fontSize="sm">{p.medication_name} - {p.dosage} {p.frequency} x {p.duration}</Text>
                <Button size="xs" colorScheme="red" variant="ghost" onClick={() => removePrescription(i)}>Remove</Button>
              </HStack>
            ))}
          </VStack>
        </Box>
      )}
      
      <FormControl mb={6}>
        <FormLabel>Follow-up Notes / Final Remarks</FormLabel>
        <Textarea 
          value={notes} 
          onChange={(e) => setNotes(e.target.value)} 
          placeholder="Enter notes about this follow-up..." 
          rows={4}
        />
      </FormControl>

      <Alert status="info" mb={6} borderRadius="md">
        <AlertIcon />
        Marking this as the <strong>Final Visit</strong> will complete the appointment cycle.
      </Alert>

      <HStack justify="flex-end">
        <Button size="lg" onClick={onBack}>Cancel</Button>
        <Button 
          colorScheme="green" 
          size="lg" 
          rightIcon={<CheckIcon />} 
          onClick={handleFinalize}
          isLoading={submitting}
        >
          Finalize & End Consultation
        </Button>
      </HStack>
    </Box>
  );
}
