import { useState, useEffect } from 'react';
import { FormControl, FormLabel, Input, Select, HStack, Box } from '@chakra-ui/react';
import { formatPhone, extractPhoneDigits } from '../../utils/textFormatters';

// Common African country codes (prioritizing Liberia)
const COUNTRY_CODES = [
  { code: '+232', country: 'Sierra Leone', flag: '🇸🇱' },
  { code: '+231', country: 'Liberia', flag: '🇱🇷' },
  { code: '+233', country: 'Ghana', flag: '🇬🇭' },
  { code: '+234', country: 'Nigeria', flag: '🇳🇬' },
  { code: '+225', country: 'Côte d\'Ivoire', flag: '🇨🇮' },
  { code: '+220', country: 'Gambia', flag: '🇬🇲' },
  { code: '+221', country: 'Senegal', flag: '🇸🇳' },
  { code: '+224', country: 'Guinea', flag: '🇬🇳' },
  { code: '+235', country: 'Chad', flag: '🇹🇩' },
  { code: '+236', country: 'CAR', flag: '🇨🇫' },
  { code: '+237', country: 'Cameroon', flag: '🇨🇲' },
  { code: '+238', country: 'Cape Verde', flag: '🇨🇻' },
  { code: '+239', country: 'São Tomé', flag: '🇸🇹' },
  { code: '+240', country: 'Equatorial Guinea', flag: '🇬🇶' },
  { code: '+241', country: 'Gabon', flag: '🇬🇦' },
  { code: '+242', country: 'Congo', flag: '🇨🇬' },
  { code: '+243', country: 'DRC', flag: '🇨🇩' },
  { code: '+244', country: 'Angola', flag: '🇦🇴' },
  { code: '+245', country: 'Guinea-Bissau', flag: '🇬🇼' },
  { code: '+246', country: 'British Indian Ocean', flag: '🇮🇴' },
  { code: '+247', country: 'Ascension Island', flag: '🇦🇨' },
  { code: '+248', country: 'Seychelles', flag: '🇸🇨' },
  { code: '+249', country: 'Sudan', flag: '🇸🇩' },
  { code: '+250', country: 'Rwanda', flag: '🇷🇼' },
  { code: '+251', country: 'Ethiopia', flag: '🇪🇹' },
  { code: '+252', country: 'Somalia', flag: '🇸🇴' },
  { code: '+253', country: 'Djibouti', flag: '🇩🇯' },
  { code: '+254', country: 'Kenya', flag: '🇰🇪' },
  { code: '+255', country: 'Tanzania', flag: '🇹🇿' },
  { code: '+256', country: 'Uganda', flag: '🇺🇬' },
  { code: '+257', country: 'Burundi', flag: '🇧🇮' },
  { code: '+258', country: 'Mozambique', flag: '🇲🇿' },
  { code: '+260', country: 'Zambia', flag: '🇿🇲' },
  { code: '+261', country: 'Madagascar', flag: '🇲🇬' },
  { code: '+262', country: 'Réunion', flag: '🇷🇪' },
  { code: '+263', country: 'Zimbabwe', flag: '🇿🇼' },
  { code: '+264', country: 'Namibia', flag: '🇳🇦' },
  { code: '+265', country: 'Malawi', flag: '🇲🇼' },
  { code: '+266', country: 'Lesotho', flag: '🇱🇸' },
  { code: '+267', country: 'Botswana', flag: '🇧🇼' },
  { code: '+268', country: 'Eswatini', flag: '🇸🇿' },
  { code: '+269', country: 'Comoros', flag: '🇰🇲' },
  { code: '+27', country: 'South Africa', flag: '🇿🇦' },
];

/**
 * PhoneInput component with country code dropdown and auto-formatting
 */
export default function PhoneInput({
  name,
  value = '',
  onChange,
  label = 'Phone Number',
  isRequired = false,
  error,
  placeholder = '77 123 456',
  countryCode: initialCountryCode = '+232',
  ...props
}) {
  const [countryCode, setCountryCode] = useState(initialCountryCode);
  const [displayValue, setDisplayValue] = useState('');

  // Initialize display value from stored value
  useEffect(() => {
    if (value) {
      // If value already has country code, extract it
      const match = value.match(/^(\+\d{1,3})\s*(.+)$/);
      if (match) {
        setCountryCode(match[1]);
        setDisplayValue(match[2].replace(/\s/g, ''));
      } else {
        // Assume it's just digits, format it
        setDisplayValue(value.replace(/\D/g, ''));
      }
    } else {
      setDisplayValue('');
    }
  }, [value]);

  const handleCountryCodeChange = (e) => {
    const newCode = e.target.value;
    setCountryCode(newCode);
    
    // Update parent with full formatted number
    const digits = extractPhoneDigits(displayValue);
    const formatted = formatPhone(digits, newCode);
    const fullNumber = formatted.replace(countryCode, newCode);
    
    if (onChange) {
      onChange({
        target: {
          name,
          value: fullNumber
        }
      });
    }
  };

  const handlePhoneChange = (e) => {
    const input = e.target.value;
    // Remove all non-digits
    const digits = extractPhoneDigits(input);
    
    // Limit to reasonable length (15 digits max for international)
    const limitedDigits = digits.slice(0, 15);
    setDisplayValue(limitedDigits);
    
    // Format and update parent
    const formatted = formatPhone(limitedDigits, countryCode);
    
    if (onChange) {
      onChange({
        target: {
          name,
          value: formatted
        }
      });
    }
  };

  // Filter country codes as user types in dropdown
  const [codeFilter, setCodeFilter] = useState('');
  const filteredCodes = COUNTRY_CODES.filter(cc => 
    cc.code.includes(codeFilter) || 
    cc.country.toLowerCase().includes(codeFilter.toLowerCase())
  );

  return (
    <FormControl isRequired={isRequired} isInvalid={!!error} {...props}>
      <FormLabel>{label}</FormLabel>
      <HStack spacing={2}>
        <Box width="140px">
          <Select
            value={countryCode}
            onChange={handleCountryCodeChange}
            onFocus={() => setCodeFilter('')}
            size="md"
            bg="white"
          >
            {filteredCodes.map(cc => (
              <option key={cc.code} value={cc.code}>
                {cc.flag} {cc.code}
              </option>
            ))}
          </Select>
        </Box>
        <Input
          name={name}
          value={formatPhone(displayValue, countryCode).replace(countryCode + ' ', '')}
          onChange={handlePhoneChange}
          placeholder={placeholder}
          bg="white"
          type="tel"
        />
      </HStack>
      {error && (
        <Box color="red.500" fontSize="sm" mt={1}>
          {error}
        </Box>
      )}
    </FormControl>
  );
}

