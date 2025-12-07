/**
 * Deeply transforms object string values to lowercase
 * Useful for normalizing data before storage
 */
export const toLowerCaseRecursive = (obj) => {
  if (Array.isArray(obj)) {
    return obj.map(v => toLowerCaseRecursive(v));
  }
  
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      // Skip fields that shouldn't be lowercased (e.g. passwords, IDs maybe)
      // For now we assume we want to lowercase all text fields for consistency
      acc[key] = toLowerCaseRecursive(obj[key]);
      return acc;
    }, {});
  }
  
  if (typeof obj === 'string') {
    return obj.toLowerCase().trim();
  }
  
  return obj;
};

/**
 * Specific transform for patient registration data
 */
export const transformPatientForStorage = (data) => {
  return {
    ...data,
    first_name: data.first_name?.toLowerCase().trim(),
    last_name: data.last_name?.toLowerCase().trim(),
    middle_name: data.middle_name?.toLowerCase().trim(),
    email: data.email?.toLowerCase().trim(),
    address: data.address?.toLowerCase().trim(),
    allergies: data.allergies?.toLowerCase().trim(),
    existing_conditions: data.existing_conditions?.toLowerCase().trim(),
    emergency_contact_name: data.emergency_contact_name?.toLowerCase().trim(),
    // Keep gender/types as is if they are enum matches, or lowercase if free text
    // Keep phone numbers/IDs as entered (maybe just trim)
    national_id: data.national_id?.trim(),
    phone_number: data.phone_number?.replace(/\s/g, '') // Remove formatting spaces
  };
};
