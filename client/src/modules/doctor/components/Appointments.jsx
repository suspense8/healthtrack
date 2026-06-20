import { useState, useEffect } from 'react';
import {
  Box, Heading, Table, Thead, Tbody, Tr, Th, Td, Badge, Button, useDisclosure,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton, ModalFooter,
  FormControl, FormLabel, Input, Textarea, useToast, VStack, Text, Divider, HStack
} from '@chakra-ui/react';
import { AddIcon, TimeIcon } from '@chakra-ui/icons';
import api from '../../../services/api';
import FollowUpView from './FollowUpView';

export default function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [formData, setFormData] = useState({ patient_id: '', scheduled_date: '', reason: '' });
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const toast = useToast();

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const res = await api.get('/doctor/appointments');
      setAppointments(res.data);
    } catch (error) {
      console.error("Failed to fetch appointments", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleSubmit = async () => {
    try {
      await api.post('/doctor/appointments', formData);
      toast({ title: 'Appointment scheduled', status: 'success' });
      onClose();
      fetchAppointments();
    } catch (error) {
      toast({ title: 'Failed to schedule', status: 'error' });
    }
  };

  const isDue = (date) => {
    const apptDate = new Date(date);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const apptDay = new Date(apptDate.getFullYear(), apptDate.getMonth(), apptDate.getDate());

    // Due if it's today OR in the past
    return apptDay.getTime() === today.getTime() || apptDate < now;
  };

  const dueAppointments = appointments.filter(a => isDue(a.scheduled_date));
  const upcomingAppointments = appointments.filter(a => !isDue(a.scheduled_date));

  if (selectedAppointment) {
    return (
      <FollowUpView
        appointment={selectedAppointment}
        onBack={() => setSelectedAppointment(null)}
        onComplete={() => {
          setSelectedAppointment(null);
          fetchAppointments();
        }}
      />
    );
  }

  return (
    <Box>
      {/* Due Appointments Section */}
      <Box bg="white" p={6} borderRadius="lg" boxShadow="sm" mb={6} borderLeft="4px solid" borderColor="red.400">
        <HStack justify="space-between" mb={4}>
          <Heading size="md" color="red.600">
            <TimeIcon mr={2} /> Due / Past Due Appointments
          </Heading>
          <Button size="sm" onClick={fetchAppointments} isLoading={loading}>
            Refresh
          </Button>
        </HStack>
        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>Date & Time</Th>
              <Th>Patient</Th>
              <Th>Reason</Th>
              <Th>Status</Th>
              <Th>Action</Th>
            </Tr>
          </Thead>
          <Tbody>
            {dueAppointments.map((appt) => {
              const isReady = appt.status === 'Checked In' || appt.status === 'Vitals Complete';
              const hasVitals = appt.status === 'Vitals Complete';

              return (
                <Tr
                  key={appt.appointment_id}
                  _hover={isReady ? { bg: 'green.50', cursor: 'pointer' } : { bg: 'gray.50', cursor: 'not-allowed' }}
                  onClick={() => isReady && setSelectedAppointment(appt)}
                  opacity={isReady ? 1 : 0.7}
                >
                  <Td fontWeight="bold">{new Date(appt.scheduled_date).toLocaleString()}</Td>
                  <Td>{appt.patient.first_name} {appt.patient.last_name}</Td>
                  <Td>{appt.reason}</Td>
                  <Td>
                    {hasVitals ? (
                      <Badge colorScheme="green">Vitals Done ✓</Badge>
                    ) : (
                      <Badge colorScheme={isReady ? 'green' : 'orange'}>
                        {isReady ? 'Ready' : 'Waiting'}
                      </Badge>
                    )}
                  </Td>
                  <Td>
                    <Button
                      size="sm"
                      colorScheme={isReady ? 'green' : 'gray'}
                      isDisabled={!isReady}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isReady) setSelectedAppointment(appt);
                      }}
                    >
                      {isReady ? 'Start Appointment' : 'Waiting for Arrival'}
                    </Button>
                  </Td>
                </Tr>
              );
            })}
            {dueAppointments.length === 0 && <Tr><Td colSpan={5} textAlign="center">No due appointments</Td></Tr>}
          </Tbody>
        </Table>
      </Box>

      {/* Upcoming Appointments Section */}
      <Box bg="white" p={6} borderRadius="lg" boxShadow="sm">
        <HStack justify="space-between" mb={4}>
          <Heading size="md">Upcoming Schedule</Heading>
          <Button size="sm" onClick={fetchAppointments} isLoading={loading}>
            Refresh
          </Button>
        </HStack>
        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>Date & Time</Th>
              <Th>Patient</Th>
              <Th>Reason</Th>
              <Th>Status</Th>
            </Tr>
          </Thead>
          <Tbody>
            {upcomingAppointments.map((appt) => (
              <Tr key={appt.appointment_id}>
                <Td>{new Date(appt.scheduled_date).toLocaleString()}</Td>
                <Td>{appt.patient.first_name} {appt.patient.last_name}</Td>
                <Td>{appt.reason}</Td>
                <Td><Badge colorScheme="blue">{appt.status}</Badge></Td>
              </Tr>
            ))}
            {upcomingAppointments.length === 0 && <Tr><Td colSpan={4} textAlign="center">No upcoming appointments</Td></Tr>}
          </Tbody>
        </Table>
      </Box>
    </Box>
  );
}
