import { useState, useEffect } from 'react';
import {
  Box, Heading, Table, Thead, Tbody, Tr, Th, Td, Badge, Button, 
  HStack, Text, Spinner, Center, VStack, useToast, useDisclosure,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton, ModalFooter,
  Alert, AlertIcon, Divider
} from '@chakra-ui/react';
import { CheckIcon } from '@chakra-ui/icons';
import api from '../../../services/api';

export default function DischargeQueue() {
  const [discharges, setDischarges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDischarge, setSelectedDischarge] = useState(null);
  const [processing, setProcessing] = useState(false);
  
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  const fetchDischarges = async () => {
    try {
      // Fetch admissions with 'Pending Discharge' status
      const res = await api.get('/admission/admitted');
      const pendingDischarges = res.data.filter(a => a.admission_status === 'Pending Discharge');
      setDischarges(pendingDischarges);
    } catch (error) {
      console.error('Failed to fetch discharges', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDischarges();
    const interval = setInterval(fetchDischarges, 30000);
    return () => clearInterval(interval);
  }, []);

  const openConfirmModal = (discharge) => {
    setSelectedDischarge(discharge);
    onOpen();
  };

  const handleConfirmDischarge = async () => {
    setProcessing(true);
    try {
      await api.patch(`/admission/${selectedDischarge.admission_id}/confirm-discharge`);
      toast({ title: 'Patient discharged successfully. Bed is now available.', status: 'success' });
      onClose();
      fetchDischarges();
    } catch (error) {
      toast({ title: 'Failed to confirm discharge', status: 'error' });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <Center h="300px"><Spinner size="xl" color="purple.500" /></Center>;
  }

  if (discharges.length === 0) {
    return (
      <Center h="200px">
        <VStack>
          <CheckIcon boxSize={12} color="green.400" />
          <Text color="gray.500" fontSize="lg">No pending discharges</Text>
        </VStack>
      </Center>
    );
  }

  return (
    <Box>
      <HStack justify="space-between" mb={4}>
        <Heading size="sm">Pending Discharges ({discharges.length})</Heading>
        <Button size="sm" onClick={fetchDischarges} isLoading={loading}>
          Refresh
        </Button>
      </HStack>

      <VStack spacing={4} align="stretch">
        {discharges.map((d) => (
          <Box 
            key={d.admission_id} 
            p={5} 
            bg="white" 
            borderRadius="lg" 
            boxShadow="sm"
            borderLeft="4px solid"
            borderColor="orange.400"
          >
            <HStack justify="space-between" mb={3}>
              <VStack align="start" spacing={0}>
                <Text fontWeight="bold" fontSize="lg">
                  {d.patient?.first_name} {d.patient?.last_name}
                </Text>
                <Text fontSize="sm" color="gray.500">
                  {d.ward?.ward_name} - Bed {d.bed?.bed_number}
                </Text>
              </VStack>
              <Badge colorScheme="orange" fontSize="md" px={3} py={1}>Pending Discharge</Badge>
            </HStack>

            <Divider mb={3} />

            <Box mb={4}>
              <Text fontSize="xs" color="gray.500" textTransform="uppercase">Discharge Summary</Text>
              <Text>{d.discharge_summary || 'No summary provided'}</Text>
            </Box>

            {d.discharge_meds && (
              <Box mb={4}>
                <Text fontSize="xs" color="gray.500" textTransform="uppercase">Take-Home Medications</Text>
                <Text fontSize="sm">{d.discharge_meds}</Text>
              </Box>
            )}

            {d.follow_up_date && (
              <Box mb={4}>
                <Text fontSize="xs" color="gray.500" textTransform="uppercase">Follow-Up Appointment</Text>
                <Text fontSize="sm">{new Date(d.follow_up_date).toLocaleString()}</Text>
              </Box>
            )}

            <HStack justify="flex-end">
              <Button 
                colorScheme="green" 
                leftIcon={<CheckIcon />}
                onClick={() => openConfirmModal(d)}
              >
                Confirm Discharge
              </Button>
            </HStack>
          </Box>
        ))}
      </VStack>

      {/* Confirm Discharge Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Confirm Patient Discharge</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedDischarge && (
              <VStack spacing={4} align="stretch">
                <Box p={3} bg="blue.50" borderRadius="md">
                  <Text fontWeight="bold">
                    {selectedDischarge.patient?.first_name} {selectedDischarge.patient?.last_name}
                  </Text>
                  <Text fontSize="sm">
                    {selectedDischarge.ward?.ward_name} - Bed {selectedDischarge.bed?.bed_number}
                  </Text>
                </Box>

                <Alert status="info" borderRadius="md">
                  <AlertIcon />
                  <Box>
                    <Text fontWeight="bold">This will:</Text>
                    <Text fontSize="sm">• Mark patient as Discharged</Text>
                    <Text fontSize="sm">• Free up Bed {selectedDischarge.bed?.bed_number}</Text>
                    {selectedDischarge.follow_up_date && (
                      <Text fontSize="sm">• Create follow-up appointment</Text>
                    )}
                  </Box>
                </Alert>

                <Text fontSize="sm" color="gray.600">
                  Please ensure the patient has received their discharge instructions and medications.
                </Text>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button mr={3} onClick={onClose}>Cancel</Button>
            <Button 
              colorScheme="green" 
              onClick={handleConfirmDischarge}
              isLoading={processing}
            >
              Confirm Discharge
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
