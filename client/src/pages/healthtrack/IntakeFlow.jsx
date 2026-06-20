import React, { useState } from 'react';
import { Box, Button, Container, Heading, Text, VStack, HStack, Input, Select, Checkbox, useToast } from '@chakra-ui/react';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';

export default function IntakeFlow() {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({
    phone_number: '',
    area: '',
    symptom: '',
    severity: 'low',
    language: 'en',
    consent_sms: false
  });
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => Math.max(0, s - 1));

  const handleSubmit = async () => {
    if (!formData.consent_sms) {
      toast({ title: 'Consent required', description: 'You must consent to SMS to proceed.', status: 'error' });
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/community/intake', formData);
      toast({ title: 'Report Submitted', description: 'A nurse will review your case.', status: 'success' });
      // In a real app, the SMS link takes them to chat, but we can also redirect them directly for the demo
      window.location.href = res.data.webLink;
    } catch (err) {
      toast({ title: 'Submission Failed', status: 'error' });
      setLoading(false);
    }
  };

  return (
    <Box minH="100vh" bg="gray.50" py={12}>
      <Container maxW="container.sm">
        <Box bg="white" p={8} borderRadius="xl" shadow="md">
          <VStack spacing={6} align="stretch">
            <Heading size="lg" textAlign="center" color="blue.700">HealthTrack Intake</Heading>

            {step === 0 && (
              <VStack spacing={4}>
                <Text>Please enter your phone number to start.</Text>
                <Input
                  name="phone_number"
                  placeholder="+232..."
                  value={formData.phone_number}
                  onChange={handleChange}
                  size="lg"
                />
                <Button colorScheme="blue" w="full" onClick={nextStep} isDisabled={!formData.phone_number}>
                  Next
                </Button>
              </VStack>
            )}

            {step === 1 && (
              <VStack spacing={4}>
                <Text>What area do you live in?</Text>
                <Input
                  name="area"
                  placeholder="e.g. Bo Town, Mokonde"
                  value={formData.area}
                  onChange={handleChange}
                  size="lg"
                />
                <HStack w="full" spacing={4}>
                  <Button flex={1} onClick={prevStep}>Back</Button>
                  <Button colorScheme="blue" flex={1} onClick={nextStep} isDisabled={!formData.area}>Next</Button>
                </HStack>
              </VStack>
            )}

            {step === 2 && (
              <VStack spacing={4}>
                <Text>What is your main symptom?</Text>
                <Select name="symptom" value={formData.symptom} onChange={handleChange} size="lg">
                  <option value="">Select symptom...</option>
                  <option value="Fever">Fever</option>
                  <option value="Cough">Cough</option>
                  <option value="Bleeding">Bleeding</option>
                  <option value="Pain">Pain</option>
                  <option value="Other">Other</option>
                </Select>
                <HStack w="full" spacing={4}>
                  <Button flex={1} onClick={prevStep}>Back</Button>
                  <Button colorScheme="blue" flex={1} onClick={nextStep} isDisabled={!formData.symptom}>Next</Button>
                </HStack>
              </VStack>
            )}

            {step === 3 && (
              <VStack spacing={4}>
                <Text>How severe is it?</Text>
                <Select name="severity" value={formData.severity} onChange={handleChange} size="lg">
                  <option value="low">Mild</option>
                  <option value="medium">Moderate</option>
                  <option value="high">Severe</option>
                  <option value="urgent">Emergency</option>
                </Select>
                <HStack w="full" spacing={4}>
                  <Button flex={1} onClick={prevStep}>Back</Button>
                  <Button colorScheme="blue" flex={1} onClick={nextStep}>Next</Button>
                </HStack>
              </VStack>
            )}

            {step === 4 && (
              <VStack spacing={4}>
                <Text>We will contact you via SMS.</Text>
                <Checkbox
                  name="consent_sms"
                  isChecked={formData.consent_sms}
                  onChange={handleChange}
                  colorScheme="blue"
                >
                  I agree to receive text messages for health follow-up.
                </Checkbox>
                <HStack w="full" spacing={4}>
                  <Button flex={1} onClick={prevStep} isDisabled={loading}>Back</Button>
                  <Button colorScheme="green" flex={1} onClick={handleSubmit} isLoading={loading}>
                    Submit Report
                  </Button>
                </HStack>
              </VStack>
            )}

          </VStack>
        </Box>
      </Container>
    </Box>
  );
}
