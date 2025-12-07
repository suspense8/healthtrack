import { useState, useEffect } from 'react';
import {
  Box, Heading, Table, Thead, Tbody, Tr, Th, Td, Badge, Button,
  HStack, Text, Spinner, Center, VStack, Input, useToast,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton, ModalFooter,
  FormControl, FormLabel, Select, useDisclosure, Alert, AlertIcon,
  InputGroup, InputLeftElement, SimpleGrid, Stat, StatLabel, StatNumber,
  Icon
} from '@chakra-ui/react';
import { SearchIcon, EditIcon, AddIcon } from '@chakra-ui/icons';
import { FaPills, FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa';
import BulkInventoryUpdate from './BulkInventoryUpdate';
import api from '../../../services/api';

export default function InventoryManagement() {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all, lowStock, outOfStock
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [reorderLevel, setReorderLevel] = useState('');
  const [unit, setUnit] = useState('units');
  const [processing, setProcessing] = useState(false);
  const [stats, setStats] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isBulkOpen, onOpen: onBulkOpen, onClose: onBulkClose } = useDisclosure();
  const toast = useToast();

  const fetchMedicines = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50'
      });
      
      if (search) params.append('search', search);
      if (filter === 'lowStock') params.append('lowStock', 'true');
      if (filter === 'outOfStock') params.append('outOfStock', 'true');
      
      const res = await api.get(`/pharmacy/inventory?${params}`);
      setMedicines(res.data.medicines);
      setTotalPages(res.data.pagination.totalPages);
    } catch (error) {
      console.error('Failed to fetch medicines', error);
      toast({ title: 'Failed to load medicines', status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get('/pharmacy/inventory/stats');
      setStats(res.data);
    } catch (error) {
      console.error('Failed to fetch stats', error);
    }
  };

  useEffect(() => {
    fetchMedicines();
    fetchStats();
  }, [page, filter]);

  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => {
      if (page === 1) {
        fetchMedicines();
      } else {
        setPage(1);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const openEditModal = (medicine) => {
    setSelectedMedicine(medicine);
    setQuantity(medicine.quantity.toString());
    setReorderLevel(medicine.reorder_level.toString());
    setUnit(medicine.unit);
    onOpen();
  };

  const handleUpdate = async () => {
    if (!selectedMedicine) return;
    
    setProcessing(true);
    try {
      await api.patch(`/pharmacy/inventory/${selectedMedicine.id}`, {
        quantity: parseInt(quantity),
        reorder_level: parseInt(reorderLevel),
        unit
      });
      
      toast({
        title: 'Inventory Updated',
        description: `${selectedMedicine.name} stock updated`,
        status: 'success'
      });
      
      onClose();
      fetchMedicines();
      fetchStats();
    } catch (error) {
      toast({
        title: 'Update Failed',
        description: error.response?.data?.error || 'Failed to update inventory',
        status: 'error'
      });
    } finally {
      setProcessing(false);
    }
  };

  const getStockBadge = (medicine) => {
    if (medicine.isOutOfStock) {
      return <Badge colorScheme="red">Out of Stock</Badge>;
    }
    if (medicine.isLowStock) {
      return <Badge colorScheme="orange">Low Stock</Badge>;
    }
    return <Badge colorScheme="green">In Stock</Badge>;
  };

  if (loading && medicines.length === 0) {
    return <Center h="300px"><Spinner size="xl" color="teal.500" /></Center>;
  }

  return (
    <Box>
      {/* Stats Overview */}
      {stats && (
        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4} mb={6}>
          <Stat p={4} bg="white" borderRadius="lg" boxShadow="sm">
            <StatLabel>Total Medicines</StatLabel>
            <StatNumber>{stats.totalMedicines}</StatNumber>
          </Stat>
          <Stat p={4} bg="white" borderRadius="lg" boxShadow="sm" borderLeft="4px solid" borderColor="green.500">
            <StatLabel>In Stock</StatLabel>
            <StatNumber>{stats.inStock}</StatNumber>
          </Stat>
          <Stat p={4} bg="white" borderRadius="lg" boxShadow="sm" borderLeft="4px solid" borderColor="orange.500">
            <StatLabel>Low Stock</StatLabel>
            <StatNumber>{stats.lowStock}</StatNumber>
          </Stat>
          <Stat p={4} bg="white" borderRadius="lg" boxShadow="sm" borderLeft="4px solid" borderColor="red.500">
            <StatLabel>Out of Stock</StatLabel>
            <StatNumber>{stats.outOfStock}</StatNumber>
          </Stat>
        </SimpleGrid>
      )}

      {/* Filters */}
      <HStack mb={4} spacing={4}>
        <InputGroup maxW="400px">
          <InputLeftElement><SearchIcon color="gray.400" /></InputLeftElement>
          <Input
            placeholder="Search medicines..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            bg="white"
          />
        </InputGroup>
        <Select
          w="200px"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          bg="white"
        >
          <option value="all">All Medicines</option>
          <option value="lowStock">Low Stock</option>
          <option value="outOfStock">Out of Stock</option>
        </Select>
        <Button size="sm" onClick={fetchMedicines} isLoading={loading}>
          Refresh
        </Button>
        <Button size="sm" colorScheme="blue" leftIcon={<AddIcon />} onClick={onBulkOpen}>
          Bulk Update
        </Button>
      </HStack>

      {/* Medicines Table */}
      <Box bg="white" borderRadius="lg" boxShadow="sm" overflowX="auto">
        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>Medicine</Th>
              <Th>Generic Name</Th>
              <Th>Stock Status</Th>
              <Th>Quantity</Th>
              <Th>Reorder Level</Th>
              <Th>Unit</Th>
              <Th>Last Restocked</Th>
              <Th>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {medicines.map((medicine) => (
              <Tr key={medicine.id}>
                <Td fontWeight="bold">{medicine.name}</Td>
                <Td>{medicine.generic_name || '-'}</Td>
                <Td>{getStockBadge(medicine)}</Td>
                <Td>
                  <Text
                    fontWeight={medicine.isLowStock ? 'bold' : 'normal'}
                    color={medicine.isOutOfStock ? 'red.500' : medicine.isLowStock ? 'orange.500' : 'green.500'}
                  >
                    {medicine.quantity}
                  </Text>
                </Td>
                <Td>{medicine.reorder_level}</Td>
                <Td>{medicine.unit}</Td>
                <Td>
                  {medicine.last_restocked
                    ? new Date(medicine.last_restocked).toLocaleDateString()
                    : '-'}
                </Td>
                <Td>
                  <Button
                    size="xs"
                    colorScheme="teal"
                    leftIcon={<EditIcon />}
                    onClick={() => openEditModal(medicine)}
                  >
                    Update
                  </Button>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>

      {/* Pagination */}
      {totalPages > 1 && (
        <HStack justify="center" mt={4}>
          <Button
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            isDisabled={page === 1}
          >
            Previous
          </Button>
          <Text>
            Page {page} of {totalPages}
          </Text>
          <Button
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            isDisabled={page === totalPages}
          >
            Next
          </Button>
        </HStack>
      )}

      {/* Edit Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Update Inventory</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedMedicine && (
              <VStack spacing={4} align="stretch">
                <Box p={3} bg="blue.50" borderRadius="md">
                  <Text fontWeight="bold">{selectedMedicine.name}</Text>
                  {selectedMedicine.generic_name && (
                    <Text fontSize="sm" color="gray.600">
                      Generic: {selectedMedicine.generic_name}
                    </Text>
                  )}
                </Box>

                <FormControl>
                  <FormLabel>Current Quantity</FormLabel>
                  <Text fontSize="lg" fontWeight="bold" color="gray.700">
                    {selectedMedicine.quantity} {selectedMedicine.unit}
                  </Text>
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>New Quantity</FormLabel>
                  <Input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    min="0"
                    placeholder="Enter quantity"
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Reorder Level</FormLabel>
                  <Input
                    type="number"
                    value={reorderLevel}
                    onChange={(e) => setReorderLevel(e.target.value)}
                    min="0"
                    placeholder="Enter reorder level"
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Unit</FormLabel>
                  <Select value={unit} onChange={(e) => setUnit(e.target.value)}>
                    <option value="units">Units</option>
                    <option value="tablets">Tablets</option>
                    <option value="capsules">Capsules</option>
                    <option value="bottles">Bottles</option>
                    <option value="vials">Vials</option>
                    <option value="boxes">Boxes</option>
                    <option value="packs">Packs</option>
                    <option value="ml">ml</option>
                    <option value="mg">mg</option>
                  </Select>
                </FormControl>

                {parseInt(quantity) < parseInt(reorderLevel) && (
                  <Alert status="warning" borderRadius="md">
                    <AlertIcon />
                    Quantity is below reorder level. Consider restocking.
                  </Alert>
                )}
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button mr={3} onClick={onClose}>Cancel</Button>
            <Button
              colorScheme="teal"
              onClick={handleUpdate}
              isLoading={processing}
            >
              Update Inventory
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Bulk Update Modal */}
      <BulkInventoryUpdate
        isOpen={isBulkOpen}
        onClose={onBulkClose}
        onComplete={() => {
          fetchMedicines();
          fetchStats();
        }}
      />
    </Box>
  );
}
