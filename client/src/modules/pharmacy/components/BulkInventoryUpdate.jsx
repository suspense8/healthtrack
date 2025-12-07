import { useState } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton, ModalFooter,
  Button, VStack, Text, useToast, Alert, AlertIcon, Box, Progress
} from '@chakra-ui/react';
import api from '../../../services/api';

export default function BulkInventoryUpdate({ isOpen, onClose, onComplete }) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const toast = useToast();

  const handleBulkUpdate = async () => {
    setLoading(true);
    setProgress(0);
    
    try {
      // Get all medicines with zero or low stock
      const medicinesRes = await api.get('/pharmacy/inventory?limit=10000&lowStock=true&outOfStock=true');
      const medicines = medicinesRes.data.medicines;
      
      if (medicines.length === 0) {
        toast({
          title: 'No medicines to update',
          description: 'All medicines already have stock',
          status: 'info'
        });
        onClose();
        return;
      }

      // Prepare bulk update
      const updates = medicines.map(medicine => ({
        id: medicine.id,
        quantity: medicine.quantity === 0 ? 100 : Math.max(medicine.reorder_level + 50, medicine.quantity + 50),
        reorder_level: medicine.reorder_level || 10,
        unit: medicine.unit || 'units'
      }));

      // Update in batches of 100
      const batchSize = 100;
      const batches = [];
      for (let i = 0; i < updates.length; i += batchSize) {
        batches.push(updates.slice(i, i + batchSize));
      }

      let completed = 0;
      for (const batch of batches) {
        await api.post('/pharmacy/inventory/bulk', { updates: batch });
        completed += batch.length;
        setProgress(Math.round((completed / updates.length) * 100));
      }

      toast({
        title: 'Bulk Update Complete',
        description: `Updated ${updates.length} medicines`,
        status: 'success',
        duration: 5000
      });

      if (onComplete) onComplete();
      onClose();
    } catch (error) {
      console.error('Bulk update error:', error);
      toast({
        title: 'Bulk Update Failed',
        description: error.response?.data?.error || 'Failed to update medicines',
        status: 'error'
      });
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Bulk Inventory Update</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <Alert status="info" borderRadius="md">
              <AlertIcon />
              This will update all medicines with low or zero stock to default values.
            </Alert>
            
            <Box>
              <Text mb={2}>Default values:</Text>
              <Text fontSize="sm" color="gray.600">
                • Zero stock → 100 units
              </Text>
              <Text fontSize="sm" color="gray.600">
                • Low stock → Current + 50 units (or reorder level + 50)
              </Text>
            </Box>

            {loading && (
              <Box>
                <Text mb={2}>Progress: {progress}%</Text>
                <Progress value={progress} colorScheme="teal" />
              </Box>
            )}
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button mr={3} onClick={onClose} isDisabled={loading}>
            Cancel
          </Button>
          <Button
            colorScheme="teal"
            onClick={handleBulkUpdate}
            isLoading={loading}
          >
            Start Bulk Update
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
