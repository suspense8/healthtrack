import { useState } from 'react';
import {
  Box, VStack, HStack, Heading, FormControl, FormLabel, Input, Select, Textarea,
  Button, NumberInput, NumberInputField, useToast, SimpleGrid, Radio, RadioGroup,
  Stack, Alert, AlertIcon, Badge, Text, Divider, Card, CardBody
} from '@chakra-ui/react';
import { ArrowBackIcon } from '@chakra-ui/icons';
import { FaHeartbeat, FaExclamationTriangle } from 'react-icons/fa';
import ValidatedInput from '../../../components/shared/ValidatedInput';
import api from '../../../services/api';

export default function ObstetricTriageView({ visit, onBack, onComplete, taskId }) {
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const [formData, setFormData] = useState({
    // Standard Vitals
    systolic_bp: '',
    diastolic_bp: '',
    heart_rate: '',
    temperature: '',
    oxygen_saturation: '',
    weight: '',

    // Obstetric Assessment
    contraction_frequency: '',
    membranes_ruptured: false,
    rupture_time: '',
    bleeding_severity: 'None',
    cervical_dilation_cm: '',
    fetal_heart_rate: '',
    fetal_presentation: 'Cephalic',
    maternal_distress: false,
    fetal_distress: false,

    // Nurse Notes
    nurse_notes: ''
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const getCriticalAlerts = () => {
    const alerts = [];
    
    if (formData.systolic_bp > 160 || formData.diastolic_bp > 110) {
      alerts.push({ type: 'severe_bp', message: 'Severe Hypertension - Preeclampsia Risk!', level: 'critical' });
    } else if (formData.systolic_bp > 140 || formData.diastolic_bp > 90) {
      alerts.push({ type: 'high_bp', message: 'Hypertension Detected', level: 'warning' });
    }

    if (formData.fetal_heart_rate < 110) {
      alerts.push({ type: 'fetal_brady', message: 'Fetal Bradycardia - Immediate Doctor Review!', level: 'critical' });
    } else if (formData.fetal_heart_rate > 160) {
      alerts.push({ type: 'fetal_tachy', message: 'Fetal Tachycardia - Monitor Closely', level: 'critical' });
    }

    if (formData.bleeding_severity === 'Heavy') {
      alerts.push({ type: 'heavy_bleeding', message: 'Heavy Bleeding - Possible Abruption/Previa!', level: 'critical' });
    }

    return alerts;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const alerts = getCriticalAlerts();

    try {
      const payload = {
        vitals: {
          systolic_bp: parseInt(formData.systolic_bp),
          diastolic_bp: parseInt(formData.diastolic_bp),
          heart_rate: parseInt(formData.heart_rate),
          temperature: parseFloat(formData.temperature),
          oxygen_saturation: parseInt(formData.oxygen_saturation),
          weight: parseFloat(formData.weight)
        },
        obstetric_assessment: {
          contraction_frequency: formData.contraction_frequency,
          membranes_ruptured: formData.membranes_ruptured,
          rupture_time: formData.rupture_time || null,
          bleeding_severity: formData.bleeding_severity,
          cervical_dilation_cm: parseInt(formData.cervical_dilation_cm) || null,
          fetal_heart_rate: parseInt(formData.fetal_heart_rate) || null,
          fetal_presentation: formData.fetal_presentation,
          maternal_distress: formData.maternal_distress,
          fetal_distress: formData.fetal_distress
        },
        nurse_notes: formData.nurse_notes,
        task_id: taskId
      };

      const res = await api.post(`/nurses/obstetric-triage/${visit.visit_id}`, payload);

      toast({
        title: 'Triage completed',
        description: `Risk Level: ${res.data.risk_level.toUpperCase()} - Doctor notified`,
        status: res.data.risk_level === 'high' ? 'warning' : 'success',
        duration: 5000
      });

      if (onComplete) {
        onComplete(res.data);
      }

    } catch (error) {
      console.error('Triage error:', error);
      toast({
        title: 'Triage failed',
        description: error.response?.data?.error || 'Please try again',
        status: 'error',
        duration: 5000
      });
    } finally {
      setLoading(false);
    }
  };

  const alerts = getCriticalAlerts();

  return (
    <Box bg="white" p={6} borderRadius="lg" boxShadow="sm">
      <HStack justify="space-between" mb={6}>
        <HStack>
          <Button leftIcon={<ArrowBackIcon />} variant="ghost" onClick={onBack}>
            Back
          </Button>
          <Heading size="md">
            Obstetric Triage: {visit?.patient?.first_name} {visit?.patient?.last_name}
          </Heading>
        </HStack>
        <Badge colorScheme="purple" fontSize="lg" p={2}>
          {visit?.obstetric_visit?.gestational_age_weeks || '?'} Weeks
        </Badge>
      </HStack>

      {/* Obstetric History Summary */}
      <Card mb={4} bg="pink.50">
        <CardBody>
          <HStack spacing={8}>
            <Text><strong>G:</strong> {visit?.obstetric_visit?.gravida || '?'}</Text>
            <Text><strong>P:</strong> {visit?.obstetric_visit?.para || '?'}</Text>
            <Text><strong>Previous C-Section:</strong> {visit?.obstetric_visit?.previous_csection ? 'Yes' : 'No'}</Text>
            <Text><strong>Complaint:</strong> {visit?.visit_reason}</Text>
          </HStack>
        </CardBody>
      </Card>

      {/* Critical Alerts */}
      {alerts.length > 0 && (
        <VStack spacing={2} mb={4}>
          {alerts.map((alert, idx) => (
            <Alert key={idx} status={alert.level === 'critical' ? 'error' : 'warning'} borderRadius="md">
              <AlertIcon as={FaExclamationTriangle} />
              <Text fontWeight="bold">{alert.message}</Text>
            </Alert>
          ))}
        </VStack>
      )}

      <form onSubmit={handleSubmit}>
        <VStack spacing={6} align="stretch">
          {/* Standard Vitals */}
          <Box>
            <Heading size="sm" mb={3}>Standard Vitals</Heading>
            <SimpleGrid columns={3} spacing={4}>
              <HStack>
                <ValidatedInput
                  label="BP Systolic"
                  name="systolic_bp"
                  value={formData.systolic_bp}
                  onChange={handleChange}
                  type="number"
                  placeholder="120"
                  required
                />
                <Text mt={8}>/</Text>
                <ValidatedInput
                  label="Diastolic"
                  name="diastolic_bp"
                  value={formData.diastolic_bp}
                  onChange={handleChange}
                  type="number"
                  placeholder="80"
                  required
                />
              </HStack>
              <ValidatedInput
                label="Heart Rate (bpm)"
                name="heart_rate"
                value={formData.heart_rate}
                onChange={handleChange}
                type="number"
                placeholder="80"
                required
              />
              <ValidatedInput
                label="Temperature (°C)"
                name="temperature"
                value={formData.temperature}
                onChange={handleChange}
                type="number"
                step="0.1"
                placeholder="37.0"
                required
              />
              <ValidatedInput
                label="O2 Saturation (%)"
                name="oxygen_saturation"
                value={formData.oxygen_saturation}
                onChange={handleChange}
                type="number"
                placeholder="98"
                required
              />
              <ValidatedInput
                label="Weight (kg)"
                name="weight"
                value={formData.weight}
                onChange={handleChange}
                type="number"
                step="0.1"
                placeholder="70.0"
              />
            </SimpleGrid>
          </Box>

          <Divider />

          {/* Obstetric Assessment */}
          <Box p={4} bg="purple.50" borderRadius="md">
            <HStack mb={3}>
              <FaHeartbeat color="#805AD5" size={24} />
              <Heading size="sm">Obstetric Assessment</Heading>
            </HStack>
            <SimpleGrid columns={2} spacing={4}>
              <FormControl isRequired>
                <FormLabel>Contraction Frequency</FormLabel>
                <Select
                  name="contraction_frequency"
                  value={formData.contraction_frequency}
                  onChange={handleChange}
                  placeholder="Select frequency"
                >
                  <option value="None">No contractions</option>
                  <option value="Every 10+ minutes">Every 10+ minutes</option>
                  <option value="Every 5-10 minutes">Every 5-10 minutes</option>
                  <option value="Every 3-5 minutes">Every 3-5 minutes</option>
                  <option value="Every 2 minutes">Every 2 minutes (Active labor)</option>
                  <option value="Continuous">Continuous</option>
                </Select>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Bleeding Severity</FormLabel>
                <Select
                  name="bleeding_severity"
                  value={formData.bleeding_severity}
                  onChange={handleChange}
                >
                  <option value="None">None</option>
                  <option value="Light">Light (Spotting/Show)</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Heavy">Heavy</option>
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Cervical Dilation (cm, 0-10)</FormLabel>
                <NumberInput min={0} max={10}>
                  <NumberInputField
                    name="cervical_dilation_cm"
                    value={formData.cervical_dilation_cm}
                    onChange={handleChange}
                    placeholder="e.g., 5"
                  />
                </NumberInput>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Fetal Heart Rate (bpm)</FormLabel>
                <NumberInput min={60} max={200}>
                  <NumberInputField
                    name="fetal_heart_rate"
                    value={formData.fetal_heart_rate}
                    onChange={handleChange}
                    placeholder="120-160 normal"
                  />
                </NumberInput>
              </FormControl>

              <FormControl>
                <FormLabel>Fetal Presentation</FormLabel>
                <Select
                  name="fetal_presentation"
                  value={formData.fetal_presentation}
                  onChange={handleChange}
                >
                  <option value="Cephalic">Cephalic (Head down)</option>
                  <option value="Breech">Breech (Feet/buttocks first)</option>
                  <option value="Transverse">Transverse (Sideways)</option>
                  <option value="Unknown">Unknown</option>
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Membranes Status</FormLabel>
                <RadioGroup
                  value={formData.membranes_ruptured ? 'ruptured' : 'intact'}
                  onChange={(val) => setFormData(prev => ({ ...prev, membranes_ruptured: val === 'ruptured' }))}
                >
                  <Stack direction="row" spacing={4}>
                    <Radio value="intact">Intact</Radio>
                    <Radio value="ruptured">Ruptured (Water broke)</Radio>
                  </Stack>
                </RadioGroup>
              </FormControl>
            </SimpleGrid>
          </Box>

          {/* Nurse Notes */}
          <FormControl isRequired>
            <FormLabel>Nurse Assessment Notes</FormLabel>
            <Textarea
              name="nurse_notes"
              value={formData.nurse_notes}
              onChange={handleChange}
              placeholder="Observations, patient condition, interventions..."
              rows={4}
            />
          </FormControl>

          {/* Action Buttons */}
          <HStack justify="flex-end" pt={4}>
            <Button variant="ghost" onClick={onBack}>
              Cancel
            </Button>
            <Button
              type="submit"
              colorScheme="purple"
              size="lg"
              isLoading={loading}
              loadingText="Submitting..."
            >
              Submit & Notify Doctor
            </Button>
          </HStack>
        </VStack>
      </form>
    </Box>
  );
}
