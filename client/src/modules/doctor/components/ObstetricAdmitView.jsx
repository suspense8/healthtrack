import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, VStack, HStack, Heading, FormControl, FormLabel, Select, Textarea,
  Button, useToast, SimpleGrid, Card, CardBody, Text, Badge, Divider, Radio, RadioGroup, Stack
} from '@chakra-ui/react';
import { ArrowBackIcon } from '@chakra-ui/icons';
import { FaHeartbeat } from 'react-icons/fa';
import api from '../../../services/api';

export default function ObstetricAdmitView() {
  const { visitId } = useParams();
  const navigate = useNavigate();
  const [visit, setVisit] = useState(null);
  const [obstetricVisit, setObstetricVisit] = useState(null);
  const [wards, setWards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingWards, setLoadingWards] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const [formData, setFormData] = useState({
    management_decision: 'IMMEDIATE_DELIVERY',
    ward_type: '',
    admission_notes: '',
    delivery_plan: 'SVD'
  });

  useEffect(() => {
    fetchVisitData();
    fetchWards();
  }, [visitId]);

  const fetchWards = async () => {
    try {
      const res = await api.get('/nurses/wards');
      // Filter for maternity-related and emergency wards
      const suitableWards = res.data.filter(w =>
        w.ward_type === 'Maternity' ||
        w.ward_type === 'Emergency' ||
        w.ward_name.toLowerCase().includes('labor') ||
        w.ward_name.toLowerCase().includes('maternity')
      );
      setWards(suitableWards);

      // Set default ward if available
      if (suitableWards.length > 0 && !formData.ward_type) {
        setFormData(prev => ({ ...prev, ward_type: suitableWards[0].ward_name }));
      }
    } catch (error) {
      console.error('Failed to fetch wards:', error);
      toast({
        title: 'Warning',
        description: 'Could not load ward options. Please refresh the page.',
        status: 'warning',
        duration: 5000
      });
    } finally {
      setLoadingWards(false);
    }
  };

  const fetchVisitData = async () => {
    try {
      const res = await api.get(`/doctor/visits/${visitId}`);
      setVisit(res.data);
      setObstetricVisit(res.data.obstetric_visit);
    } catch (error) {
      console.error('Failed to fetch visit:', error);
      toast({
        title: 'Error loading visit',
        status: 'error',
        duration: 5000
      });
      navigate('/doctor/consultation');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // 1. Submit consultation (minimal for obstetric case)
      await api.post('/doctor/consultation', {
        visit_id: parseInt(visitId),
        symptoms: obstetricVisit?.maternal_distress ? 'Maternal distress' : (visit?.emergency_subtype || 'Labor'),
        physical_exam: `G${obstetricVisit?.gravida}P${obstetricVisit?.para}, ${obstetricVisit?.gestational_age_weeks}w, FHR ${obstetricVisit?.fetal_heart_rate}, Dilation: ${obstetricVisit?.cervical_dilation_cm}cm`,
        diagnosis: `${visit?.emergency_subtype || 'Labor'} - Emergency Obstetric`,
        doctor_notes: formData.admission_notes,
        disposition: 'Admitted',
        prescriptions: [],
        lab_orders: []
      });

      // 2. Create admission request - nurse will assign ward and bed
      const wardPreference = formData.ward_type || 'Maternity Ward';
      await api.post('/admission/request', {
        patient_id: visit.patient.patient_id,
        visit_id: parseInt(visitId),
        ward_id: null, // Nurse will assign the ward
        priority: visit.triage_level === 'Red' ? 'Critical' : 'Normal',
        admission_reason: `Emergency ${visit?.emergency_subtype || 'Labor'} - ${formData.delivery_plan}\n\nObstetric Details:\nG${obstetricVisit?.gravida}P${obstetricVisit?.para}, ${obstetricVisit?.gestational_age_weeks}w\nFHR: ${obstetricVisit?.fetal_heart_rate}, Dilation: ${obstetricVisit?.cervical_dilation_cm}cm\n\nDoctor's Ward Preference: ${wardPreference}\n\nNote: Nurse should assign to available Maternity/Labor ward`,
        initial_orders: formData.admission_notes
      });

      toast({
        title: 'Patient admitted',
        description: 'Admission request sent to nursing station',
        status: 'success',
        duration: 3000
      });

      // Navigate to admitted patients
      navigate('/doctor/admitted');

    } catch (error) {
      console.error('Admission error:', error);
      toast({
        title: 'Admission failed',
        description: error.response?.data?.error || 'Please try again',
        status: 'error',
        duration: 5000
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Box>Loading...</Box>;
  }

  if (!visit || !obstetricVisit) {
    return <Box>Visit not found</Box>;
  }

  return (
    <Box bg="white" p={6} borderRadius="lg" boxShadow="sm">
      <HStack justify="space-between" mb={6}>
        <HStack>
          <Button
            leftIcon={<ArrowBackIcon />}
            variant="ghost"
            onClick={() => navigate('/doctor/consultation')}
          >
            Back to Queue
          </Button>
          <Heading size="md">
            Obstetric Admission: {visit.patient.first_name} {visit.patient.last_name}
          </Heading>
        </HStack>
        <Badge colorScheme="red" fontSize="lg" p={2}>
          <FaHeartbeat /> {visit?.emergency_subtype || 'EMERGENCY'}
        </Badge>
      </HStack>

      {/* Patient Summary */}
      <Card mb={4} bg="blue.50">
        <CardBody>
          <SimpleGrid columns={4} spacing={4}>
            <Box>
              <Text fontSize="sm" color="gray.600">Age</Text>
              <Text fontWeight="bold">
                {visit.patient.date_of_birth
                  ? new Date().getFullYear() - new Date(visit.patient.date_of_birth).getFullYear()
                  : '?'}
              </Text>
            </Box>
            <Box>
              <Text fontSize="sm" color="gray.600">G/P</Text>
              <Text fontWeight="bold">
                G{obstetricVisit.gravida || '?'} P{obstetricVisit.para || '?'}
              </Text>
            </Box>
            <Box>
              <Text fontSize="sm" color="gray.600">Gestational Age</Text>
              <Text fontWeight="bold">{obstetricVisit.gestational_age_weeks || '?'} weeks</Text>
            </Box>
            <Box>
              <Text fontSize="sm" color="gray.600">Previous C-Section</Text>
              <Text fontWeight="bold">{obstetricVisit.previous_csection ? 'Yes' : 'No'}</Text>
            </Box>
          </SimpleGrid>
        </CardBody>
      </Card>

      {/* Triage Summary */}
      <Card mb={4} bg="purple.50">
        <CardBody>
          <Heading size="sm" mb={3}>Triage Summary</Heading>
          <SimpleGrid columns={3} spacing={4}>
            <Box>
              <Text fontSize="sm" color="gray.600">BP</Text>
              <Text fontWeight="bold">
                {visit.systolic_bp}/{visit.diastolic_bp} mmHg
              </Text>
            </Box>
            <Box>
              <Text fontSize="sm" color="gray.600">Fetal Heart Rate</Text>
              <Badge
                colorScheme={
                  obstetricVisit.fetal_heart_rate < 110 || obstetricVisit.fetal_heart_rate > 160
                    ? 'red'
                    : 'green'
                }
                fontSize="md"
              >
                {obstetricVisit.fetal_heart_rate || '?'} bpm
              </Badge>
            </Box>
            <Box>
              <Text fontSize="sm" color="gray.600">Cervical Dilation</Text>
              <Text fontWeight="bold">{obstetricVisit.cervical_dilation_cm || '?'} cm</Text>
            </Box>
            <Box>
              <Text fontSize="sm" color="gray.600">Contractions</Text>
              <Text fontWeight="bold">{obstetricVisit.contraction_frequency || 'Unknown'}</Text>
            </Box>
            <Box>
              <Text fontSize="sm" color="gray.600">Bleeding</Text>
              <Text fontWeight="bold">{obstetricVisit.bleeding_severity || 'Unknown'}</Text>
            </Box>
            <Box>
              <Text fontSize="sm" color="gray.600">Presentation</Text>
              <Text fontWeight="bold">{obstetricVisit.fetal_presentation || 'Unknown'}</Text>
            </Box>
          </SimpleGrid>
        </CardBody>
      </Card>

      <Divider my={6} />

      {/* Admission Form */}
      <form onSubmit={handleSubmit}>
        <VStack spacing={5} align="stretch">
          <Heading size="sm">Admission Details</Heading>

          <FormControl>
            <FormLabel>Ward Preference (Optional)</FormLabel>
            <Select
              name="ward_type"
              value={formData.ward_type}
              onChange={handleChange}
              isDisabled={loadingWards}
            >
              <option value="">Nurse will assign based on availability</option>
              {loadingWards ? (
                <option>Loading wards...</option>
              ) : wards.length === 0 ? null : (
                wards.map(ward => (
                  <option key={ward.ward_id} value={ward.ward_name}>
                    {ward.ward_name} ({ward.available_beds}/{ward.total_beds} beds available)
                  </option>
                ))
              )}
            </Select>
            <Text fontSize="xs" color="gray.600" mt={1}>
              The nurse will assign to an available maternity ward and select the bed
            </Text>
          </FormControl>

          <FormControl isRequired>
            <FormLabel>Delivery Plan</FormLabel>
            <RadioGroup
              value={formData.delivery_plan}
              onChange={(val) => setFormData(prev => ({ ...prev, delivery_plan: val }))}
            >
              <Stack direction="column" spacing={2}>
                <Radio value="SVD">Spontaneous Vaginal Delivery (SVD)</Radio>
                <Radio value="Assisted">Assisted Delivery</Radio>
                <Radio value="C-Section">Cesarean Section</Radio>
                <Radio value="Monitor">Monitor First</Radio>
              </Stack>
            </RadioGroup>
          </FormControl>

          <FormControl isRequired>
            <FormLabel>Admission Notes</FormLabel>
            <Textarea
              name="admission_notes"
              value={formData.admission_notes}
              onChange={handleChange}
              placeholder="Clinical findings, plan of care, special instructions..."
              rows={4}
            />
          </FormControl>

          {/* Action Buttons */}
          <HStack justify="flex-end" pt={4}>
            <Button
              variant="ghost"
              onClick={() => navigate('/doctor/consultation')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              colorScheme="pink"
              size="lg"
              isLoading={submitting}
              loadingText="Admitting..."
              leftIcon={<FaHeartbeat />}
            >
              Admit to Maternity Ward
            </Button>
          </HStack>
        </VStack>
      </form>
    </Box>
  );
}
