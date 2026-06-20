import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Heading, Text, Button, VStack, HStack, Alert, AlertIcon, useToast,
  Spinner, Center
} from '@chakra-ui/react';
import { ArrowBackIcon } from '@chakra-ui/icons';
import api from '../../../services/api';
import ModuleLayout from '../../../components/shared/ModuleLayout';
import { FaUserNurse } from 'react-icons/fa';

export default function ConfirmDischargeView() {
  const { admissionId } = useParams();
  const navigate = useNavigate();
  const [admission, setAdmission] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const toast = useToast();

  useEffect(() => {
    const fetchAdmission = async () => {
      try {
        const res = await api.get(`/admission/${admissionId}`);
        setAdmission(res.data);
      } catch (error) {
        toast({ title: 'Failed to load discharge details', status: 'error' });
        navigate('/nurse/discharge');
      } finally {
        setFetching(false);
      }
    };
    if (admissionId) {
      fetchAdmission();
    }
  }, [admissionId, navigate, toast]);

  const handleConfirmDischarge = async () => {
    setLoading(true);
    try {
      await api.patch(`/admission/${admissionId}/confirm-discharge`);
      toast({ title: 'Patient discharged successfully. Bed is now available.', status: 'success' });
      navigate('/nurse/discharge');
    } catch (error) {
      toast({ title: 'Failed to confirm discharge', status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <ModuleLayout
        activeTab="discharge"
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
      activeTab="discharge"
      setActiveTab={(tab) => navigate(`/nurse/${tab}`)}
      navItems={[]}
      title="Nurse Station"
      color="purple"
      moduleIcon={FaUserNurse}
    >
      <Box bg="white" p={6} borderRadius="lg" boxShadow="sm">
        <HStack mb={6}>
          <Button leftIcon={<ArrowBackIcon />} variant="ghost" onClick={() => navigate('/nurse/discharge')}>
            Back
          </Button>
          <Heading size="md">Confirm Patient Discharge</Heading>
        </HStack>

        <VStack spacing={4} align="stretch" maxW="600px">
          <Box p={3} bg="blue.50" borderRadius="md">
            <Text fontWeight="bold">
              {admission.patient?.first_name} {admission.patient?.last_name}
            </Text>
            <Text fontSize="sm">
              {admission.ward?.ward_name} - Bed {admission.bed?.bed_number}
            </Text>
          </Box>

          <Alert status="info" borderRadius="md">
            <AlertIcon />
            <Box>
              <Text fontWeight="bold">This will:</Text>
              <Text fontSize="sm">• Mark patient as Discharged</Text>
              <Text fontSize="sm">• Free up Bed {admission.bed?.bed_number}</Text>
              {admission.follow_up_date && (
                <Text fontSize="sm">• Create follow-up appointment</Text>
              )}
            </Box>
          </Alert>

          <Text fontSize="sm" color="gray.600">
            Please ensure the patient has received their discharge instructions and medications.
          </Text>

          <HStack mt={4}>
            <Button variant="ghost" onClick={() => navigate('/nurse/discharge')}>
              Cancel
            </Button>
            <Button 
              colorScheme="green" 
              onClick={handleConfirmDischarge}
              isLoading={loading}
            >
              Confirm Discharge
            </Button>
          </HStack>
        </VStack>
      </Box>
    </ModuleLayout>
  );
}







