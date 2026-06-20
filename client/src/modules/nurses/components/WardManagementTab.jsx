import { useState, useEffect } from 'react';
import {
  Box, Heading, Button, Table, Thead, Tbody, Tr, Th, Td, Badge, HStack, VStack,
  IconButton, useDisclosure, Modal, ModalOverlay, ModalContent, ModalHeader,
  ModalBody, ModalFooter, ModalCloseButton, FormControl, FormLabel, Input,
  Select, Textarea, useToast, AlertDialog, AlertDialogBody, AlertDialogFooter,
  AlertDialogHeader, AlertDialogContent, AlertDialogOverlay, Spinner, Center,
  Text, NumberInput, NumberInputField, NumberInputStepper, NumberIncrementStepper,
  NumberDecrementStepper
} from '@chakra-ui/react';
import { FaPlus, FaEdit, FaTrash, FaPowerOff, FaBed } from 'react-icons/fa';
import api from '../../../services/api';

export default function WardManagementTab() {
  const [wards, setWards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWard, setSelectedWard] = useState(null);
  const [formData, setFormData] = useState({
    ward_name: '',
    ward_type: 'General',
    total_beds: 10,
    description: ''
  });
  
  const { isOpen: isCreateOpen, onOpen: onCreateOpen, onClose: onCreateClose } = useDisclosure();
  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const { isOpen: isBedCountOpen, onOpen: onBedCountOpen, onClose: onBedCountClose } = useDisclosure();
  
  const [newBedCount, setNewBedCount] = useState(10);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  useEffect(() => {
    fetchWards();
  }, []);

  const fetchWards = async () => {
    try {
      // Include inactive wards for management view
      const res = await api.get('/nurses/wards?includeInactive=true');
      setWards(res.data);
    } catch (error) {
      console.error('Failed to fetch wards:', error);
      toast({
        title: 'Error fetching wards',
        status: 'error',
        duration: 3000
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWard = async () => {
    setSubmitting(true);
    try {
      await api.post('/nurses/wards', formData);
      toast({
        title: 'Ward created successfully',
        status: 'success',
        duration: 3000
      });
      fetchWards();
      onCreateClose();
      resetForm();
    } catch (error) {
      toast({
        title: 'Failed to create ward',
        description: error.response?.data?.error || 'Please try again',
        status: 'error',
        duration: 5000
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditWard = async () => {
    setSubmitting(true);
    try {
      await api.put(`/nurses/wards/${selectedWard.ward_id}`, formData);
      toast({
        title: 'Ward updated successfully',
        status: 'success',
        duration: 3000
      });
      fetchWards();
      onEditClose();
      resetForm();
    } catch (error) {
      toast({
        title: 'Failed to update ward',
        description: error.response?.data?.error || 'Please try again',
        status: 'error',
        duration: 5000
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (ward) => {
    try {
      await api.patch(`/nurses/wards/${ward.ward_id}/status`, {
        is_active: !ward.is_active
      });
      toast({
        title: `Ward ${ward.is_active ? 'deactivated' : 'activated'}`,
        status: 'success',
        duration: 3000
      });
      fetchWards();
    } catch (error) {
      toast({
        title: 'Failed to update status',
        description: error.response?.data?.error || 'Please try again',
        status: 'error',
        duration: 5000
      });
    }
  };

  const handleUpdateBedCount = async () => {
    setSubmitting(true);
    try {
      await api.put(`/nurses/wards/${selectedWard.ward_id}/bed-count`, {
        new_bed_count: newBedCount
      });
      toast({
        title: 'Bed count updated successfully',
        status: 'success',
        duration: 3000
      });
      fetchWards();
      onBedCountClose();
    } catch (error) {
      toast({
        title: 'Failed to update bed count',
        description: error.response?.data?.error || 'Please try again',
        status: 'error',
        duration: 5000
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteWard = async () => {
    setSubmitting(true);
    try {
      await api.delete(`/nurses/wards/${selectedWard.ward_id}`);
      toast({
        title: 'Ward deleted successfully',
        status: 'success',
        duration: 3000
      });
      fetchWards();
      onDeleteClose();
    } catch (error) {
      toast({
        title: 'Failed to delete ward',
        description: error.response?.data?.error || 'Cannot delete ward with active admissions',
        status: 'error',
        duration: 5000
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openCreateModal = () => {
    resetForm();
    onCreateOpen();
  };

  const openEditModal = (ward) => {
    setSelectedWard(ward);
    setFormData({
      ward_name: ward.ward_name,
      ward_type: ward.ward_type,
      total_beds: ward.total_beds,
      description: ward.description || ''
    });
    onEditOpen();
  };

  const openBedCountModal = (ward) => {
    setSelectedWard(ward);
    setNewBedCount(ward.total_beds);
    onBedCountOpen();
  };

  const openDeleteModal = (ward) => {
    setSelectedWard(ward);
    onDeleteOpen();
  };

  const resetForm = () => {
    setFormData({
      ward_name: '',
      ward_type: 'General',
      total_beds: 10,
      description: ''
    });
    setSelectedWard(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (loading) {
    return <Center h="300px"><Spinner size="xl" color="purple.500" /></Center>;
  }

  return (
    <Box>
      <HStack justify="space-between" mb={6}>
        <Heading size="md">Ward Structure Management</Heading>
        <Button leftIcon={<FaPlus />} colorScheme="purple" onClick={openCreateModal}>
          Create New Ward
        </Button>
      </HStack>

      <Box bg="white" borderRadius="lg" boxShadow="sm" overflow="hidden">
        <Table variant="simple">
          <Thead bg="gray.50">
            <Tr>
              <Th>Ward Name</Th>
              <Th>Type</Th>
              <Th>Total Beds</Th>
              <Th>Occupied</Th>
              <Th>Available</Th>
              <Th>Status</Th>
              <Th>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {wards.length === 0 ? (
              <Tr>
                <Td colSpan={7} textAlign="center" py={8}>
                  <Text color="gray.500">No wards configured. Create one to get started.</Text>
                </Td>
              </Tr>
            ) : (
              wards.map((ward) => (
                <Tr key={ward.ward_id} opacity={ward.is_active ? 1 : 0.6}>
                  <Td fontWeight="bold">{ward.ward_name}</Td>
                  <Td>
                    <Badge colorScheme={
                      ward.ward_type === 'Emergency' ? 'red' :
                      ward.ward_type === 'Maternity' ? 'pink' :
                      ward.ward_type === 'Pediatric' ? 'blue' :
                      'gray'
                    }>
                      {ward.ward_type}
                    </Badge>
                  </Td>
                  <Td>{ward.total_beds}</Td>
                  <Td>
                    <Text color="orange.600" fontWeight="semibold">
                      {ward.occupied_beds || 0}
                    </Text>
                  </Td>
                  <Td>
                    <Text color="green.600" fontWeight="semibold">
                      {ward.available_beds || ward.total_beds}
                    </Text>
                  </Td>
                  <Td>
                    <Badge colorScheme={ward.is_active ? 'green' : 'red'}>
                      {ward.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </Td>
                  <Td>
                    <HStack spacing={2}>
                      <IconButton
                        icon={<FaEdit />}
                        size="sm"
                        colorScheme="blue"
                        variant="ghost"
                        onClick={() => openEditModal(ward)}
                        aria-label="Edit ward"
                      />
                      <IconButton
                        icon={<FaBed />}
                        size="sm"
                        colorScheme="teal"
                        variant="ghost"
                        onClick={() => openBedCountModal(ward)}
                        aria-label="Manage beds"
                      />
                      <IconButton
                        icon={<FaPowerOff />}
                        size="sm"
                        colorScheme={ward.is_active ? 'orange' : 'green'}
                        variant="ghost"
                        onClick={() => handleToggleStatus(ward)}
                        aria-label={ward.is_active ? 'Deactivate' : 'Activate'}
                      />
                      <IconButton
                        icon={<FaTrash />}
                        size="sm"
                        colorScheme="red"
                        variant="ghost"
                        onClick={() => openDeleteModal(ward)}
                        aria-label="Delete ward"
                      />
                    </HStack>
                  </Td>
                </Tr>
              ))
            )}
          </Tbody>
        </Table>
      </Box>

      {/* Create Ward Modal */}
      <Modal isOpen={isCreateOpen} onClose={onCreateClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create New Ward</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Ward Name</FormLabel>
                <Input
                  name="ward_name"
                  value={formData.ward_name}
                  onChange={handleChange}
                  placeholder="e.g., ICU, Labor Ward"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Ward Type</FormLabel>
                <Select name="ward_type" value={formData.ward_type} onChange={handleChange}>
                  <option value="General">General</option>
                  <option value="Maternity">Maternity</option>
                  <option value="Pediatric">Pediatric</option>
                  <option value="Emergency">Emergency</option>
                  <option value="ICU">ICU</option>
                  <option value="Surgery">Surgery</option>
                </Select>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Total Beds</FormLabel>
                <NumberInput
                  min={1}
                  max={50}
                  value={formData.total_beds}
                  onChange={(val) => setFormData(prev => ({ ...prev, total_beds: parseInt(val) }))}
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
              </FormControl>

              <FormControl>
                <FormLabel>Description</FormLabel>
                <Textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Brief description of this ward..."
                  rows={3}
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onCreateClose}>
              Cancel
            </Button>
            <Button
              colorScheme="purple"
              onClick={handleCreateWard}
              isLoading={submitting}
            >
              Create Ward
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Edit Ward Modal */}
      <Modal isOpen={isEditOpen} onClose={onEditClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit Ward</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Ward Name</FormLabel>
                <Input
                  name="ward_name"
                  value={formData.ward_name}
                  onChange={handleChange}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Ward Type</FormLabel>
                <Select name="ward_type" value={formData.ward_type} onChange={handleChange}>
                  <option value="General">General</option>
                  <option value="Maternity">Maternity</option>
                  <option value="Pediatric">Pediatric</option>
                  <option value="Emergency">Emergency</option>
                  <option value="ICU">ICU</option>
                  <option value="Surgery">Surgery</option>
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Description</FormLabel>
                <Textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onEditClose}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleEditWard}
              isLoading={submitting}
            >
              Save Changes
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Update Bed Count Modal */}
      <Modal isOpen={isBedCountOpen} onClose={onBedCountClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Update Bed Count</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <Text>
                Current bed count: <strong>{selectedWard?.total_beds}</strong>
              </Text>
              <Text fontSize="sm" color="gray.600">
                Available: {selectedWard?.available_beds || 0} | Occupied: {selectedWard?.occupied_beds || 0}
              </Text>
              <FormControl>
                <FormLabel>New Bed Count</FormLabel>
                <NumberInput
                  min={selectedWard?.occupied_beds || 0}
                  max={50}
                  value={newBedCount}
                  onChange={(val) => setNewBedCount(parseInt(val))}
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
                <Text fontSize="xs" color="gray.500" mt={2}>
                  {newBedCount < (selectedWard?.total_beds || 0)
                    ? '⚠️ Reducing beds will remove available beds only'
                    : newBedCount > (selectedWard?.total_beds || 0)
                    ? '✓ New beds will be added automatically'
                    : 'No change'}
                </Text>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onBedCountClose}>
              Cancel
            </Button>
            <Button
              colorScheme="teal"
              onClick={handleUpdateBedCount}
              isLoading={submitting}
            >
              Update Beds
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <AlertDialog isOpen={isDeleteOpen} onClose={onDeleteClose} isCentered>
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader>Delete Ward</AlertDialogHeader>
            <AlertDialogBody>
              Are you sure you want to delete <strong>{selectedWard?.ward_name}</strong>?
              <br /><br />
              This action cannot be undone. The ward can only be deleted if there are no active admissions.
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button onClick={onDeleteClose}>Cancel</Button>
              <Button
                colorScheme="red"
                onClick={handleDeleteWard}
                ml={3}
                isLoading={submitting}
              >
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
}
