/**
 * Text formatting utilities for consistent data display
 */

/**
 * Converts a string to Title Case (capitalize first letter of each word)
 * @param {string} str - Input string
 * @returns {string} - Title cased string
 */
export const toTitleCase = (str) => {
  if (!str || typeof str !== 'string') return '';
  
  return str
    .toLowerCase()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Formats phone number with country code and spaces
 * @param {string} phone - Phone number (digits only)
 * @param {string} countryCode - Country code (e.g., "+231")
 * @returns {string} - Formatted phone (e.g., "+231 77 123 4567")
 */
export const formatPhone = (phone, countryCode = '+231') => {
  if (!phone) return '';
  
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  
  if (!digits) return '';
  
  // Format based on length (Liberia format: +231 XX XXX XXXX)
  if (digits.length <= 2) {
    return `${countryCode} ${digits}`;
  } else if (digits.length <= 4) {
    return `${countryCode} ${digits.slice(0, 2)} ${digits.slice(2)}`;
  } else if (digits.length <= 7) {
    return `${countryCode} ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
  } else {
    return `${countryCode} ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 9)}`;
  }
};

/**
 * Extracts digits only from phone number (for storage)
 * @param {string} phone - Formatted phone number
 * @returns {string} - Digits only
 */
export const extractPhoneDigits = (phone) => {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
};

/**
 * Formats address to Title Case
 * @param {string} address - Address string
 * @returns {string} - Title cased address
 */
export const formatAddress = (address) => {
  if (!address) return '';
  return toTitleCase(address);
};

/**
 * Formats comma-separated list (allergies, conditions) to Title Case
 * @param {string} list - Comma-separated string
 * @returns {string} - Title cased list
 */
export const formatCommaList = (list) => {
  if (!list) return '';
  return list
    .split(',')
    .map(item => toTitleCase(item.trim()))
    .filter(item => item)
    .join(', ');
};

