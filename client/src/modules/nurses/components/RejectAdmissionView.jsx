import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Heading, Text, Button, FormControl, FormLabel, Textarea, VStack, HStack,
  useToast, Spinner, Center
} from '@chakra-ui/react';
import { ArrowBackIcon } from '@chakra-ui/icons';
import api from '../../../services/api';
import ModuleLayout from '../../../components/shared/ModuleLayout';
import { FaUserNurse } from 'react-icons/fa';

export default function RejectAdmissionView() {
  const { admissionId } = useParams();
  const navigate = useNavigate();
  const [admission, setAdmission] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const toast = useToast();

  useEffect(() => {
    const fetchAdmission = async () => {
      try {
        const res = await api.get(`/admission/${admissionId}`);
        setAdmission(res.data);
      } catch (error) {
        toast({ title: 'Failed to load admission', status: 'error' });
        navigate('/nurse/admissions');
      } finally {
        setFetching(false);
      }
    };
    if (admissionId) {
      fetchAdmission();
    }
  }, [admissionId, navigate, toast]);

  const handleReject = async () => {
    setLoading(true);
    try {
      await api.patch(`/admission/${admissionId}/reject`, {
        reason: rejectReason || 'No bed available'
      });
      toast({ title: 'Admission rejected', status: 'warning' });
      navigate('/nurse/admissions');
    } catch (error) {
      toast({ title: 'Failed to reject admission', status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <ModuleLayout
        activeTab="admissions"
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
      activeTab="admissions"
      setActiveTab={(tab) => navigate(`/nurse/${tab}`)}
      navItems={[]}
      title="Nurse Station"
      color="purple"
      moduleIcon={FaUserNurse}
    >
      <Box bg="white" p={6} borderRadius="lg" boxShadow="sm">
        <HStack mb={6}>
          <Button leftIcon={<ArrowBackIcon />} variant="ghost" onClick={() => navigate('/nurse/admissions')}>
            Back
          </Button>
          <Heading size="md">Reject Admission Request</Heading>
        </HStack>

        <VStack spacing={4} align="stretch" maxW="600px">
          <Box p={3} bg="red.50" borderRadius="md">
            <Text fontWeight="bold">
              {admission.patient?.first_name} {admission.patient?.last_name}
            </Text>
            <Text fontSize="sm">Ward: {admission.ward?.ward_name}</Text>
          </Box>

          <FormControl>
            <FormLabel>Reason for Rejection</FormLabel>
            <Textarea 
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g., No beds available, patient needs higher level of care..."
              rows={4}
            />
          </FormControl>

          <HStack mt={4}>
            <Button variant="ghost" onClick={() => navigate('/nurse/admissions')}>
              Cancel
            </Button>
            <Button 
              colorScheme="red" 
              onClick={handleReject}
              isLoading={loading}
            >
              Confirm Rejection
            </Button>
          </HStack>
        </VStack>
      </Box>
    </ModuleLayout>
  );
}






