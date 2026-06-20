import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Button, FormControl, FormLabel, Input, Select, Switch, Textarea, useToast, VStack,
  Heading, HStack
} from '@chakra-ui/react';
import { ArrowBackIcon } from '@chakra-ui/icons';
import api from '../../../services/api';
import { useOffline } from '../../../context/OfflineContext';
import ModuleLayout from '../../../components/shared/ModuleLayout';
import { FaClipboardList } from 'react-icons/fa';

export default function CheckInView() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [visitReason, setVisitReason] = useState('');
  const [visitType, setVisitType] = useState('Walk-in');
  const [appointments, setAppointments] = useState([]);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState('');
  const [isEmergency, setIsEmergency] = useState(false);
  const [referredBy, setReferredBy] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const toast = useToast();
  const { addOfflineAction, isOnline } = useOffline();

  useEffect(() => {
    const fetchPatientData = async () => {
      try {
        const [patientRes, apptRes] = await Promise.all([
          api.get(`/reception/patients/${patientId}`),
          api.get(`/reception/appointments/today`)
        ]);
        setPatient(patientRes.data);

        // Filter appointments for this specific patient
        const patientAppointments = apptRes.data.filter(
          appt => appt.patient_id === parseInt(patientId)
        );
        setAppointments(patientAppointments);
        if (patientAppointments.length > 0) {
          setSelectedAppointmentId(patientAppointments[0].appointment_id);
        }
      } catch (error) {
        toast({ title: 'Failed to load patient data', status: 'error' });
        navigate('/reception/search');
      } finally {
        setFetching(false);
      }
    };
    if (patientId) {
      fetchPatientData();
    }
  }, [patientId, navigate, toast]);

  const handleSubmit = async () => {
    setLoading(true);
    const payload = {
      patient_id: parseInt(patientId),
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
      navigate('/reception/queue');
    } catch (error) {
      if (!isOnline || error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
        addOfflineAction('CHECK_IN', payload);
        navigate('/reception/queue');
      } else {
        toast({ title: 'Check-in failed', description: error.response?.data?.error, status: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <Box p={6}>Loading patient...</Box>;
  }

  if (!patient) {
    return null;
  }

  return (
    <ModuleLayout
      activeTab="search"
      setActiveTab={(tab) => navigate(`/reception/${tab}`)}
      navItems={[]}
      title="Reception"
      color="blue"
      moduleIcon={FaClipboardList}
    >
      <Box bg="white" p={6} borderRadius="lg" boxShadow="sm">
        <HStack mb={6}>
          <Button leftIcon={<ArrowBackIcon />} variant="ghost" onClick={() => navigate('/reception/search')}>
            Back
          </Button>
          <Heading size="md">Check In: {patient.first_name} {patient.last_name}</Heading>
        </HStack>

        <VStack spacing={4} align="stretch" maxW="600px">
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

          <HStack mt={4}>
            <Button variant="ghost" onClick={() => navigate('/reception/search')}>
              Cancel
            </Button>
            <Button colorScheme={isOnline ? "blue" : "orange"} onClick={handleSubmit} isLoading={loading}>
              {isOnline ? 'Confirm Check-In' : 'Save Offline'}
            </Button>
          </HStack>
        </VStack>
      </Box>
    </ModuleLayout>
  );
}







