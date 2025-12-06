import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton,
  Button, Text, VStack, HStack, Badge, Divider, Box, SimpleGrid, Heading, Stat, StatLabel, StatNumber, StatHelpText
} from '@chakra-ui/react';

export default function PatientDetailModal({ isOpen, onClose, visit, onAction }) {
  if (!visit) return null;

  const { patient, queue_status, triage_level } = visit;
  
  const getTriageColor = (level) => {
    switch(level) {
      case 'Red': return 'red';
      case 'Yellow': return 'orange';
      case 'Green': return 'green';
      default: return 'gray';
    }
  };

  const isActive = ['Waiting', 'waiting_for_vitals', 'Emergency'].includes(queue_status);
  const isEditable = isActive || queue_status === 'Ready for Doctor';

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          <HStack>
            <Text>{patient.first_name} {patient.last_name}</Text>
            {visit.is_emergency && <Badge colorScheme="red">EMERGENCY</Badge>}
            <Badge colorScheme={getTriageColor(triage_level)}>{triage_level || 'Untriaged'}</Badge>
          </HStack>
          <Text fontSize="sm" fontWeight="normal" color="gray.500">
            ID: {patient.national_id || 'N/A'} | Age: {patient.date_of_birth ? new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear() : 'N/A'}
          </Text>
        </ModalHeader>
        <ModalCloseButton />
        
        <ModalBody>
          <VStack spacing={6} align="stretch">
            {/* Visit Context */}
            <Box>
              <Heading size="sm" mb={2} color="gray.700">Visit Reason</Heading>
              <Text p={3} bg="gray.50" borderRadius="md">{visit.visit_reason}</Text>
            </Box>

            {/* Vitals Display (if available) */}
            {(visit.systolic_bp || visit.temperature) && (
              <Box>
                <Heading size="sm" mb={3} color="gray.700">Recorded Vitals</Heading>
                <SimpleGrid columns={3} spacing={4}>
                  <Stat size="sm">
                    <StatLabel>BP</StatLabel>
                    <StatNumber>{visit.systolic_bp}/{visit.diastolic_bp}</StatNumber>
                    <StatHelpText>mmHg</StatHelpText>
                  </Stat>
                  <Stat size="sm">
                    <StatLabel>Heart Rate</StatLabel>
                    <StatNumber>{visit.heart_rate}</StatNumber>
                    <StatHelpText>bpm</StatHelpText>
                  </Stat>
                  <Stat size="sm">
                    <StatLabel>Temp</StatLabel>
                    <StatNumber>{visit.temperature}°C</StatNumber>
                  </Stat>
                  <Stat size="sm">
                    <StatLabel>O2 Sat</StatLabel>
                    <StatNumber>{visit.oxygen_saturation}%</StatNumber>
                  </Stat>
                  <Stat size="sm">
                    <StatLabel>Resp. Rate</StatLabel>
                    <StatNumber>{visit.respiratory_rate}</StatNumber>
                  </Stat>
                  <Stat size="sm">
                    <StatLabel>Weight</StatLabel>
                    <StatNumber>{visit.weight} kg</StatNumber>
                  </Stat>
                </SimpleGrid>
              </Box>
            )}

            {/* Nurse Notes */}
            {visit.nurse_notes && (
              <Box>
                <Heading size="sm" mb={2} color="gray.700">Nurse Notes</Heading>
                <Text fontSize="sm" whiteSpace="pre-wrap">{visit.nurse_notes}</Text>
              </Box>
            )}

            {/* Status Indicator */}
            <Box p={3} borderWidth="1px" borderRadius="md" borderColor="blue.200" bg="blue.50">
              <HStack justify="space-between">
                <Text fontWeight="bold" color="blue.700">Current Status:</Text>
                <Badge fontSize="0.9em" colorScheme="blue">{queue_status}</Badge>
              </HStack>
            </Box>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>Close</Button>
          {isEditable && (
            <Button colorScheme="blue" onClick={() => onAction('triage')}>
              {visit.systolic_bp ? 'Update Vitals / Triage' : 'Record Vitals & Triage'}
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
