import { useState, useEffect } from 'react';
import {
  Box, Heading, VStack, HStack, Text, Badge, Button, Spinner, Center,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton, ModalFooter,
  Select, Textarea, FormControl, FormLabel, useToast, useDisclosure,
  Alert, AlertIcon, Divider, SimpleGrid
} from '@chakra-ui/react';
import { CheckIcon, CloseIcon, WarningIcon } from '@chakra-ui/icons';
import api from '../../../services/api';

export default function AdmissionsQueue() {
  const [admissions, setAdmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAdmission, setSelectedAdmission] = useState(null);
  const [beds, setBeds] = useState([]);
  const [selectedBed, setSelectedBed] = useState('');
  const [nurseNotes, setNurseNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);
  
  const { isOpen: isAcceptOpen, onOpen: onAcceptOpen, onClose: onAcceptClose } = useDisclosure();
  const { isOpen: isRejectOpen, onOpen: onRejectOpen, onClose: onRejectClose } = useDisclosure();
  const toast = useToast();

  const fetchAdmissions = async () => {
    try {
      const res = await api.get('/admission/pending');
      setAdmissions(res.data);
    } catch (error) {
      console.error('Failed to fetch admissions', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmissions();
    const interval = setInterval(fetchAdmissions, 30000);
    return () => clearInterval(interval);
  }, []);

  const openAcceptModal = async (admission) => {
    setSelectedAdmission(admission);
    setSelectedBed('');
    setNurseNotes('');
    
    // Fetch available beds for the ward
    try {
      const res = await api.get(`/admission/wards/${admission.ward_id}/beds`);
      const available = res.data.filter(bed => bed.status === 'Available');
      setBeds(available);
    } catch (error) {
      console.error('Failed to fetch beds', error);
    }
    onAcceptOpen();
  };

  const openRejectModal = (admission) => {
    setSelectedAdmission(admission);
    setRejectReason('');
    onRejectOpen();
  };

  const handleAccept = async () => {
    if (!selectedBed) {
      toast({ title: 'Please select a bed', status: 'warning' });
      return;
    }

    setProcessing(true);
    try {
      await api.patch(`/admission/${selectedAdmission.admission_id}/accept`, {
        bed_id: parseInt(selectedBed),
        nurse_notes: nurseNotes
      });
      toast({ title: 'Patient admitted successfully', status: 'success' });
      onAcceptClose();
      fetchAdmissions();
    } catch (error) {
      toast({ title: 'Failed to admit patient', status: 'error' });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    setProcessing(true);
    try {
      await api.patch(`/admission/${selectedAdmission.admission_id}/reject`, {
        reason: rejectReason || 'No bed available'
      });
      toast({ title: 'Admission rejected', status: 'warning' });
      onRejectClose();
      fetchAdmissions();
    } catch (error) {
      toast({ title: 'Failed to reject admission', status: 'error' });
    } finally {
      setProcessing(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Critical': return 'red';
      case 'Urgent': return 'orange';
      default: return 'green';
    }
  };

  const calculateAge = (dob) => {
    if (!dob) return 'N/A';
    const ageDiff = Date.now() - new Date(dob).getTime();
    return Math.floor(ageDiff / (1000 * 60 * 60 * 24 * 365));
  };

  if (loading) {
    return <Center h="300px"><Spinner size="xl" color="purple.500" /></Center>;
  }

  if (admissions.length === 0) {
    return (
      <Center h="200px">
        <VStack>
          <CheckIcon boxSize={12} color="green.400" />
          <Text color="gray.500" fontSize="lg">No pending admission requests</Text>
        </VStack>
      </Center>
    );
  }

  return (
    <Box>
      <HStack justify="space-between" mb={4}>
        <Heading size="sm">Pending Admission Requests ({admissions.length})</Heading>
        <Button size="sm" onClick={fetchAdmissions} isLoading={loading}>
          Refresh
        </Button>
      </HStack>

      <VStack spacing={4} align="stretch">
        {admissions.map((adm) => (
          <Box 
            key={adm.admission_id} 
            p={5} 
            bg="white" 
            borderRadius="lg" 
            boxShadow="sm"
            borderLeft="4px solid"
            borderColor={`${getPriorityColor(adm.priority)}.400`}
          >
            <HStack justify="space-between" mb={3}>
              <VStack align="start" spacing={1}>
                <HStack>
                  <Text fontWeight="bold" fontSize="lg">
                    {adm.patient?.first_name} {adm.patient?.last_name}
                  </Text>
                  <Badge colorScheme={getPriorityColor(adm.priority)}>{adm.priority}</Badge>
                </HStack>
                <Text fontSize="sm" color="gray.500">
                  {adm.patient?.gender}, {calculateAge(adm.patient?.date_of_birth)} years | 
                  Ward: {adm.ward?.ward_name}
                </Text>
              </VStack>
              <Text fontSize="sm" color="gray.400">
                {new Date(adm.requested_at).toLocaleTimeString()}
              </Text>
            </HStack>

            <Divider mb={3} />

            <SimpleGrid columns={2} spacing={4} mb={4}>
              <Box>
                <Text fontSize="xs" color="gray.500" textTransform="uppercase">Admission Reason</Text>
                <Text fontWeight="medium">{adm.admission_reason}</Text>
              </Box>
              <Box>
                <Text fontSize="xs" color="gray.500" textTransform="uppercase">Initial Orders</Text>
                <Text fontSize="sm">{adm.initial_orders || 'No specific orders'}</Text>
              </Box>
            </SimpleGrid>

            {/* Vitals Summary */}
            {adm.visit && (
              <Box p={3} bg="blue.50" borderRadius="md" mb={4}>
                <Text fontSize="xs" color="gray.500" mb={1}>Latest Vitals</Text>
                <HStack spacing={6} flexWrap="wrap">
                  <Text fontSize="sm">BP: {adm.visit.systolic_bp}/{adm.visit.diastolic_bp}</Text>
                  <Text fontSize="sm">HR: {adm.visit.heart_rate} bpm</Text>
                  <Text fontSize="sm">Temp: {adm.visit.temperature}°C</Text>
                  <Text fontSize="sm">SpO2: {adm.visit.oxygen_saturation}%</Text>
                </HStack>
                {adm.visit.diagnosis && (
                  <Text fontSize="sm" mt={2}><strong>Diagnosis:</strong> {adm.visit.diagnosis}</Text>
                )}
              </Box>
            )}

            {adm.patient?.allergies && (
              <Alert status="warning" borderRadius="md" mb={4}>
                <AlertIcon />
                <Text fontSize="sm"><strong>Allergies:</strong> {adm.patient.allergies}</Text>
              </Alert>
            )}

            <HStack justify="flex-end" spacing={3}>
              <Button 
                colorScheme="red" 
                variant="outline"
                leftIcon={<CloseIcon />}
                onClick={() => openRejectModal(adm)}
              >
                Reject
              </Button>
              <Button 
                colorScheme="green" 
                leftIcon={<CheckIcon />}
                onClick={() => openAcceptModal(adm)}
              >
                Accept & Assign Bed
              </Button>
            </HStack>
          </Box>
        ))}
      </VStack>

      {/* Accept Modal */}
      <Modal isOpen={isAcceptOpen} onClose={onAcceptClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Assign Bed to Patient</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              {selectedAdmission && (
                <Box p={3} bg="blue.50" borderRadius="md">
                  <Text fontWeight="bold">
                    {selectedAdmission.patient?.first_name} {selectedAdmission.patient?.last_name}
                  </Text>
                  <Text fontSize="sm">Ward: {selectedAdmission.ward?.ward_name}</Text>
                </Box>
              )}

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
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button mr={3} onClick={onAcceptClose}>Cancel</Button>
            <Button 
              colorScheme="green" 
              onClick={handleAccept}
              isLoading={processing}
              isDisabled={beds.length === 0}
            >
              Confirm Admission
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Reject Modal */}
      <Modal isOpen={isRejectOpen} onClose={onRejectClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Reject Admission Request</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl>
              <FormLabel>Reason for Rejection</FormLabel>
              <Textarea 
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g., No beds available, patient needs higher level of care..."
              />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button mr={3} onClick={onRejectClose}>Cancel</Button>
            <Button 
              colorScheme="red" 
              onClick={handleReject}
              isLoading={processing}
            >
              Confirm Rejection
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
