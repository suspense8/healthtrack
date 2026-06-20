import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Heading, Text, Badge, Button, Spinner, Center, VStack, HStack, SimpleGrid,
  Tabs, TabList, TabPanels, Tab, TabPanel, useToast
} from '@chakra-ui/react';
import { ArrowBackIcon } from '@chakra-ui/icons';
import api from '../../../services/api';
import DoctorLayout from './DoctorLayout';

export default function AdmissionDetailView() {
  const { admissionId } = useParams();
  const navigate = useNavigate();
  const [admission, setAdmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    const fetchAdmission = async () => {
      try {
        const res = await api.get(`/admission/${admissionId}`);
        setAdmission(res.data);
      } catch (error) {
        toast({ title: 'Failed to load admission details', status: 'error' });
        navigate('/doctor/admitted');
      } finally {
        setLoading(false);
      }
    };
    if (admissionId) {
      fetchAdmission();
    }
  }, [admissionId, navigate, toast]);

  if (loading) {
    return (
      <DoctorLayout activeTab="admitted" setActiveTab={(tab) => navigate(`/doctor/${tab}`)}>
        <Center h="200px"><Spinner /></Center>
      </DoctorLayout>
    );
  }

  if (!admission) {
    return null;
  }

  return (
    <DoctorLayout activeTab="admitted" setActiveTab={(tab) => navigate(`/doctor/${tab}`)}>
      <Box bg="white" p={6} borderRadius="lg" boxShadow="sm">
        <HStack mb={6}>
          <Button leftIcon={<ArrowBackIcon />} variant="ghost" onClick={() => navigate('/doctor/admitted')}>
            Back
          </Button>
          <Heading size="md">
            Admission Details: {admission.patient?.first_name} {admission.patient?.last_name}
          </Heading>
        </HStack>

        <Tabs variant="enclosed" colorScheme="green">
          <TabList>
            <Tab>Admission Info</Tab>
            <Tab>Progress Notes ({admission.notes?.length || 0})</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              <SimpleGrid columns={2} spacing={4}>
                <Box>
                  <Text fontSize="xs" color="gray.500">Ward / Bed</Text>
                  <Text fontWeight="bold">{admission.ward?.ward_name} - {admission.bed?.bed_number}</Text>
                </Box>
                <Box>
                  <Text fontSize="xs" color="gray.500">Admitted On</Text>
                  <Text>{new Date(admission.admitted_at).toLocaleString()}</Text>
                </Box>
                <Box gridColumn="span 2">
                  <Text fontSize="xs" color="gray.500">Admission Reason</Text>
                  <Text>{admission.admission_reason}</Text>
                </Box>
                <Box gridColumn="span 2">
                  <Text fontSize="xs" color="gray.500">Initial Orders</Text>
                  <Text>{admission.initial_orders || 'None'}</Text>
                </Box>
              </SimpleGrid>
            </TabPanel>
            <TabPanel>
              <VStack spacing={3} align="stretch" maxH="400px" overflowY="auto">
                {admission.notes?.map((note) => (
                  <Box key={note.note_id} p={3} bg="gray.50" borderRadius="md">
                    <HStack justify="space-between" mb={1}>
                      <Badge>{note.note_type}</Badge>
                      <Text fontSize="xs" color="gray.500">
                        {new Date(note.created_at).toLocaleString()}
                      </Text>
                    </HStack>
                    <Text fontSize="sm">{note.content}</Text>
                    {note.systolic_bp && (
                      <Text fontSize="xs" color="blue.600" mt={1}>
                        Vitals: BP {note.systolic_bp}/{note.diastolic_bp}, HR {note.heart_rate}, Temp {note.temperature}°C
                      </Text>
                    )}
                  </Box>
                ))}
                {(!admission.notes || admission.notes.length === 0) && (
                  <Text color="gray.500" textAlign="center">No notes recorded yet</Text>
                )}
              </VStack>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>
    </DoctorLayout>
  );
}







