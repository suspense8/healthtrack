import { useState, useEffect } from 'react';
import {
  Box, VStack, Heading, Text, Button, Accordion, AccordionItem, AccordionButton, AccordionPanel, AccordionIcon,
  Badge, SimpleGrid, Divider, Spinner, Center, HStack
} from '@chakra-ui/react';
import { ArrowBackIcon, CalendarIcon } from '@chakra-ui/icons';
import api from '../../../services/api';

export default function PatientHistoryView({ patient, onBack }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await api.get(`/doctor/patients/${patient.patient_id}/history`);
        setHistory(res.data);
      } catch (error) {
        console.error("Failed to fetch history", error);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [patient.patient_id]);

  if (loading) {
    return <Center h="200px"><Spinner /></Center>;
  }

  return (
    <Box>
      <Button leftIcon={<ArrowBackIcon />} variant="ghost" mb={4} onClick={onBack}>
        Back to Search
      </Button>

      <Box bg="white" p={6} borderRadius="lg" boxShadow="sm">
        <HStack justify="space-between" mb={6}>
          <Heading size="md">
            Medical History: {patient.first_name} {patient.last_name}
          </Heading>
          <Badge fontSize="0.9em" colorScheme="blue">
            ID: {patient.national_id || 'N/A'}
          </Badge>
        </HStack>

        {history.length === 0 ? (
          <Text color="gray.500" textAlign="center" py={10}>No medical history found for this patient.</Text>
        ) : (
          <Accordion allowMultiple defaultIndex={[0]}>
            {history.map((record) => (
              <AccordionItem key={record.visit_id} border="1px solid" borderColor="gray.200" borderRadius="md" mb={4}>
                <h2>
                  <AccordionButton _expanded={{ bg: 'blue.50', color: 'blue.700' }}>
                    <Box flex="1" textAlign="left">
                      <HStack>
                        <CalendarIcon mr={2} />
                        <Text fontWeight="bold">{new Date(record.visit_date).toLocaleDateString()}</Text>
                        <Badge ml={2}>{record.diagnosis || 'No Diagnosis'}</Badge>
                      </HStack>
                    </Box>
                    <AccordionIcon />
                  </AccordionButton>
                </h2>
                <AccordionPanel pb={4}>
                  <VStack align="stretch" spacing={4}>
                    <Box>
                      <Text fontWeight="bold" fontSize="sm" color="gray.600">Visit Reason</Text>
                      <Text>{record.visit_reason}</Text>
                    </Box>
                    
                    <SimpleGrid columns={2} spacing={10}>
                      <Box>
                        <Text fontWeight="bold" fontSize="sm" color="gray.600">Diagnosis</Text>
                        <Text>{record.diagnosis || 'N/A'}</Text>
                      </Box>
                      <Box>
                        <Text fontWeight="bold" fontSize="sm" color="gray.600">Treatment Plan</Text>
                        <Text>{record.treatment_plan || 'N/A'}</Text>
                      </Box>
                    </SimpleGrid>

                    {record.doctor_notes && (
                      <Box>
                        <Text fontWeight="bold" fontSize="sm" color="gray.600">Doctor Notes</Text>
                        <Text fontStyle="italic">{record.doctor_notes}</Text>
                      </Box>
                    )}

                    {/* Future: Display Prescriptions/Lab Orders list if available in the data */}
                  </VStack>
                </AccordionPanel>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </Box>
    </Box>
  );
}
