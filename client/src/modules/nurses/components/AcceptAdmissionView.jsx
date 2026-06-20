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
  const [wards, setWards] = useState([]);
  const [selectedWard, setSelectedWard] = useState('');
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
        
        // Fetch all available wards
        const wardsRes = await api.get('/admission/wards');
        
        if (wardsRes.data.length === 0) {
          toast({ 
            title: 'No wards available', 
            description: 'Please create wards in Ward Configuration',
            status: 'warning',
            duration: 6000
          });
        }
        
        setWards(wardsRes.data);
        
        // If admission already has a ward_id assigned, use it
        if (admissionRes.data.ward_id) {
          setSelectedWard(admissionRes.data.ward_id.toString());
          const bedsRes = await api.get(`/admission/wards/${admissionRes.data.ward_id}/beds`);
          const available = bedsRes.data.filter(bed => bed.status === 'Available');
          setBeds(available);
        } else {
          // Try to extract doctor's ward preference from admission_reason
          const admissionReason = admissionRes.data.admission_reason || '';
          const preferenceMatch = admissionReason.match(/Ward Preference:\s*([^\n]+)/i) ||
                                  admissionReason.match(/Preferred Ward:\s*([^\n]+)/i);
          
          if (preferenceMatch && wardsRes.data.length > 0) {
            const preferredWardName = preferenceMatch[1].trim();
            const matchingWard = wardsRes.data.find(w => 
              w.ward_name.toLowerCase() === preferredWardName.toLowerCase()
            );
            
            if (matchingWard) {
              // Auto-select the doctor's preferred ward
              setSelectedWard(matchingWard.ward_id.toString());
              const bedsRes = await api.get(`/admission/wards/${matchingWard.ward_id}/beds`);
              const available = bedsRes.data.filter(bed => bed.status === 'Available');
              setBeds(available);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load admission data:', error);
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

  // Fetch beds when ward is selected
  const handleWardChange = async (wardId) => {
    setSelectedWard(wardId);
    setSelectedBed(''); // Reset bed selection
    
    if (!wardId) {
      setBeds([]);
      return;
    }
    
    try {
      const bedsRes = await api.get(`/admission/wards/${wardId}/beds`);
      const available = bedsRes.data.filter(bed => bed.status === 'Available');
      setBeds(available);
    } catch (error) {
      console.error('Failed to fetch beds:', error);
      toast({ title: 'Failed to load beds', status: 'error' });
      setBeds([]);
    }
  };

  const handleAccept = async () => {
    if (!selectedWard) {
      toast({ title: 'Please select a ward', status: 'warning' });
      return;
    }
    
    if (!selectedBed) {
      toast({ title: 'Please select a bed', status: 'warning' });
      return;
    }

    setLoading(true);
    try {
      await api.patch(`/admission/${admissionId}/accept`, {
        ward_id: parseInt(selectedWard),
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
            <Text fontSize="sm" color="gray.600" mt={1}>
              {admission.admission_reason}
            </Text>
          </Box>

          <FormControl isRequired>
            <FormLabel>Select Ward</FormLabel>
            <Select 
              placeholder="Choose a ward" 
              value={selectedWard}
              onChange={(e) => handleWardChange(e.target.value)}
            >
              {wards.map(ward => (
                <option key={ward.ward_id} value={ward.ward_id}>
                  {ward.ward_name} ({ward.available_beds}/{ward.total_beds} beds available)
                </option>
              ))}
            </Select>
          </FormControl>

          <FormControl isRequired>
            <FormLabel>Available Beds</FormLabel>
            {!selectedWard ? (
              <Alert status="info" borderRadius="md">
                <AlertIcon />
                Please select a ward first
              </Alert>
            ) : beds.length === 0 ? (
              <Alert status="warning" borderRadius="md">
                <AlertIcon />
                No beds available in this ward. Please select another ward.
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
              isDisabled={!selectedWard || !selectedBed}
            >
              Confirm Admission
            </Button>
          </HStack>
        </VStack>
      </Box>
    </ModuleLayout>
  );
}

