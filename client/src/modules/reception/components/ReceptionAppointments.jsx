import { useState, useEffect } from 'react';
import {
  Box, Heading, Table, Thead, Tbody, Tr, Th, Td, Button, Badge, useToast, Spinner, Center, HStack
} from '@chakra-ui/react';
import api from '../../../services/api';

export default function ReceptionAppointments({ onCheckIn }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const res = await api.get('/reception/appointments/today');
      setAppointments(res.data);
    } catch (error) {
      console.error("Failed to fetch appointments", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
    const interval = setInterval(fetchAppointments, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const handleCheckIn = async (appt) => {
    try {
      await api.post('/reception/checkin', {
        patient_id: appt.patient.patient_id,
        visit_reason: appt.reason,
        visit_type: 'Appointment',
        appointment_id: appt.appointment_id
      });
      toast({ title: 'Patient Checked In', status: 'success' });
      fetchAppointments(); // Refresh list
      if (onCheckIn) onCheckIn(); // Notify parent to refresh queue
    } catch (error) {
      toast({ title: 'Check-in failed', description: error.response?.data?.error, status: 'error' });
    }
  };

  if (loading) return <Center h="200px"><Spinner /></Center>;

  return (
    <Box>
      <HStack justify="space-between" mb={4}>
        <Heading size="md">Today's Appointments</Heading>
        <Button size="sm" onClick={fetchAppointments} isLoading={loading}>
          Refresh
        </Button>
      </HStack>
      <Table variant="simple">
        <Thead>
          <Tr>
            <Th>Time</Th>
            <Th>Patient</Th>
            <Th>ID</Th>
            <Th>Reason</Th>
            <Th>Action</Th>
          </Tr>
        </Thead>
        <Tbody>
          {appointments.map((appt) => (
            <Tr key={appt.appointment_id}>
              <Td>{new Date(appt.scheduled_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Td>
              <Td>{appt.patient.first_name} {appt.patient.last_name}</Td>
              <Td>{appt.patient.national_id || 'N/A'}</Td>
              <Td>{appt.reason}</Td>
              <Td>
                <Button size="sm" colorScheme="green" onClick={() => handleCheckIn(appt)}>
                  Check In
                </Button>
              </Td>
            </Tr>
          ))}
          {appointments.length === 0 && <Tr><Td colSpan={5} textAlign="center">No appointments scheduled for today</Td></Tr>}
        </Tbody>
      </Table>
    </Box>
  );
}
