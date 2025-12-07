import { useState, useEffect } from 'react';
import {
  FormControl,
  FormLabel,
  Input,
  HStack,
  Text,
  FormHelperText,
  FormErrorMessage
} from '@chakra-ui/react';

/**
 * AgeInput component that:
 * - Auto-calculates age from date_of_birth when provided
 * - Allows manual entry when DOB is unknown (emergency mode)
 * - Displays age in "X years" format
 */
export default function AgeInput({
  name,
  value, // Age value (integer)
  dateOfBirth, // Date of birth (ISO date string)
  onChange,
  label = 'Age',
  isRequired = false,
  error,
  allowManualEntry = true, // Allow manual entry when DOB unknown
  ...props
}) {
  const [age, setAge] = useState(value || '');
  const [isManual, setIsManual] = useState(!dateOfBirth && allowManualEntry);

  // Calculate age from DOB when DOB changes
  useEffect(() => {
    if (dateOfBirth && !isManual) {
      const dob = new Date(dateOfBirth);
      const today = new Date();
      let calculatedAge = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        calculatedAge--;
      }
      
      if (calculatedAge >= 0 && calculatedAge <= 120) {
        setAge(calculatedAge.toString());
        
        if (onChange) {
          onChange({
            target: {
              name,
              value: calculatedAge
            }
          });
        }
      }
    } else if (!dateOfBirth && allowManualEntry) {
      setIsManual(true);
    } else if (dateOfBirth) {
      setIsManual(false);
    }
  }, [dateOfBirth, isManual, name, onChange, allowManualEntry]);

  // Update when value prop changes externally
  useEffect(() => {
    if (value !== undefined && value !== null) {
      setAge(value.toString());
    }
  }, [value]);

  const handleChange = (e) => {
    const inputValue = e.target.value;
    
    // Allow only digits
    const digitsOnly = inputValue.replace(/\D/g, '');
    
    // Limit to 0-120
    let numValue = parseInt(digitsOnly) || 0;
    if (numValue > 120) numValue = 120;
    if (numValue < 0) numValue = 0;
    
    setAge(numValue.toString());
    setIsManual(true);
    
    if (onChange) {
      onChange({
        target: {
          name,
          value: numValue || null
        }
      });
    }
  };

  const displayAge = age ? `${age} ${age === '1' ? 'year' : 'years'}` : '';

  return (
    <FormControl isRequired={isRequired} isInvalid={!!error} {...props}>
      <FormLabel>{label}</FormLabel>
      <HStack spacing={2} align="flex-end">
        <Input
          name={name}
          value={age}
          onChange={handleChange}
          placeholder="Enter age"
          type="number"
          min={0}
          max={120}
          bg="white"
          width="120px"
          isReadOnly={!isManual && dateOfBirth}
          {...props}
        />
        {displayAge && (
          <Text color="gray.600" fontSize="sm" mb={1}>
            {displayAge}
          </Text>
        )}
      </HStack>
      {dateOfBirth && !isManual && (
        <FormHelperText fontSize="xs" color="blue.600">
          ✓ Calculated from date of birth
        </FormHelperText>
      )}
      {isManual && !dateOfBirth && (
        <FormHelperText fontSize="xs" color="orange.600">
          ⚠️ Manual entry (DOB unknown)
        </FormHelperText>
      )}
      {error && (
        <FormErrorMessage>{error}</FormErrorMessage>
      )}
    </FormControl>
  );
}

