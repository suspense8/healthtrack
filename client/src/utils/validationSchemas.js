/**
 * Validation schemas for form fields
 */

// Regex patterns
const PATTERNS = {
  NAME: /^[a-zA-Z\s-]+$/,
  PHONE_SL: /^(\+232|0)(7\d|8\d|9\d|3\d)\d{6}$/, // Basic SL mobile match
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  ALPHANUMERIC: /^[a-zA-Z0-9\s-]+$/
};

export const schemas = {
  // Personal Info
  first_name: {
    required: 'First name is required',
    pattern: {
      value: PATTERNS.NAME,
      message: 'Name can only contain letters and hyphens'
    },
    minLength: { value: 2, message: 'Minimum 2 characters' },
    maxLength: { value: 50, message: 'Maximum 50 characters' }
  },
  last_name: {
    required: 'Last name is required',
    pattern: {
      value: PATTERNS.NAME,
      message: 'Name can only contain letters and hyphens'
    },
    minLength: { value: 2, message: 'Minimum 2 characters' },
    maxLength: { value: 50, message: 'Maximum 50 characters' }
  },
  middle_name: {
    pattern: {
      value: PATTERNS.NAME,
      message: 'Name can only contain letters and hyphens'
    },
    maxLength: { value: 50, message: 'Maximum 50 characters' }
  },
  phone_number: {
    pattern: {
      value: PATTERNS.PHONE_SL,
      message: 'Invalid format. Use +232... or 076...'
    }
  },
  email: {
    pattern: {
      value: PATTERNS.EMAIL,
      message: 'Invalid email address'
    }
  },
  
  // Vitals Validation Schemas (for range checking)
  systolicBP: {
    min: { value: 60, message: 'Systolic BP too low (min: 60)' },
    max: { value: 250, message: 'Systolic BP too high (max: 250)' },
    warningThresholds: {
      high: { value: 140, message: 'High BP (Hypertension)' },
      low: { value: 90, message: 'Low BP (Hypotension)' }
    }
  },
  diastolicBP: {
    min: { value: 40, message: 'Diastolic BP too low (min: 40)' },
    max: { value: 150, message: 'Diastolic BP too high (max: 150)' },
    warningThresholds: {
      high: { value: 90, message: 'High BP (Hypertension)' },
      low: { value: 60, message: 'Low BP (Hypotension)' }
    }
  },
  heartRate: {
    min: { value: 30, message: 'Heart rate too low (min: 30 bpm)' },
    max: { value: 220, message: 'Heart rate too high (max: 220 bpm)' },
    warningThresholds: {
      high: { value: 100, message: 'Tachycardia (High heart rate)' },
      low: { value: 50, message: 'Bradycardia (Low heart rate)' }
    }
  },
  temperature: {
    min: { value: 35, message: 'Temperature too low (min: 35°C)' },
    max: { value: 42, message: 'Temperature too high (max: 42°C)' },
    warningThresholds: {
      high: { value: 38, message: 'Fever detected' },
      low: { value: 36, message: 'Low temperature (Hypothermia risk)' }
    }
  },
  oxygenSaturation: {
    min: { value: 70, message: 'O2 saturation too low (min: 70%)' },
    max: { value: 100, message: 'O2 saturation cannot exceed 100%' },
    warningThresholds: {
      low: { value: 95, message: 'Low oxygen saturation (Hypoxia risk)' }
    }
  },
  weight: {
    min: { value: 0.5, message: 'Weight must be positive' },
    max: { value: 300, message: 'Weight too high (max: 300 kg)' }
  },
  height: {
    min: { value: 30, message: 'Height too low (min: 30 cm)' },
    max: { value: 250, message: 'Height too high (max: 250 cm)' }
  },
  respiratoryRate: {
    min: { value: 8, message: 'Respiratory rate too low (min: 8 bpm)' },
    max: { value: 40, message: 'Respiratory rate too high (max: 40 bpm)' }
  },

  // Vitals Validation Functions (Returning warning objects, not errors)
  vitals: {
    systolic_bp: (val) => {
      const num = parseInt(val);
      if (isNaN(num) || !val) return null;
      if (num > 140) return { level: 'warning', message: 'High BP (Hypertension)' };
      if (num < 90) return { level: 'warning', message: 'Low BP (Hypotension)' };
      return null;
    },
    diastolic_bp: (val) => {
      const num = parseInt(val);
      if (isNaN(num) || !val) return null;
      if (num > 90) return { level: 'warning', message: 'High BP (Hypertension)' };
      if (num < 60) return { level: 'warning', message: 'Low BP (Hypotension)' };
      return null;
    },
    heart_rate: (val) => {
      const num = parseInt(val);
      if (isNaN(num) || !val) return null;
      if (num > 100) return { level: 'warning', message: 'Tachycardia (High heart rate)' };
      if (num < 50) return { level: 'warning', message: 'Bradycardia (Low heart rate)' };
      return null;
    },
    temperature: (val) => {
      const num = parseFloat(val);
      if (isNaN(num) || !val) return null;
      if (num > 38) return { level: 'warning', message: 'Fever detected' };
      if (num < 36) return { level: 'warning', message: 'Low temperature (Hypothermia risk)' };
      return null;
    },
    oxygen_saturation: (val) => {
      const num = parseInt(val);
      if (isNaN(num) || !val) return null;
      if (num < 95) return { level: 'warning', message: 'Low oxygen saturation (Hypoxia risk)' };
      return null;
    }
  }
};

/**
 * Helper to get warning for a field value
 */
export const getVitalWarning = (name, value) => {
  if (!schemas.vitals[name]) return null;
  return schemas.vitals[name](value);
};

/**
 * Validate vitals value against range schema
 * @param {string} fieldName - Field name (e.g., 'systolicBP')
 * @param {string|number} value - Value to validate
 * @returns {object|null} - Error object or null
 */
export const validateVitalRange = (fieldName, value) => {
  const schema = schemas[fieldName];
  if (!schema || !value) return null;

  const num = parseFloat(value);
  if (isNaN(num)) return { message: 'Invalid number' };

  if (schema.min && num < schema.min.value) {
    return { message: schema.min.message };
  }

  if (schema.max && num > schema.max.value) {
    return { message: schema.max.message };
  }

  return null;
};

/**
 * Get warning for vitals value (threshold-based)
 * @param {string} fieldName - Field name (e.g., 'systolic_bp')
 * @param {string|number} value - Value to check
 * @returns {object|null} - Warning object or null
 */
export const getVitalThresholdWarning = (fieldName, value) => {
  // Map field names to vitals function names
  const fieldMap = {
    'systolicBP': 'systolic_bp',
    'diastolicBP': 'diastolic_bp',
    'heartRate': 'heart_rate',
    'temperature': 'temperature',
    'oxygenSaturation': 'oxygen_saturation'
  };

  const vitalsKey = fieldMap[fieldName] || fieldName;
  return getVitalWarning(vitalsKey, value);
};
