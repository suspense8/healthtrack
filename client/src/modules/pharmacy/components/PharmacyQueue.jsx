import { useState, useEffect } from 'react';
import {
  Box, Heading, Table, Thead, Tbody, Tr, Th, Td, Badge, Button, 
  HStack, Text, Spinner, Center, VStack, Divider, useToast,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton, ModalFooter,
  FormControl, FormLabel, Input, Textarea, useDisclosure, Alert, AlertIcon,
  InputGroup, InputLeftElement, Select
} from '@chakra-ui/react';
import { CheckIcon, WarningIcon, CloseIcon, SearchIcon } from '@chakra-ui/icons';
import api from '../../../services/api';

export default function PharmacyQueue({ onDispenseComplete }) {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRx, setSelectedRx] = useState(null);
  const [actionType, setActionType] = useState(null); // 'dispense', 'stockout', 'cancel'
  const [notes, setNotes] = useState('');
  const [quantity, setQuantity] = useState('');
  const [processing, setProcessing] = useState(false);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('queue'); // 'queue', 'name', 'time'
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  const fetchQueue = async () => {
    try {
      const res = await api.get('/pharmacy/queue');
      setPrescriptions(res.data);
    } catch (error) {
      console.error('Failed to fetch queue', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    // Poll every 30 seconds
    const interval = setInterval(fetchQueue, 30000);
    return () => clearInterval(interval);
  }, []);

  const openActionModal = (rx, action) => {
    setSelectedRx(rx);
    setActionType(action);
    setNotes('');
    setQuantity(rx.quantity || '');
    onOpen();
  };

  const handleAction = async () => {
    if (!selectedRx || !actionType) return;
    setProcessing(true);

    try {
      let endpoint = '';
      let body = {};

      switch (actionType) {
        case 'dispense':
          endpoint = `/pharmacy/prescriptions/${selectedRx.prescription_id}/dispense`;
          body = { quantity_dispensed: parseInt(quantity) || null, notes };
          break;
        case 'stockout':
          endpoint = `/pharmacy/prescriptions/${selectedRx.prescription_id}/stockout`;
          body = { notes };
          break;
        case 'cancel':
          endpoint = `/pharmacy/prescriptions/${selectedRx.prescription_id}/cancel`;
          body = { reason: notes };
          break;
      }

      await api.patch(endpoint, body);
      
      toast({
        title: actionType === 'dispense' ? 'Medication Dispensed' :
               actionType === 'stockout' ? 'Marked as Stockout' : 'Prescription Cancelled',
        status: actionType === 'dispense' ? 'success' : 'warning'
      });

      onClose();
      fetchQueue();
      if (onDispenseComplete) onDispenseComplete();
    } catch (error) {
      toast({ title: 'Action failed', status: 'error' });
    } finally {
      setProcessing(false);
    }
  };

  // Filter prescriptions based on search
  const filteredPrescriptions = prescriptions.filter(rx => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    const patientName = `${rx.patient.first_name} ${rx.patient.last_name}`.toLowerCase();
    const medication = rx.medication_name.toLowerCase();
    const queueNum = rx.visit?.queue_number?.toString() || '';
    return patientName.includes(searchLower) || 
           medication.includes(searchLower) || 
           queueNum.includes(search);
  });

  // Group prescriptions by patient/visit for easier dispensing
  const groupedByVisit = filteredPrescriptions.reduce((acc, rx) => {
    const key = rx.visit_id;
    if (!acc[key]) {
      acc[key] = {
        visit: rx.visit,
        patient: rx.patient,
        prescriptions: []
      };
    }
    acc[key].prescriptions.push(rx);
    return acc;
  }, {});

  // Sort grouped results
  const sortedGroups = Object.values(groupedByVisit).sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return `${a.patient.first_name} ${a.patient.last_name}`.localeCompare(
          `${b.patient.first_name} ${b.patient.last_name}`
        );
      case 'time':
        return new Date(b.prescriptions[0]?.created_at) - new Date(a.prescriptions[0]?.created_at);
      case 'queue':
      default:
        return (a.visit?.queue_number || 999) - (b.visit?.queue_number || 999);
    }
  });

  if (loading) {
    return <Center h="300px"><Spinner size="xl" color="teal.500" /></Center>;
  }

  if (prescriptions.length === 0) {
    return (
      <Center h="200px">
        <VStack>
          <CheckIcon boxSize={12} color="green.400" />
          <Text color="gray.500" fontSize="lg">No pending prescriptions</Text>
        </VStack>
      </Center>
    );
  }

  return (
    <Box>
      {/* Search and Filter Bar */}
      <HStack mb={4} spacing={4}>
        <InputGroup maxW="350px">
          <InputLeftElement><SearchIcon color="gray.400" /></InputLeftElement>
          <Input 
            placeholder="Search patient, medication, or queue #..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            bg="white"
          />
        </InputGroup>
        <Select 
          w="180px" 
          value={sortBy} 
          onChange={(e) => setSortBy(e.target.value)}
          bg="white"
        >
          <option value="queue">Sort by Queue #</option>
          <option value="name">Sort by Name</option>
          <option value="time">Sort by Time</option>
        </Select>
        <Text color="gray.500" fontSize="sm">
          Showing {sortedGroups.length} of {Object.keys(groupedByVisit).length} patients
        </Text>
      </HStack>

      <HStack justify="space-between" mb={4}>
        <Heading size="sm">
          Patients Waiting for Medication ({sortedGroups.length})
        </Heading>
        <Button size="sm" onClick={fetchQueue} isLoading={loading}>
          Refresh
        </Button>
      </HStack>

      <VStack spacing={4} align="stretch">
        {sortedGroups.map((group, idx) => (
          <Box key={idx} p={5} bg="gray.50" borderRadius="lg" borderLeft="4px solid" borderColor="teal.400">
            <HStack justify="space-between" mb={3}>
              <VStack align="start" spacing={0}>
                <Text fontWeight="bold" fontSize="lg">
                  {group.patient.first_name} {group.patient.last_name}
                </Text>
                <Text fontSize="sm" color="gray.500">
                  Queue #{group.visit?.queue_number} | {group.patient.phone_number}
                </Text>
                {group.patient.allergies && (
                  <Badge colorScheme="red" mt={1}>⚠️ Allergies: {group.patient.allergies}</Badge>
                )}
              </VStack>
              <Badge colorScheme="blue" fontSize="md" px={3} py={1}>
                {group.prescriptions.length} item(s)
              </Badge>
            </HStack>

            <Divider mb={3} />

            <Table size="sm" variant="simple">
              <Thead>
                <Tr>
                  <Th>Medication</Th>
                  <Th>Dosage</Th>
                  <Th>Frequency</Th>
                  <Th>Duration</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {group.prescriptions.map((rx) => (
                  <Tr key={rx.prescription_id}>
                    <Td fontWeight="bold">{rx.medication_name}</Td>
                    <Td>{rx.dosage}</Td>
                    <Td>{rx.frequency}</Td>
                    <Td>{rx.duration}</Td>
                    <Td>
                      <HStack spacing={2}>
                        <Button 
                          size="xs" 
                          colorScheme="green" 
                          leftIcon={<CheckIcon />}
                          onClick={() => openActionModal(rx, 'dispense')}
                        >
                          Dispense
                        </Button>
                        <Button 
                          size="xs" 
                          colorScheme="orange" 
                          variant="outline"
                          leftIcon={<WarningIcon />}
                          onClick={() => openActionModal(rx, 'stockout')}
                        >
                          Stockout
                        </Button>
                        <Button 
                          size="xs" 
                          colorScheme="red" 
                          variant="ghost"
                          leftIcon={<CloseIcon />}
                          onClick={() => openActionModal(rx, 'cancel')}
                        >
                          Cancel
                        </Button>
                      </HStack>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        ))}
      </VStack>

      {/* Action Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {actionType === 'dispense' && 'Dispense Medication'}
            {actionType === 'stockout' && 'Mark as Stockout'}
            {actionType === 'cancel' && 'Cancel Prescription'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedRx && (
              <VStack align="stretch" spacing={4}>
                <Box p={3} bg="blue.50" borderRadius="md">
                  <Text fontWeight="bold">{selectedRx.medication_name}</Text>
                  <Text fontSize="sm">{selectedRx.dosage} - {selectedRx.frequency} - {selectedRx.duration}</Text>
                </Box>

                {actionType === 'dispense' && (
                  <FormControl>
                    <FormLabel>Quantity Dispensed</FormLabel>
                    <Input 
                      type="number" 
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="Enter quantity"
                    />
                  </FormControl>
                )}

                <FormControl>
                  <FormLabel>
                    {actionType === 'dispense' ? 'Notes (optional)' : 
                     actionType === 'stockout' ? 'Reason for Stockout' : 'Cancellation Reason'}
                  </FormLabel>
                  <Textarea 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={actionType === 'stockout' ? 'e.g. Out of stock, awaiting delivery' : ''}
                  />
                </FormControl>

                {actionType === 'stockout' && (
                  <Alert status="warning" borderRadius="md">
                    <AlertIcon />
                    The doctor will be notified to prescribe an alternative.
                  </Alert>
                )}
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button mr={3} onClick={onClose}>Cancel</Button>
            <Button 
              colorScheme={actionType === 'dispense' ? 'green' : actionType === 'stockout' ? 'orange' : 'red'}
              onClick={handleAction}
              isLoading={processing}
            >
              {actionType === 'dispense' ? 'Confirm Dispense' : 
               actionType === 'stockout' ? 'Mark Stockout' : 'Confirm Cancel'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
