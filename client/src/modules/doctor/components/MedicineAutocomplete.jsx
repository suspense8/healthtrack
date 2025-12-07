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
  InputGroup,
  InputLeftElement
} from '@chakra-ui/react';
import { SearchIcon, AddIcon, CloseIcon } from '@chakra-ui/icons';
import { FaPills, FaLightbulb } from 'react-icons/fa';
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

export default function MedicineAutocomplete({ 
  value, 
  onChange,
  onSelect,
  placeholder = "Type to search medicines...",
  requireSelection = true,
  error,
  selectedMedicineId = null,
  diagnosis = '' // Diagnosis string for medication recommendations
}) {
  const [inputValue, setInputValue] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isValidSelection, setIsValidSelection] = useState(!!selectedMedicineId);
  const [hasMatch, setHasMatch] = useState(false);
  
  // Medication recommendations based on diagnosis
  const [recommendationResults, setRecommendationResults] = useState([]);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [recommendationLoading, setRecommendationLoading] = useState(false);
  
  const toast = useToast();
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  
  // Check if input matches any suggestion
  const checkInputMatch = useCallback((input, suggestionsList) => {
    if (!input || !suggestionsList || suggestionsList.length === 0) {
      return false;
    }
    
    const inputLower = input.toLowerCase().trim();
    
    // Check for exact match or close match
    return suggestionsList.some(medicine => {
      const nameMatch = medicine.name?.toLowerCase().trim() === inputLower;
      const genericMatch = medicine.genericName?.toLowerCase().trim() === inputLower;
      
      // Check if input is a substring of medicine name (with high similarity)
      const nameContains = medicine.name?.toLowerCase().includes(inputLower);
      const genericContains = medicine.genericName?.toLowerCase().includes(inputLower);
      
      // Consider it a match if exact match or if input is at least 3 chars and contained in name
      return nameMatch || genericMatch || (inputLower.length >= 3 && (nameContains || genericContains));
    });
  }, []);
  
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
        setHasMatch(false);
        return;
      }
      
      setLoading(true);
      try {
        const res = await api.get(`/doctor/medicines/autocomplete?query=${encodeURIComponent(debouncedInput)}`);
        setSuggestions(res.data);
        
        // Check if input matches any suggestion
        const matches = checkInputMatch(debouncedInput, res.data);
        setHasMatch(matches);
        
        // If there's a match and requireSelection is true, mark as valid
        if (matches && requireSelection && !selectedMedicineId) {
          setIsValidSelection(true);
        }
        
        if (res.data.length > 0) {
          setShowSuggestions(true);
        } else {
          setShowSuggestions(false);
        }
      } catch (error) {
        console.error('Medicine autocomplete error:', error);
        setHasMatch(false);
        setShowSuggestions(false);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSuggestions();
  }, [debouncedInput, checkInputMatch, requireSelection, selectedMedicineId]);
  
  // Update parent when input changes
  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    // Check if new value matches any current suggestion
    if (newValue && suggestions.length > 0) {
      const matches = checkInputMatch(newValue, suggestions);
      setHasMatch(matches);
      
      if (requireSelection && !selectedMedicineId) {
        setIsValidSelection(matches);
      }
    } else if (newValue && suggestions.length === 0) {
      // No suggestions yet, wait for them to load
      setHasMatch(false);
      if (requireSelection && !selectedMedicineId) {
        setIsValidSelection(false);
      }
    } else if (!newValue) {
      setHasMatch(false);
      setIsValidSelection(false);
    }
    
    if (onChange) {
      onChange(newValue);
    }
  };
  
  // Recommend medicines based on diagnosis
  const handleRecommendFromDiagnosis = async () => {
    if (!diagnosis || !diagnosis.trim()) {
      toast({
        title: 'No diagnosis entered',
        description: 'Please enter a diagnosis first',
        status: 'warning',
        duration: 3000
      });
      return;
    }
    
    setRecommendationLoading(true);
    setShowRecommendations(true);
    
    try {
      const res = await api.post('/doctor/search-medicines', {
        query: diagnosis.trim(),
        limit: 6
      });
      setRecommendationResults(res.data);
      
      if (res.data.length === 0) {
        toast({
          title: 'No matches found',
          description: 'Try providing more detailed diagnosis',
          status: 'info',
          duration: 3000
        });
      }
    } catch (error) {
      console.error('Medicine recommendation error:', error);
      toast({
        title: 'Recommendation failed',
        status: 'error',
        duration: 3000
      });
    } finally {
      setRecommendationLoading(false);
    }
  };

  // Select a medicine
  const selectMedicine = useCallback((medicine, fromRecommendations = false) => {
    // Clear input after selection (for both autocomplete and recommendations)
    setInputValue('');
    
    // Clear autocomplete dropdown (only if not from recommendations)
    if (!fromRecommendations) {
      setShowSuggestions(false);
      setSuggestions([]);
    }
    // Keep recommendations panel open if adding from there
    
    setIsValidSelection(true);
    setHasMatch(true); // Mark as matched when selected
    
    if (onSelect) {
      onSelect(medicine);
    }
    
    if (onChange) {
      onChange(''); // Clear input in parent as well
    }
    
    toast({
      title: 'Medicine selected',
      description: medicine.genericName ? `${medicine.name} (${medicine.genericName})` : medicine.name,
      status: 'success',
      duration: 2000
    });
  }, [onSelect, onChange, toast]);
  
  // Sync with parent value
  useEffect(() => {
    setInputValue(value || '');
  }, [value]);
  
  // Track selected medicine ID
  useEffect(() => {
    if (selectedMedicineId) {
      setIsValidSelection(true);
      setHasMatch(true);
    } else if (inputValue) {
      // If medicine ID is cleared but input exists, re-check match
      if (suggestions.length > 0) {
        const matches = checkInputMatch(inputValue, suggestions);
        setHasMatch(matches);
        setIsValidSelection(matches);
      } else {
        // If no suggestions yet, wait for them to load
        // Don't invalidate immediately
        setHasMatch(false);
      }
    }
  }, [selectedMedicineId, inputValue, suggestions, checkInputMatch]);
  
  // Validate on blur if requireSelection is true
  const handleBlur = () => {
    // Use a small delay to allow click events on suggestions to complete first
    setTimeout(() => {
      // Only show error if:
      // 1. requireSelection is true
      // 2. There's input value
      // 3. No medicine ID is selected (check again after delay)
      // 4. No match found in suggestions
      // 5. Not already valid
      if (requireSelection && inputValue && !selectedMedicineId && !hasMatch && !isValidSelection) {
        setIsValidSelection(false);
        toast({
          title: 'Please select a medicine',
          description: 'You must select a medicine from the database for safety.',
          status: 'warning',
          duration: 3000
        });
      }
      // If there's a match or valid selection, keep it valid
      else if (hasMatch || isValidSelection || selectedMedicineId) {
        setIsValidSelection(true);
        setHasMatch(true);
      }
    }, 150); // Small delay to allow click to register
  };
  
  return (
    <Box ref={wrapperRef} position="relative" w="full">
      <HStack spacing={2}>
        <InputGroup flex={1}>
          <InputLeftElement>
            {loading ? <Spinner size="sm" /> : <Icon as={FaPills} color="gray.400" />}
          </InputLeftElement>
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => {
              if (suggestions.length > 0 && inputValue.length >= 2) {
                setShowSuggestions(true);
              }
            }}
            onBlur={handleBlur}
            placeholder={placeholder}
            autoComplete="off"
          isInvalid={
            // Only show invalid if:
            // 1. There's an error prop AND no valid selection/match
            // 2. OR requireSelection is true AND input exists AND no valid selection/match
            (error && !selectedMedicineId && !hasMatch && !isValidSelection) ||
            (requireSelection && inputValue && !isValidSelection && !hasMatch && !selectedMedicineId)
          }
          borderColor={
            // Priority: error > valid > default
            (error && !selectedMedicineId && !hasMatch && !isValidSelection) ||
            (requireSelection && inputValue && !isValidSelection && !hasMatch && !selectedMedicineId)
              ? 'red.300'
              : (selectedMedicineId || isValidSelection || hasMatch) && inputValue
              ? 'green.400'
              : undefined
          }
          focusBorderColor={
            (error && !selectedMedicineId && !hasMatch && !isValidSelection) ||
            (requireSelection && inputValue && !isValidSelection && !hasMatch && !selectedMedicineId)
              ? 'red.500'
              : (selectedMedicineId || isValidSelection || hasMatch) && inputValue
              ? 'green.500'
              : 'blue.500'
          }
          _hover={{
            borderColor:
              (error && !selectedMedicineId && !hasMatch && !isValidSelection) ||
              (requireSelection && inputValue && !isValidSelection && !hasMatch && !selectedMedicineId)
                ? 'red.400'
                : (selectedMedicineId || isValidSelection || hasMatch) && inputValue
                ? 'green.400'
                : undefined
          }}
        />
        </InputGroup>
        
        {diagnosis && (
          <Button
            leftIcon={<Icon as={FaLightbulb} />}
            colorScheme="purple"
            variant={diagnosis?.trim() ? 'solid' : 'outline'}
            onClick={handleRecommendFromDiagnosis}
            isLoading={recommendationLoading}
            size="md"
          >
            Recommend from Diagnosis
          </Button>
        )}
      </HStack>
      
      {/* Suggestions Dropdown */}
      <Collapse in={showSuggestions && suggestions.length > 0} animateOpacity>
        <Box
          position="absolute"
          zIndex={1000}
          w="full"
          mt={1}
          bg="white"
          border="1px"
          borderColor="gray.200"
          borderRadius="md"
          boxShadow="xl"
          maxH="400px"
          overflowY="auto"
          overflowX="hidden"
        >
          <VStack align="stretch" spacing={0} divider={<Divider />}>
            {suggestions.slice(0, 10).map((medicine) => (
              <Box
                key={medicine.id}
                p={3}
                cursor="pointer"
                _hover={{ bg: 'blue.50', borderLeft: '3px solid', borderLeftColor: 'blue.500' }}
                onClick={() => selectMedicine(medicine, false)}
                transition="all 0.2s"
              >
                <VStack align="start" spacing={1}>
                  <HStack justify="space-between" w="full" align="start">
                    <VStack align="start" spacing={0.5} flex={1} minW={0}>
                      <Text 
                        fontWeight="semibold" 
                        fontSize="sm" 
                        color="gray.800"
                        noOfLines={1}
                        title={medicine.name}
                      >
                        {medicine.name}
                      </Text>
                      {medicine.genericName && (
                        <Text 
                          fontSize="xs" 
                          color="gray.500"
                          noOfLines={1}
                          title={medicine.genericName}
                        >
                          {medicine.genericName}
                        </Text>
                      )}
                    </VStack>
                    {medicine.matchScore && medicine.matchScore > 0.8 && (
                      <Badge 
                        fontSize="2xs" 
                        colorScheme="green" 
                        variant="subtle"
                        ml={2}
                      >
                        {Math.round(medicine.matchScore * 100)}%
                      </Badge>
                    )}
                    {medicine.isOutOfStock && (
                      <Badge fontSize="2xs" colorScheme="red" ml={2}>
                        Out of Stock
                      </Badge>
                    )}
                    {medicine.isLowStock && !medicine.isOutOfStock && (
                      <Badge fontSize="2xs" colorScheme="orange" ml={2}>
                        Low Stock
                      </Badge>
                    )}
                  </HStack>
                  <HStack spacing={2} mt={1} flexWrap="wrap">
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
                        {medicine.ndcCode}
                      </Badge>
                    )}
                    {medicine.quantity !== undefined && (
                      <Badge 
                        fontSize="2xs" 
                        colorScheme={medicine.isOutOfStock ? 'red' : medicine.isLowStock ? 'orange' : 'green'}
                        variant="subtle"
                        fontWeight="normal"
                      >
                        Stock: {medicine.quantity} {medicine.unit}
                      </Badge>
                    )}
                  </HStack>
                </VStack>
              </Box>
            ))}
            {suggestions.length > 10 && (
              <Box p={2} textAlign="center" bg="gray.50">
                <Text fontSize="xs" color="gray.500">
                  Showing top 10 results. Type more to refine search.
                </Text>
              </Box>
            )}
          </VStack>
        </Box>
      </Collapse>
      
      {/* Diagnosis-based recommendations panel */}
      <Collapse in={showRecommendations} animateOpacity>
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
                Recommendations based on diagnosis
              </Text>
            </HStack>
            <Button 
              size="xs" 
              variant="ghost" 
              onClick={() => setShowRecommendations(false)}
              leftIcon={<CloseIcon />}
            >
              Dismiss
            </Button>
          </HStack>
          
          {recommendationLoading ? (
            <HStack justify="center" py={4}>
              <Spinner size="sm" color="purple.500" />
              <Text color="purple.600" fontSize="sm">Analyzing diagnosis...</Text>
            </HStack>
          ) : recommendationResults.length === 0 ? (
            <Text color="gray.500" fontSize="sm" textAlign="center" py={2}>
              No matching medicines found
            </Text>
          ) : (
            <VStack align="stretch" spacing={2}>
              {recommendationResults.map((medicine) => (
                <HStack 
                  key={medicine.id} 
                  justify="space-between" 
                  p={2} 
                  bg="white"
                  borderRadius="md"
                  borderWidth={1}
                  borderColor="purple.100"
                  transition="all 0.2s"
                >
                  <VStack align="start" spacing={0} flex={1}>
                    <HStack>
                      <Text fontWeight="medium" fontSize="sm">{medicine.name}</Text>
                      {medicine.matchScore && medicine.matchScore > 0.8 && (
                        <Badge 
                          colorScheme="green" 
                          size="sm" 
                          fontSize="2xs"
                        >
                          {Math.round(medicine.matchScore * 100)}% match
                        </Badge>
                      )}
                      {medicine.isOutOfStock && (
                        <Badge colorScheme="red" size="sm" fontSize="2xs">
                          Out of Stock
                        </Badge>
                      )}
                      {medicine.isLowStock && !medicine.isOutOfStock && (
                        <Badge colorScheme="orange" size="sm" fontSize="2xs">
                          Low Stock
                        </Badge>
                      )}
                    </HStack>
                    {medicine.genericName && (
                      <Text fontSize="xs" color="gray.500" noOfLines={1}>
                        {medicine.genericName}
                      </Text>
                    )}
                    {medicine.quantity !== undefined && (
                      <Text fontSize="xs" color="gray.600">
                        Stock: {medicine.quantity} {medicine.unit || 'units'}
                      </Text>
                    )}
                  </VStack>
                  <Button
                    size="xs"
                    colorScheme="green"
                    leftIcon={<AddIcon />}
                    onClick={() => selectMedicine(medicine, true)}
                    variant="solid"
                  >
                    Add
                  </Button>
                </HStack>
              ))}
            </VStack>
          )}
        </Box>
      </Collapse>
    </Box>
  );
}


