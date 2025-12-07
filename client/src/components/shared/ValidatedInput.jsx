import { useState, useEffect } from 'react';
import {
  FormControl,
  FormLabel,
  Input,
  FormErrorMessage,
  FormHelperText,
  Textarea
} from '@chakra-ui/react';
import { toTitleCase } from '../../utils/textFormatters';

/**
 * ValidatedInput component that:
 * - Stores lowercase in state
 * - Displays Title Case to user
 * - Shows validation errors
 */
export default function ValidatedInput({
  name,
  value = '',
  onChange,
  label,
  placeholder,
  isRequired = false,
  error,
  helperText,
  schema,
  type = 'text',
  as = 'input', // 'input' or 'textarea'
  onBlur,
  warning, // Warning object: { level: 'warning', message: '...' }
  ...props
}) {
  const [displayValue, setDisplayValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  // Update display value when prop value changes (but not while focused)
  useEffect(() => {
    if (!isFocused && value !== undefined) {
      // Convert to Title Case for display
      if (type === 'text' && value) {
        setDisplayValue(toTitleCase(value));
      } else {
        setDisplayValue(value);
      }
    }
  }, [value, isFocused, type]);

  const handleChange = (e) => {
    const inputValue = e.target.value;
    setDisplayValue(inputValue);
    
    // Store lowercase for text fields (except numbers, emails, etc.)
    let storageValue = inputValue;
    if (type === 'text' && as === 'input') {
      // Store as lowercase, but keep original for display while typing
      storageValue = inputValue.toLowerCase();
    }
    
    if (onChange) {
      onChange({
        target: {
          name,
          value: storageValue
        }
      });
    }
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    
    // Convert to Title Case on blur for text fields
    if (type === 'text' && displayValue) {
      const titleCased = toTitleCase(displayValue);
      setDisplayValue(titleCased);
      
      // Update parent with title-cased value (will be lowercased on next change)
      if (onChange) {
        onChange({
          target: {
            name,
            value: titleCased.toLowerCase()
          }
        });
      }
    }
    
    if (onBlur) {
      onBlur(e);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    // Show lowercase while typing
    if (type === 'text' && value) {
      setDisplayValue(value.toLowerCase());
    }
  };

  // Determine border color based on validation state
  const getBorderColor = () => {
    if (error) return 'red.500';
    if (warning) {
      if (warning.level === 'warning') return 'orange.400';
      if (warning.level === 'error') return 'red.500';
    }
    return 'gray.200';
  };

  const InputComponent = as === 'textarea' ? Textarea : Input;

  return (
    <FormControl isRequired={isRequired} isInvalid={!!error} {...props}>
      {label && <FormLabel>{label}</FormLabel>}
      <InputComponent
        name={name}
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        placeholder={placeholder}
        type={type}
        bg="white"
        borderColor={getBorderColor()}
        _focus={{
          borderColor: error ? 'red.500' : warning ? 'orange.400' : 'blue.500',
          boxShadow: error 
            ? '0 0 0 1px red.500' 
            : warning 
            ? '0 0 0 1px orange.400' 
            : '0 0 0 1px blue.500'
        }}
        {...props}
      />
      {error && (
        <FormErrorMessage>{error}</FormErrorMessage>
      )}
      {warning && !error && (
        <FormHelperText color={warning.level === 'warning' ? 'orange.500' : 'red.500'}>
          ⚠️ {warning.message}
        </FormHelperText>
      )}
      {helperText && !error && !warning && (
        <FormHelperText>{helperText}</FormHelperText>
      )}
    </FormControl>
  );
}

