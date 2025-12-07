import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Heading, Text, Button, FormControl, FormLabel, Textarea, Select, VStack, HStack,
  Alert, AlertIcon, useToast, Spinner, Center
} from '@chakra-ui/react';
import { ArrowBackIcon } from '@chakra-ui/icons';
import api from '../../../services/api';
import ModuleLayout from '../../../components/shared/ModuleLayout';
import { FaUserNurse } from 'react-icons/fa';

export default function AcceptAdmissionView() {
  const { admissionId } = useParams();
  const navigate = useNavigate();
  const [admission, setAdmission] = useState(null);
  const [beds, setBeds] = useState([]);
  const [selectedBed, setSelectedBed] = useState('');
  const [nurseNotes, setNurseNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const toast = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const admissionRes = await api.get(`/admission/${admissionId}`);
        setAdmission(admissionRes.data);
        
        // Fetch beds for the ward
        if (admissionRes.data.ward_id) {
          const bedsRes = await api.get(`/admission/wards/${admissionRes.data.ward_id}/beds`);
          const available = bedsRes.data.filter(bed => bed.status === 'Available');
          setBeds(available);
        }
      } catch (error) {
        toast({ title: 'Failed to load data', status: 'error' });
        navigate('/nurse/admissions');
      } finally {
        setFetching(false);
      }
    };
    if (admissionId) {
      fetchData();
    }
  }, [admissionId, navigate, toast]);

  const handleAccept = async () => {
    if (!selectedBed) {
      toast({ title: 'Please select a bed', status: 'warning' });
      return;
    }

    setLoading(true);
    try {
      await api.patch(`/admission/${admissionId}/accept`, {
        bed_id: parseInt(selectedBed),
        nurse_notes: nurseNotes
      });
      toast({ title: 'Patient admitted successfully', status: 'success' });
      navigate('/nurse/admissions');
    } catch (error) {
      toast({ title: 'Failed to admit patient', status: 'error' });
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
          <Heading size="md">Assign Bed to Patient</Heading>
        </HStack>

        <VStack spacing={4} align="stretch" maxW="600px">
          <Box p={3} bg="blue.50" borderRadius="md">
            <Text fontWeight="bold">
              {admission.patient?.first_name} {admission.patient?.last_name}
            </Text>
            <Text fontSize="sm">Ward: {admission.ward?.ward_name}</Text>
          </Box>

          <FormControl isRequired>
            <FormLabel>Available Beds</FormLabel>
            {beds.length === 0 ? (
              <Alert status="error" borderRadius="md">
                <AlertIcon />
                No beds available in this ward
              </Alert>
            ) : (
              <Select 
                placeholder="Select a bed" 
                value={selectedBed}
                onChange={(e) => setSelectedBed(e.target.value)}
              >
                {beds.map(bed => (
                  <option key={bed.bed_id} value={bed.bed_id}>
                    Bed {bed.bed_number}
                  </option>
                ))}
              </Select>
            )}
          </FormControl>

          <FormControl>
            <FormLabel>Initial Nurse Notes</FormLabel>
            <Textarea 
              value={nurseNotes}
              onChange={(e) => setNurseNotes(e.target.value)}
              placeholder="Initial observations, patient condition on arrival..."
            />
          </FormControl>

          <HStack mt={4}>
            <Button variant="ghost" onClick={() => navigate('/nurse/admissions')}>
              Cancel
            </Button>
            <Button 
              colorScheme="green" 
              onClick={handleAccept}
              isLoading={loading}
              isDisabled={beds.length === 0}
            >
              Confirm Admission
            </Button>
          </HStack>
        </VStack>
      </Box>
    </ModuleLayout>
  );
}

