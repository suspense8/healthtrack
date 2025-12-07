import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Input,
  VStack,
  HStack,
  Text,
  Badge,
  Button,
  Spinner,
  Collapse,
  useToast,
  useOutsideClick,
  Icon,
  InputGroup,
  InputLeftElement,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  Divider
} from '@chakra-ui/react';
import { SearchIcon } from '@chakra-ui/icons';
import { FaPills } from 'react-icons/fa';
import api from '../../../services/api';

// Debounce hook
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  
  return debouncedValue;
};

export default function MedicineSearch({ isOpen, onClose, onSelect }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  
  const toast = useToast();
  const debouncedQuery = useDebounce(searchQuery, 300);
  
  // Perform search
  useEffect(() => {
    const performSearch = async () => {
      if (!debouncedQuery || debouncedQuery.trim().length < 2) {
        setResults([]);
        return;
      }
      
      setLoading(true);
      try {
        const res = await api.post('/pharmacy/search-medicines', {
          query: debouncedQuery.trim(),
          limit: 15
        });
        setResults(res.data);
      } catch (error) {
        console.error('Medicine search error:', error);
        toast({
          title: 'Search failed',
          description: error.response?.data?.error || 'Failed to search medicines',
          status: 'error',
          duration: 3000
        });
      } finally {
        setLoading(false);
      }
    };
    
    performSearch();
  }, [debouncedQuery, toast]);
  
  const handleSelect = (medicine) => {
    setSelectedMedicine(medicine);
  };
  
  const handleConfirm = () => {
    if (selectedMedicine && onSelect) {
      onSelect(selectedMedicine);
      onClose();
      setSearchQuery('');
      setResults([]);
      setSelectedMedicine(null);
    }
  };
  
  const handleClose = () => {
    onClose();
    setSearchQuery('');
    setResults([]);
    setSelectedMedicine(null);
  };
  
  const getMatchTypeColor = (matchType) => {
    switch (matchType) {
      case 'name': return 'green';
      case 'fuzzy': return 'yellow';
      case 'description': return 'blue';
      default: return 'gray';
    }
  };
  
  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent maxH="80vh">
        <ModalHeader>
          <HStack>
            <Icon as={FaPills} />
            <Text>Search Medicines</Text>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />
        
        <ModalBody>
          <VStack spacing={4} align="stretch">
            {/* Search Input */}
            <Box>
              <InputGroup>
                <InputLeftElement>
                  {loading ? <Spinner size="sm" /> : <SearchIcon color="gray.400" />}
                </InputLeftElement>
                <Input
                  placeholder="Search by name, generic name, NDC code, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
              </InputGroup>
            </Box>
            
            <Divider />
            
            {/* Results */}
            {loading && (
              <Box textAlign="center" py={8}>
                <Spinner size="lg" color="blue.500" />
                <Text mt={2} color="gray.500">Searching medicines...</Text>
              </Box>
            )}
            
            {!loading && results.length > 0 && (
              <Box 
                maxH="450px" 
                overflowY="auto" 
                overflowX="hidden"
                border="1px"
                borderColor="gray.200"
                borderRadius="md"
              >
                <VStack spacing={0} align="stretch" divider={<Divider />}>
                  {results.map((medicine) => (
                    <Box
                      key={medicine.id}
                      p={4}
                      borderLeft={selectedMedicine?.id === medicine.id ? '4px solid' : '4px solid transparent'}
                      borderLeftColor={selectedMedicine?.id === medicine.id ? 'blue.500' : 'transparent'}
                      bg={selectedMedicine?.id === medicine.id ? 'blue.50' : 'white'}
                      cursor="pointer"
                      _hover={{ bg: 'gray.50', borderLeftColor: 'blue.300' }}
                      onClick={() => handleSelect(medicine)}
                      transition="all 0.2s"
                    >
                      <VStack align="start" spacing={2}>
                        <HStack justify="space-between" w="full" align="start">
                          <VStack align="start" spacing={0.5} flex={1} minW={0}>
                            <HStack spacing={2} align="center">
                              <Text 
                                fontWeight="semibold" 
                                fontSize="md" 
                                color="gray.800"
                                noOfLines={1}
                                title={medicine.name}
                              >
                                {medicine.name}
                              </Text>
                              <Badge 
                                colorScheme={getMatchTypeColor(medicine.matchType)} 
                                fontSize="2xs"
                                variant="subtle"
                              >
                                {medicine.matchPercentage}% match
                              </Badge>
                            </HStack>
                            {medicine.genericName && (
                              <Text 
                                fontSize="sm" 
                                color="gray.600"
                                noOfLines={1}
                                title={medicine.genericName}
                              >
                                Generic: {medicine.genericName}
                              </Text>
                            )}
                          </VStack>
                        </HStack>
                        
                        <HStack spacing={2} flexWrap="wrap">
                          {medicine.manufacturer && (
                            <Badge 
                              fontSize="2xs" 
                              colorScheme="gray" 
                              variant="outline"
                              fontWeight="normal"
                            >
                              {medicine.manufacturer}
                            </Badge>
                          )}
                          {medicine.ndcCode && (
                            <Badge 
                              fontSize="2xs" 
                              colorScheme="blue" 
                              variant="outline"
                              fontWeight="normal"
                            >
                              NDC: {medicine.ndcCode}
                            </Badge>
                          )}
                        </HStack>
                        
                        {medicine.description && (
                          <Text 
                            fontSize="xs" 
                            color="gray.600" 
                            mt={1} 
                            noOfLines={2}
                            lineHeight="1.4"
                          >
                            {medicine.description}
                          </Text>
                        )}
                        
                        {medicine.ingredients && (
                          <Box mt={1}>
                            <Text 
                              fontSize="2xs" 
                              color="gray.500" 
                              fontStyle="italic"
                              noOfLines={1}
                            >
                              Ingredients: {Array.isArray(medicine.ingredients) 
                                ? medicine.ingredients.slice(0, 3).join(', ') 
                                : medicine.ingredients.substring(0, 80)}
                              {Array.isArray(medicine.ingredients) && medicine.ingredients.length > 3 && '...'}
                            </Text>
                          </Box>
                        )}
                      </VStack>
                    </Box>
                  ))}
                </VStack>
              </Box>
            )}
            
            {!loading && searchQuery.length >= 2 && results.length === 0 && (
              <Box textAlign="center" py={8}>
                <Text color="gray.500">No medicines found matching "{searchQuery}"</Text>
                <Text fontSize="sm" color="gray.400" mt={2}>
                  Try a different search term or check spelling
                </Text>
              </Box>
            )}
            
            {!loading && searchQuery.length < 2 && (
              <Box textAlign="center" py={8}>
                <Icon as={FaPills} boxSize={12} color="gray.300" />
                <Text color="gray.500" mt={4}>
                  Enter at least 2 characters to search
                </Text>
              </Box>
            )}
          </VStack>
        </ModalBody>
        
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={handleClose}>
            Cancel
          </Button>
          <Button
            colorScheme="blue"
            onClick={handleConfirm}
            isDisabled={!selectedMedicine}
          >
            Select Medicine
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}


