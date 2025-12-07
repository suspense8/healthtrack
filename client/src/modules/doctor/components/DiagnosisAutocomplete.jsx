import { useState, useEffect, useRef, useCallback } from 'react';
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
  Divider,
  Icon,
  Flex,
  Wrap,
  WrapItem,
  IconButton
} from '@chakra-ui/react';
import { SearchIcon, AddIcon, CloseIcon } from '@chakra-ui/icons';
import { FaLightbulb } from 'react-icons/fa';
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

export default function DiagnosisAutocomplete({ 
  value, 
  onChange, 
  symptoms = '',
  placeholder = "Type to search diseases..." 
}) {
  // Parse value: can be string (legacy) or array of diagnosis objects
  const parseValue = useCallback((val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
      // Legacy: parse comma-separated string
      if (val.trim() === '') return [];
      return val.split(',').map(name => ({
        id: `temp-${Date.now()}-${Math.random()}`,
        name: name.trim(),
        description: null,
        matchPercentage: null
      })).filter(d => d.name);
    }
    return [];
  }, []);

  const [selectedDiagnoses, setSelectedDiagnoses] = useState(() => parseValue(value));
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Symptom recommendations
  const [symptomResults, setSymptomResults] = useState([]);
  const [showSymptomResults, setShowSymptomResults] = useState(false);
  const [symptomLoading, setSymptomLoading] = useState(false);
  
  const toast = useToast();
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  
  // Close dropdown when clicking outside
  useOutsideClick({
    ref: wrapperRef,
    handler: () => {
      setShowSuggestions(false);
    }
  });
  
  // Debounce the input for autocomplete
  const debouncedInput = useDebounce(inputValue, 300);
  
  // Fetch autocomplete suggestions
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!debouncedInput || debouncedInput.length < 2) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }
      
      setLoading(true);
      try {
        const res = await api.get(`/doctor/diseases/autocomplete?query=${encodeURIComponent(debouncedInput)}`);
        setSuggestions(res.data);
        if (res.data.length > 0) {
          setShowSuggestions(true);
        } else {
          setShowSuggestions(false);
        }
      } catch (error) {
        console.error('Autocomplete error:', error);
        setShowSuggestions(false);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSuggestions();
  }, [debouncedInput]);
  
  // Input is only for searching - don't update parent
  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    // Don't call onChange - input is just for searching
  };
  
  // Add a disease to the diagnosis list (only from recommendations)
  const addDisease = useCallback((disease, fromSymptomRecommendations = false) => {
    // Check if already added
    const exists = selectedDiagnoses.some(d => 
      d.name.toLowerCase() === disease.name.toLowerCase()
    );
    
    if (exists) {
      toast({
        title: 'Already added',
        description: `${disease.name} is already in the diagnosis list`,
        status: 'info',
        duration: 2000
      });
      return;
    }
    
    // Add to selected diagnoses
    const newDiagnosis = {
      id: disease.id || `temp-${Date.now()}-${Math.random()}`,
      name: disease.name,
      description: disease.description || null,
      matchPercentage: disease.matchPercentage || disease.matchScore || null,
      matchType: disease.matchType || null,
      wikipediaUrl: disease.wikipediaUrl || null
    };
    
    const updatedDiagnoses = [...selectedDiagnoses, newDiagnosis];
    setSelectedDiagnoses(updatedDiagnoses);
    
    // Clear input after selection (only if from autocomplete dropdown, not symptom recommendations)
    if (!fromSymptomRecommendations) {
      setInputValue('');
    setShowSuggestions(false);
    setSuggestions([]);
    }
    // Keep symptom recommendations panel open - don't close it when adding from there
    // The panel will stay open until user clicks "Dismiss" or types in the input
    
    // Notify parent with comma-separated string (for backward compatibility)
    const diagnosisString = updatedDiagnoses.map(d => d.name).join(', ');
    onChange({ target: { name: 'diagnosis', value: diagnosisString } });
    
    toast({
      title: 'Diagnosis added',
      description: disease.name,
      status: 'success',
      duration: 2000
    });
  }, [selectedDiagnoses, onChange, toast]);
  
  // Remove a diagnosis
  const removeDiagnosis = useCallback((diagnosisId) => {
    const updatedDiagnoses = selectedDiagnoses.filter(d => d.id !== diagnosisId);
    setSelectedDiagnoses(updatedDiagnoses);
    
    // Notify parent
    const diagnosisString = updatedDiagnoses.length > 0 
      ? updatedDiagnoses.map(d => d.name).join(', ')
      : '';
    onChange({ target: { name: 'diagnosis', value: diagnosisString } });
  }, [selectedDiagnoses, onChange]);
  
  // Recommend diseases based on symptoms
  const handleRecommendFromSymptoms = async () => {
    if (!symptoms || !symptoms.trim()) {
      toast({
        title: 'No symptoms entered',
        description: 'Please enter symptoms in the Clinical Notes tab first',
        status: 'warning',
        duration: 3000
      });
      return;
    }
    
    setSymptomLoading(true);
    setShowSymptomResults(true);
    
    try {
      const res = await api.post('/doctor/search-diseases', {
        symptoms: symptoms.trim(),
        limit: 6
      });
      setSymptomResults(res.data);
      
      if (res.data.length === 0) {
        toast({
          title: 'No matches found',
          description: 'Try providing more detailed symptoms',
          status: 'info',
          duration: 3000
        });
      }
    } catch (error) {
      console.error('Symptom search error:', error);
      toast({
        title: 'Search failed',
        status: 'error',
        duration: 3000
      });
    } finally {
      setSymptomLoading(false);
    }
  };
  
  // Sync with parent value ONLY when it's a diagnosis string (from backend/initial load)
  // Use a ref to track if we've initialized to avoid re-parsing on every change
  const isInitialMount = useRef(true);
  const lastValueRef = useRef(value);
  
  useEffect(() => {
    // Only parse value on initial mount or when value actually changes from external source
    // (not from our own updates)
    if (isInitialMount.current) {
      // Initial load - parse existing diagnosis string
      if (value) {
        const parsed = parseValue(value);
        setSelectedDiagnoses(parsed);
      }
      setInputValue('');
      isInitialMount.current = false;
      lastValueRef.current = value;
    } else if (value !== lastValueRef.current && typeof value === 'string') {
      // Value changed externally (e.g., loaded from existing consultation)
      // Only update if it's different and looks like a diagnosis string
      const parsed = parseValue(value);
      setSelectedDiagnoses(parsed);
      setInputValue('');
      lastValueRef.current = value;
    }
  }, [value, parseValue]);
  
  return (
    <Box ref={wrapperRef} position="relative" w="full">
      {/* Selected Diagnoses as Chips/Bubbles */}
      {selectedDiagnoses.length > 0 && (
        <Box 
          mb={4} 
          p={3} 
          bg="blue.50" 
          borderRadius="md" 
          borderWidth="1px" 
          borderColor="blue.200"
        >
          <HStack mb={2}>
            <Text fontSize="sm" fontWeight="semibold" color="blue.700">
              Selected Diagnoses ({selectedDiagnoses.length})
            </Text>
          </HStack>
          <Wrap spacing={2}>
            {selectedDiagnoses.map((diagnosis) => (
              <WrapItem key={diagnosis.id}>
                <Badge
                  px={3}
                  py={2}
                  borderRadius="full"
                  colorScheme="blue"
                  fontSize="sm"
                  fontWeight="medium"
                  display="flex"
                  alignItems="center"
                  gap={2}
                  cursor="default"
                  boxShadow="sm"
                  border="1px solid"
                  borderColor="blue.300"
                  bg="white"
                  transition="all 0.2s"
                  _hover={{
                    transform: 'translateY(-1px)',
                    boxShadow: 'md',
                    borderColor: 'blue.400'
                  }}
                >
                  <Text noOfLines={1} maxW="200px">
                    {diagnosis.name}
                  </Text>
                  {diagnosis.matchPercentage && (
                    <Badge
                      variant="subtle"
                      colorScheme={diagnosis.matchPercentage >= 70 ? 'green' : diagnosis.matchPercentage >= 50 ? 'yellow' : 'orange'}
                      fontSize="2xs"
                      borderRadius="full"
                      px={1.5}
                    >
                      {diagnosis.matchPercentage}%
                    </Badge>
                  )}
                  <IconButton
                    icon={<CloseIcon />}
                    size="xs"
                    variant="ghost"
                    colorScheme="blue"
                    aria-label="Remove diagnosis"
                    onClick={() => removeDiagnosis(diagnosis.id)}
                    _hover={{ bg: 'red.100', color: 'red.600' }}
                    h="18px"
                    minW="18px"
                    borderRadius="full"
                  />
                </Badge>
              </WrapItem>
            ))}
          </Wrap>
        </Box>
      )}
      
      {/* Input with autocomplete */}
      <HStack>
        <Box position="relative" flex={1}>
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => {
              // Show suggestions if we have them and input has text
              if (suggestions.length > 0 && inputValue.length >= 2) {
                setShowSuggestions(true);
              }
            }}
            placeholder={selectedDiagnoses.length > 0 ? "Add another diagnosis..." : placeholder}
            pr={loading ? 10 : 4}
          />
          {loading && (
            <Spinner 
              size="sm" 
              position="absolute" 
              right={3} 
              top="50%" 
              transform="translateY(-50%)" 
              color="blue.500"
            />
          )}
        </Box>
        
        <Button
          leftIcon={<Icon as={FaLightbulb} />}
          colorScheme="purple"
          variant={symptoms?.trim() ? 'solid' : 'outline'}
          onClick={handleRecommendFromSymptoms}
          isLoading={symptomLoading}
          size="md"
        >
          Recommend from Symptoms
        </Button>
      </HStack>
      
      {/* Autocomplete dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <Box
          position="absolute"
          top="100%"
          left={0}
          right={0}
          mt={1}
          bg="white"
          borderWidth={1}
          borderColor="gray.200"
          borderRadius="md"
          boxShadow="lg"
          zIndex={1000}
          maxH="250px"
          overflowY="auto"
        >
          {suggestions.map((disease) => (
            <Box
              key={disease.id}
              px={4}
              py={2}
              _hover={{ bg: 'blue.50', cursor: 'pointer' }}
              onClick={() => addDisease(disease, false)}
              borderBottomWidth={1}
              borderColor="gray.100"
              opacity={selectedDiagnoses.some(d => 
                d.name.toLowerCase() === disease.name.toLowerCase()
              ) ? 0.6 : 1}
            >
              <HStack justify="space-between">
                <VStack align="start" spacing={0} flex={1}>
                  <HStack>
                  <Text fontWeight="medium">{disease.name}</Text>
                    {selectedDiagnoses.some(d => 
                      d.name.toLowerCase() === disease.name.toLowerCase()
                    ) && (
                      <Badge colorScheme="green" size="sm" fontSize="2xs">
                        Added
                      </Badge>
                    )}
                  </HStack>
                  {disease.description && (
                    <Text fontSize="xs" color="gray.500" noOfLines={1}>
                      {disease.description}
                    </Text>
                  )}
                </VStack>
                <Badge colorScheme={disease.matchScore >= 90 ? 'green' : 'blue'} size="sm">
                  {disease.matchScore}%
                </Badge>
              </HStack>
            </Box>
          ))}
        </Box>
      )}
      
      {/* Symptom-based recommendations panel */}
      <Collapse in={showSymptomResults} animateOpacity>
        <Box 
          mt={3} 
          p={4} 
          bg="purple.50" 
          borderRadius="md" 
          borderWidth={1} 
          borderColor="purple.200"
        >
          <HStack justify="space-between" mb={3}>
            <HStack>
              <Icon as={FaLightbulb} color="purple.500" />
              <Text fontWeight="bold" color="purple.700" fontSize="sm">
                Recommendations based on symptoms
              </Text>
            </HStack>
            <Button 
              size="xs" 
              variant="ghost" 
              onClick={() => setShowSymptomResults(false)}
              leftIcon={<CloseIcon />}
            >
              Dismiss
            </Button>
          </HStack>
          
          {symptomLoading ? (
            <HStack justify="center" py={4}>
              <Spinner size="sm" color="purple.500" />
              <Text color="purple.600" fontSize="sm">Analyzing symptoms...</Text>
            </HStack>
          ) : symptomResults.length === 0 ? (
            <Text color="gray.500" fontSize="sm" textAlign="center" py={2}>
              No matching diseases found
            </Text>
          ) : (
            <VStack align="stretch" spacing={2}>
              {symptomResults.map((disease) => {
                const isAdded = selectedDiagnoses.some(d => 
                  d.name.toLowerCase() === disease.name.toLowerCase()
                );
                return (
                <HStack 
                  key={disease.id} 
                  justify="space-between" 
                  p={2} 
                    bg={isAdded ? "green.50" : "white"}
                  borderRadius="md"
                  borderWidth={1}
                    borderColor={isAdded ? "green.200" : "purple.100"}
                    opacity={isAdded ? 0.8 : 1}
                    transition="all 0.2s"
                >
                  <VStack align="start" spacing={0} flex={1}>
                    <HStack>
                      <Text fontWeight="medium" fontSize="sm">{disease.name}</Text>
                        {isAdded && (
                          <Badge colorScheme="green" size="sm" fontSize="2xs">
                            ✓ Added
                          </Badge>
                        )}
                      <Badge 
                        colorScheme={disease.matchPercentage >= 70 ? 'green' : disease.matchPercentage >= 50 ? 'yellow' : 'orange'}
                        size="sm"
                      >
                        {disease.matchPercentage}% match
                      </Badge>
                      {disease.matchType && (
                        <Badge variant="outline" size="sm" colorScheme="gray">
                          {disease.matchType}
                        </Badge>
                      )}
                    </HStack>
                    {disease.description && (
                      <Text fontSize="xs" color="gray.500" noOfLines={1}>
                        {disease.description}
                      </Text>
                    )}
                  </VStack>
                  <Button
                    size="xs"
                      colorScheme={isAdded ? "gray" : "green"}
                    leftIcon={<AddIcon />}
                      onClick={() => addDisease(disease, true)}
                      isDisabled={isAdded}
                      variant={isAdded ? "outline" : "solid"}
                  >
                      {isAdded ? 'Added' : 'Add'}
                  </Button>
                </HStack>
                );
              })}
            </VStack>
          )}
        </Box>
      </Collapse>
      
      <Text fontSize="xs" color="gray.500" mt={1}>
        {selectedDiagnoses.length > 0 
          ? `${selectedDiagnoses.length} diagnosis${selectedDiagnoses.length > 1 ? 'es' : ''} added. Click to remove.`
          : 'Start typing to search diseases, or click "Recommend from Symptoms" to get AI suggestions'}
      </Text>
    </Box>
  );
}
