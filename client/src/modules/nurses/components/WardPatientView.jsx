import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Heading, Text, Badge, Button, Spinner, Center, VStack, HStack, SimpleGrid,
  Tabs, TabList, TabPanels, Tab, TabPanel, useToast
} from '@chakra-ui/react';
import { ArrowBackIcon } from '@chakra-ui/icons';
import api from '../../../services/api';
import ModuleLayout from '../../../components/shared/ModuleLayout';
import { FaUserNurse } from 'react-icons/fa';

export default function WardPatientView() {
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
        navigate('/nurse/ward');
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
      <ModuleLayout
        activeTab="ward"
        setActiveTab={(tab) => navigate(`/nurse/${tab}`)}
        navItems={[]}
        title="Nurse Station"
        color="purple"
        moduleIcon={FaUserNurse}
      >
        <Center h="200px"><Spinner /></Center>
      </ModuleLayout>
    );
  }

  if (!admission) {
    return null;
  }

  return (
    <ModuleLayout
      activeTab="ward"
      setActiveTab={(tab) => navigate(`/nurse/${tab}`)}
      navItems={[]}
      title="Nurse Station"
      color="purple"
      moduleIcon={FaUserNurse}
    >
      <Box bg="white" p={6} borderRadius="lg" boxShadow="sm">
        <HStack mb={6}>
          <Button leftIcon={<ArrowBackIcon />} variant="ghost" onClick={() => navigate('/nurse/ward')}>
            Back
          </Button>
          <Heading size="md">
            {admission.patient?.first_name} {admission.patient?.last_name}
          </Heading>
        </HStack>

        <Tabs variant="enclosed" colorScheme="purple">
          <TabList>
            <Tab>Admission Info</Tab>
            <Tab>Notes ({admission.notes?.length || 0})</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              <SimpleGrid columns={2} spacing={4}>
                <Box>
                  <Text fontSize="xs" color="gray.500">Ward / Bed</Text>
                  <Text fontWeight="bold">{admission.ward?.ward_name} - {admission.bed?.bed_number}</Text>
                </Box>
                <Box>
                  <Text fontSize="xs" color="gray.500">Priority</Text>
                  <Badge colorScheme={admission.priority === 'Critical' ? 'red' : 'orange'}>
                    {admission.priority}
                  </Badge>
                </Box>
                <Box gridColumn="span 2">
                  <Text fontSize="xs" color="gray.500">Admission Reason</Text>
                  <Text>{admission.admission_reason}</Text>
                </Box>
                <Box gridColumn="span 2">
                  <Text fontSize="xs" color="gray.500">Initial Orders</Text>
                  <Text>{admission.initial_orders || 'None specified'}</Text>
                </Box>
                <Box gridColumn="span 2">
                  <Text fontSize="xs" color="gray.500">Admitted At</Text>
                  <Text>{new Date(admission.admitted_at).toLocaleString()}</Text>
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
                  <Text color="gray.500" textAlign="center">No notes yet</Text>
                )}
              </VStack>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>
    </ModuleLayout>
  );
}






