import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Heading, Text, Button, FormControl, FormLabel, Textarea, Select, Input, VStack, HStack,
  SimpleGrid, useToast, Spinner, Center
} from '@chakra-ui/react';
import { ArrowBackIcon } from '@chakra-ui/icons';
import api from '../../../services/api';
import ModuleLayout from '../../../components/shared/ModuleLayout';
import { FaUserNurse } from 'react-icons/fa';

export default function AddNoteView() {
  const { admissionId } = useParams();
  const navigate = useNavigate();
  const [admission, setAdmission] = useState(null);
  const [noteType, setNoteType] = useState('Observation');
  const [noteContent, setNoteContent] = useState('');
  const [vitals, setVitals] = useState({});
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
        navigate('/nurse/ward');
      } finally {
        setFetching(false);
      }
    };
    if (admissionId) {
      fetchAdmission();
    }
  }, [admissionId, navigate, toast]);

  const handleAddNote = async () => {
    if (!noteContent.trim()) {
      toast({ title: 'Please enter note content', status: 'warning' });
      return;
    }

    setLoading(true);
    try {
      await api.post(`/admission/${admissionId}/notes`, {
        note_type: noteType,
        content: noteContent,
        vitals: noteType === 'Vitals' ? vitals : null
      });
      toast({ title: 'Note added', status: 'success' });
      navigate('/nurse/ward');
    } catch (error) {
      toast({ title: 'Failed to add note', status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
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
          <Heading size="md">Add Note: {admission.patient?.first_name} {admission.patient?.last_name}</Heading>
        </HStack>

        <VStack spacing={4} align="stretch" maxW="600px">
          <FormControl>
            <FormLabel>Note Type</FormLabel>
            <Select value={noteType} onChange={(e) => setNoteType(e.target.value)}>
              <option value="Observation">Observation</option>
              <option value="Vitals">Vitals Check</option>
              <option value="Medication">Medication Admin</option>
              <option value="Progress">Progress Note</option>
            </Select>
          </FormControl>

          {noteType === 'Vitals' && (
            <SimpleGrid columns={2} spacing={3} w="full">
              <FormControl>
                <FormLabel size="sm">Systolic BP</FormLabel>
                <Input 
                  type="number" 
                  size="sm"
                  value={vitals.systolic_bp || ''}
                  onChange={(e) => setVitals({...vitals, systolic_bp: parseInt(e.target.value)})}
                />
              </FormControl>
              <FormControl>
                <FormLabel size="sm">Diastolic BP</FormLabel>
                <Input 
                  type="number" 
                  size="sm"
                  value={vitals.diastolic_bp || ''}
                  onChange={(e) => setVitals({...vitals, diastolic_bp: parseInt(e.target.value)})}
                />
              </FormControl>
              <FormControl>
                <FormLabel size="sm">Heart Rate</FormLabel>
                <Input 
                  type="number" 
                  size="sm"
                  value={vitals.heart_rate || ''}
                  onChange={(e) => setVitals({...vitals, heart_rate: parseInt(e.target.value)})}
                />
              </FormControl>
              <FormControl>
                <FormLabel size="sm">Temperature °C</FormLabel>
                <Input 
                  type="number" 
                  step="0.1"
                  size="sm"
                  value={vitals.temperature || ''}
                  onChange={(e) => setVitals({...vitals, temperature: parseFloat(e.target.value)})}
                />
              </FormControl>
            </SimpleGrid>
          )}

          <FormControl>
            <FormLabel>Notes</FormLabel>
            <Textarea 
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Enter your observations..."
              rows={4}
            />
          </FormControl>

          <HStack mt={4}>
            <Button variant="ghost" onClick={() => navigate('/nurse/ward')}>
              Cancel
            </Button>
            <Button colorScheme="purple" onClick={handleAddNote} isLoading={loading}>
              Save Note
            </Button>
          </HStack>
        </VStack>
      </Box>
    </ModuleLayout>
  );
}






