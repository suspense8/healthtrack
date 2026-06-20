import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Button, FormControl, FormLabel, Input, useToast, VStack,
  Heading, HStack, Text
} from '@chakra-ui/react';
import { ArrowBackIcon } from '@chakra-ui/icons';
import api from '../../../services/api';
import ModuleLayout from '../../../components/shared/ModuleLayout';
import { FaClipboardList } from 'react-icons/fa';

export default function PatientVerificationView() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [formData, setFormData] = useState({
    phone_number: '',
    address: '',
    emergency_contact_name: '',
    emergency_contact_phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const toast = useToast();

  useEffect(() => {
    const fetchPatient = async () => {
      try {
        const res = await api.get(`/reception/patients/${patientId}`);
        setPatient(res.data);
        setFormData({
          phone_number: res.data.phone_number || '',
          address: res.data.address || '',
          emergency_contact_name: res.data.emergency_contact_name || '',
          emergency_contact_phone: res.data.emergency_contact_phone || ''
        });
      } catch (error) {
        toast({ title: 'Failed to load patient', status: 'error' });
        navigate('/reception/search');
      } finally {
        setFetching(false);
      }
    };
    if (patientId) {
      fetchPatient();
    }
  }, [patientId, navigate, toast]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await api.put(`/reception/patients/${patientId}/verify`, formData);
      toast({ title: 'Patient verified successfully', status: 'success' });
      navigate('/reception/search');
    } catch (error) {
      toast({ title: 'Verification failed', description: error.response?.data?.error, status: 'error' });
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
          <Heading size="md">Verify Patient: {patient.first_name} {patient.last_name}</Heading>
        </HStack>

        <VStack spacing={4} align="stretch" maxW="600px">
          <Box p={4} bg="blue.50" borderRadius="md">
            <Text fontSize="sm" color="gray.600">
              Please verify and update the patient's contact information.
            </Text>
          </Box>

          <FormControl>
            <FormLabel>Phone Number</FormLabel>
            <Input 
              value={formData.phone_number} 
              onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })} 
            />
          </FormControl>
          <FormControl>
            <FormLabel>Address</FormLabel>
            <Input 
              value={formData.address} 
              onChange={(e) => setFormData({ ...formData, address: e.target.value })} 
            />
          </FormControl>
          <FormControl>
            <FormLabel>Emergency Contact Name</FormLabel>
            <Input 
              value={formData.emergency_contact_name} 
              onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })} 
            />
          </FormControl>
          <FormControl>
            <FormLabel>Emergency Contact Phone</FormLabel>
            <Input 
              value={formData.emergency_contact_phone} 
              onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })} 
            />
          </FormControl>
          
          <HStack mt={4}>
            <Button variant="ghost" onClick={() => navigate('/reception/search')}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleSubmit} isLoading={loading}>
              Verify & Update
            </Button>
          </HStack>
        </VStack>
      </Box>
    </ModuleLayout>
  );
}







