import { useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  Textarea,
  VStack,
  HStack,
  Box,
  Text,
  Badge,
  Spinner,
  useToast,
  Divider,
  Link,
  Icon,
  Collapse,
  IconButton
} from '@chakra-ui/react';
import { FaSearch, FaExternalLinkAlt, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import axios from 'axios';

const API_BASE = 'http://localhost:3000/api';

const DiseaseSearchModal = ({ isOpen, onClose, onSelectDisease, authToken }) => {
  const [symptoms, setSymptoms] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const toast = useToast();

  const handleSearch = async () => {
    if (!symptoms.trim()) {
      toast({
        title: 'Please enter symptoms',
        status: 'warning',
        duration: 2000
      });
      return;
    }

    setLoading(true);
    setResults([]);

    try {
      const response = await axios.post(
        `${API_BASE}/doctor/search-diseases`,
        { symptoms, limit: 10 },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      setResults(response.data);
      
      if (response.data.length === 0) {
        toast({
          title: 'No matches found',
          description: 'Try different symptom descriptions',
          status: 'info',
          duration: 3000
        });
      }
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: 'Search failed',
        description: error.response?.data?.error || 'Failed to search diseases',
        status: 'error',
        duration: 3000
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (disease) => {
    onSelectDisease(disease);
    onClose();
    setSymptoms('');
    setResults([]);
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getSimilarityColor = (percentage) => {
    if (percentage >= 70) return 'green';
    if (percentage >= 50) return 'yellow';
    return 'orange';
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent maxH="80vh">
        <ModalHeader>
          <HStack>
            <Icon as={FaSearch} />
            <Text>Search Diseases by Symptoms</Text>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody>
          <VStack spacing={4} align="stretch">
            {/* Search Input */}
            <Box>
              <Textarea
                placeholder="Describe the patient's symptoms, e.g., 'persistent cough, fever, night sweats, weight loss'"
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                rows={3}
                resize="vertical"
              />
              <Button
                mt={2}
                colorScheme="blue"
                leftIcon={<FaSearch />}
                onClick={handleSearch}
                isLoading={loading}
                loadingText="Searching..."
                w="full"
              >
                Search Diseases
              </Button>
            </Box>

            <Divider />

            {/* Results */}
            {loading && (
              <Box textAlign="center" py={8}>
                <Spinner size="lg" color="blue.500" />
                <Text mt={2} color="gray.500">Analyzing symptoms...</Text>
              </Box>
            )}

            {!loading && results.length > 0 && (
              <VStack spacing={3} align="stretch">
                <Text fontWeight="bold" color="gray.600">
                  Found {results.length} potential matches:
                </Text>
                
                {results.map((disease) => (
                  <Box
                    key={disease.id}
                    p={4}
                    borderWidth={1}
                    borderRadius="lg"
                    borderColor="gray.200"
                    _hover={{ borderColor: 'blue.300', bg: 'gray.50' }}
                    transition="all 0.2s"
                  >
                    <HStack justify="space-between" align="start">
                      <VStack align="start" spacing={1} flex={1}>
                        <HStack>
                          <Text fontWeight="bold" fontSize="lg">
                            {disease.name}
                          </Text>
                          <Badge colorScheme={getSimilarityColor(disease.matchPercentage)}>
                            {disease.matchPercentage}% match
                          </Badge>
                        </HStack>
                        
                        <Text fontSize="sm" color="gray.600" noOfLines={2}>
                          {disease.description}
                        </Text>
                      </VStack>
                      
                      <VStack>
                        <Button
                          size="sm"
                          colorScheme="green"
                          onClick={() => handleSelect(disease)}
                        >
                          Select
                        </Button>
                        <IconButton
                          size="xs"
                          variant="ghost"
                          icon={expandedId === disease.id ? <FaChevronUp /> : <FaChevronDown />}
                          onClick={() => toggleExpand(disease.id)}
                          aria-label="Toggle details"
                        />
                      </VStack>
                    </HStack>

                    <Collapse in={expandedId === disease.id}>
                      <Box mt={3} p={3} bg="gray.50" borderRadius="md">
                        <Text fontSize="sm" whiteSpace="pre-wrap">
                          {disease.extract?.substring(0, 500)}
                          {disease.extract?.length > 500 && '...'}
                        </Text>
                        {disease.wikipediaUrl && (
                          <Link
                            href={disease.wikipediaUrl}
                            isExternal
                            color="blue.500"
                            fontSize="sm"
                            mt={2}
                            display="inline-flex"
                            alignItems="center"
                          >
                            Read more on Wikipedia <Icon as={FaExternalLinkAlt} ml={1} boxSize={3} />
                          </Link>
                        )}
                      </Box>
                    </Collapse>
                  </Box>
                ))}
              </VStack>
            )}

            {!loading && results.length === 0 && symptoms && (
              <Box textAlign="center" py={6} color="gray.500">
                <Text>Enter symptoms and click search to find matching diseases</Text>
              </Box>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default DiseaseSearchModal;
