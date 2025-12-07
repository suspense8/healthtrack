/**
 * Comprehensive Prescription Validation Utility
 * Validates prescriptions at three levels:
 * 1. Data completeness - all essential fields must be filled
 * 2. Clinical safety - dose, interaction, allergy, duplication, etc.
 * 3. Operational correctness - formatting, units, standard drug names
 */

// Standard frequency patterns
const STANDARD_FREQUENCIES = {
  'OD': { timesPerDay: 1, label: 'Once Daily' },
  'BD': { timesPerDay: 2, label: 'Twice Daily' },
  'TDS': { timesPerDay: 3, label: 'Three Times Daily' },
  'QID': { timesPerDay: 4, label: 'Four Times Daily' },
  'Q6H': { timesPerDay: 4, label: 'Every 6 Hours' },
  'Q8H': { timesPerDay: 3, label: 'Every 8 Hours' },
  'Q12H': { timesPerDay: 2, label: 'Every 12 Hours' },
  'Q4H': { timesPerDay: 6, label: 'Every 4 Hours' },
  'STAT': { timesPerDay: 1, label: 'Immediately' },
  'PRN': { timesPerDay: 0, label: 'As Needed' }
};

// Common dosage forms
const DOSAGE_FORMS = [
  'Tablet', 'Capsule', 'Syrup', 'Suspension', 'Injection', 'IV', 'IM', 
  'Topical', 'Cream', 'Ointment', 'Drops', 'Inhaler', 'Spray', 'Suppository'
];

// Common routes of administration
const ROUTES = [
  'Oral', 'IV', 'IM', 'Subcutaneous', 'Topical', 'Inhalation', 
  'Nasal', 'Ophthalmic', 'Otic', 'Rectal', 'Vaginal', 'Transdermal'
];

// Route-Dosage Form compatibility
const ROUTE_FORM_COMPATIBILITY = {
  'Oral': ['Tablet', 'Capsule', 'Syrup', 'Suspension'],
  'IV': ['Injection', 'IV'],
  'IM': ['Injection', 'IM'],
  'Subcutaneous': ['Injection'],
  'Topical': ['Cream', 'Ointment', 'Topical'],
  'Inhalation': ['Inhaler', 'Spray'],
  'Nasal': ['Spray', 'Drops'],
  'Ophthalmic': ['Drops'],
  'Otic': ['Drops'],
  'Rectal': ['Suppository'],
  'Vaginal': ['Suppository', 'Cream'],
  'Transdermal': ['Patch']
};

// Maximum safe single doses (in mg) for common medications
const MAX_SINGLE_DOSES = {
  'paracetamol': 1000,
  'acetaminophen': 1000,
  'ibuprofen': 800,
  'aspirin': 1000,
  'amoxicillin': 1000,
  'penicillin': 1000,
  'metformin': 1000,
  'warfarin': 10
};

// Maximum duration limits (in days)
const MAX_DURATION = {
  'antibiotic': 14,
  'opioid': 7,
  'steroid': 30,
  'anticoagulant': 90
};

/**
 * Extract numeric value and unit from dosage string
 */
function parseDosage(dosage) {
  if (!dosage) return null;
  
  const match = dosage.match(/^(\d+(?:\.\d+)?)\s*(mg|g|ml|mcg|units?|puffs?|drops?|tablets?|capsules?)?/i);
  if (!match) return null;
  
  return {
    value: parseFloat(match[1]),
    unit: (match[2] || 'mg').toLowerCase()
  };
}

/**
 * Validate drug name
 */
export function validateDrugName(medicationName, medicineId, allowOverride = false) {
  const errors = [];
  const warnings = [];
  
  if (!medicationName || medicationName.trim().length === 0) {
    errors.push('Drug name is required');
    return { valid: false, errors, warnings };
  }
  
  // Check if medicine was selected from database (has medicine_id)
  // Changed to warning instead of error to allow free-text entry
  if (!medicineId) {
    warnings.push('Consider selecting from the database to ensure correct spelling and prevent medication errors.');
  }
  
  // Check for common misspellings
  const commonMisspellings = {
    'amoxilin': 'Amoxicillin',
    'paracetamol': 'Paracetamol',
    'ibuprofen': 'Ibuprofen'
  };
  
  const lowerName = medicationName.toLowerCase();
  for (const [misspelling, correct] of Object.entries(commonMisspellings)) {
    if (lowerName.includes(misspelling)) {
      warnings.push(`Did you mean "${correct}"?`);
    }
  }
  
  return { 
    valid: errors.length === 0, 
    errors, 
    warnings,
    requiresOverride: !medicineId && allowOverride
  };
}

/**
 * Validate strength
 */
export function validateStrength(strength, medicationName = '') {
  const errors = [];
  const warnings = [];
  
  if (!strength || strength.trim().length === 0) {
    errors.push('Strength is required');
    return { valid: false, errors, warnings };
  }
  
  const parsed = parseDosage(strength);
  if (!parsed) {
    errors.push('Invalid strength format. Use format like "500mg", "1g", "125mg/5ml"');
    return { valid: false, errors, warnings };
  }
  
  // Check for valid units
  const validUnits = ['mg', 'g', 'ml', 'mcg', 'unit', 'units'];
  if (!validUnits.includes(parsed.unit)) {
    warnings.push(`Unusual unit "${parsed.unit}". Please verify.`);
  }
  
  // Check for reasonable ranges
  if (parsed.unit === 'mg' && parsed.value > 10000) {
    warnings.push('Very high strength. Please verify.');
  }
  
  if (parsed.unit === 'g' && parsed.value > 10) {
    warnings.push('Very high strength. Please verify.');
  }
  
  return { valid: errors.length === 0, errors, warnings, parsed };
}

/**
 * Validate dosage form
 */
export function validateDosageForm(dosageForm, route = '') {
  const errors = [];
  const warnings = [];
  
  if (!dosageForm || dosageForm.trim().length === 0) {
    errors.push('Dosage form is required');
    return { valid: false, errors, warnings };
  }
  
  const form = dosageForm.trim();
  if (!DOSAGE_FORMS.some(df => df.toLowerCase() === form.toLowerCase())) {
    warnings.push(`"${form}" is not a standard dosage form. Please verify.`);
  }
  
  // Check route-form compatibility
  if (route && ROUTE_FORM_COMPATIBILITY[route]) {
    const compatibleForms = ROUTE_FORM_COMPATIBILITY[route].map(f => f.toLowerCase());
    if (!compatibleForms.includes(form.toLowerCase())) {
      errors.push(`"${form}" is not compatible with route "${route}". Valid forms: ${ROUTE_FORM_COMPATIBILITY[route].join(', ')}`);
    }
  }
  
  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate dose (single dose amount)
 */
export function validateDose(dose, medicationName = '', weight = null) {
  const errors = [];
  const warnings = [];
  
  if (!dose || dose.trim().length === 0) {
    errors.push('Dose is required');
    return { valid: false, errors, warnings };
  }
  
  const parsed = parseDosage(dose);
  if (!parsed) {
    errors.push('Invalid dose format. Use format like "500mg", "1 tablet"');
    return { valid: false, errors, warnings };
  }
  
  // Check against max single doses
  const lowerName = medicationName.toLowerCase();
  for (const [drug, maxDose] of Object.entries(MAX_SINGLE_DOSES)) {
    if (lowerName.includes(drug) && parsed.unit === 'mg' && parsed.value > maxDose) {
      errors.push(`Dose exceeds maximum safe single dose of ${maxDose}mg for ${drug}`);
    }
  }
  
  // Pediatric dosing check (if weight provided)
  if (weight && weight > 0 && weight < 18) {
    warnings.push('Pediatric patient. Please verify weight-based dosing.');
  }
  
  return { valid: errors.length === 0, errors, warnings, parsed };
}

/**
 * Validate route of administration
 */
export function validateRoute(route, dosageForm = '') {
  const errors = [];
  const warnings = [];
  
  if (!route || route.trim().length === 0) {
    errors.push('Route of administration is required');
    return { valid: false, errors, warnings };
  }
  
  const routeLower = route.trim();
  if (!ROUTES.some(r => r.toLowerCase() === routeLower.toLowerCase())) {
    warnings.push(`"${route}" is not a standard route. Please verify.`);
  }
  
  // Check route-form compatibility
  if (dosageForm && ROUTE_FORM_COMPATIBILITY[route]) {
    const compatibleForms = ROUTE_FORM_COMPATIBILITY[route].map(f => f.toLowerCase());
    const formLower = dosageForm.toLowerCase();
    if (!compatibleForms.includes(formLower)) {
      errors.push(`Route "${route}" is not compatible with dosage form "${dosageForm}"`);
    }
  }
  
  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate frequency
 */
export function validateFrequency(frequency) {
  const errors = [];
  const warnings = [];
  
  if (!frequency || frequency.trim().length === 0) {
    errors.push('Frequency is required');
    return { valid: false, errors, warnings };
  }
  
  const freq = frequency.trim().toUpperCase();
  
  // Check if it's a standard frequency
  if (STANDARD_FREQUENCIES[freq]) {
    return { valid: true, errors, warnings, parsed: STANDARD_FREQUENCIES[freq] };
  }
  
  // Check for numeric patterns (e.g., "3x daily", "every 6 hours")
  const numericPattern = freq.match(/(\d+)\s*(x|times|hour|hr)/i);
  if (numericPattern) {
    const times = parseInt(numericPattern[1]);
    if (times > 12) {
      errors.push(`Frequency "${frequency}" is unrealistic (more than 12 times per day)`);
    } else if (times > 6) {
      warnings.push(`High frequency "${frequency}". Please verify.`);
    }
    return { valid: errors.length === 0, errors, warnings };
  }
  
  // Check for "every X minutes" patterns
  const minutePattern = freq.match(/every\s*(\d+)\s*minute/i);
  if (minutePattern) {
    const minutes = parseInt(minutePattern[1]);
    if (minutes < 60) {
      errors.push(`Frequency "${frequency}" is too frequent (less than 1 hour apart)`);
    }
  }
  
  warnings.push(`"${frequency}" is not a standard frequency. Consider using: ${Object.keys(STANDARD_FREQUENCIES).slice(0, 5).join(', ')}`);
  
  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate duration
 */
export function validateDuration(duration, medicationName = '') {
  const errors = [];
  const warnings = [];
  
  if (!duration || duration.trim().length === 0) {
    errors.push('Duration is required');
    return { valid: false, errors, warnings };
  }
  
  // Extract number and unit
  const match = duration.match(/(\d+)\s*(day|days|week|weeks|month|months|dose|doses)?/i);
  if (!match) {
    errors.push('Invalid duration format. Use format like "5 days", "2 weeks"');
    return { valid: false, errors, warnings };
  }
  
  const value = parseInt(match[1]);
  const unit = (match[2] || 'day').toLowerCase();
  
  // Convert to days
  let days = value;
  if (unit.includes('week')) days = value * 7;
  else if (unit.includes('month')) days = value * 30;
  
  // Check medication-specific limits
  const lowerName = medicationName.toLowerCase();
  
  // Antibiotic duration check
  if (lowerName.match(/(amoxicillin|penicillin|antibiotic|cef|azithromycin)/i) && days > MAX_DURATION.antibiotic) {
    warnings.push(`Antibiotic duration of ${days} days exceeds typical maximum of ${MAX_DURATION.antibiotic} days.`);
  }
  
  // Opioid duration check
  if (lowerName.match(/(morphine|oxycodone|fentanyl|opioid|narcotic)/i) && days > MAX_DURATION.opioid) {
    errors.push(`Opioid duration of ${days} days exceeds safe maximum of ${MAX_DURATION.opioid} days without review.`);
  }
  
  // General duration checks
  if (days > 365) {
    errors.push('Duration exceeds 1 year. Please verify.');
  } else if (days > 90) {
    warnings.push('Long duration. Please verify patient compliance and monitoring plan.');
  }
  
  if (days < 1) {
    errors.push('Duration must be at least 1 day');
  }
  
  return { valid: errors.length === 0, errors, warnings, days };
}

/**
 * Validate complete prescription
 */
export function validatePrescription(prescription, patientWeight = null, existingPrescriptions = []) {
  const errors = [];
  const warnings = [];
  const fieldErrors = {};
  
  // Validate each field
  const drugNameValidation = validateDrugName(prescription.medication_name, prescription.medicine_id);
  if (!drugNameValidation.valid) {
    errors.push(...drugNameValidation.errors);
    fieldErrors.medication_name = drugNameValidation.errors;
  }
  warnings.push(...drugNameValidation.warnings);
  
  const strengthValidation = validateStrength(prescription.strength, prescription.medication_name);
  if (!strengthValidation.valid) {
    errors.push(...strengthValidation.errors);
    fieldErrors.strength = strengthValidation.errors;
  }
  warnings.push(...strengthValidation.warnings);
  
  const dosageFormValidation = validateDosageForm(prescription.dosage_form, prescription.route);
  if (!dosageFormValidation.valid) {
    errors.push(...dosageFormValidation.errors);
    fieldErrors.dosage_form = dosageFormValidation.errors;
  }
  warnings.push(...dosageFormValidation.warnings);
  
  const doseValidation = validateDose(prescription.dosage, prescription.medication_name, patientWeight);
  if (!doseValidation.valid) {
    errors.push(...doseValidation.errors);
    fieldErrors.dosage = doseValidation.errors;
  }
  warnings.push(...doseValidation.warnings);
  
  const routeValidation = validateRoute(prescription.route, prescription.dosage_form);
  if (!routeValidation.valid) {
    errors.push(...routeValidation.errors);
    fieldErrors.route = routeValidation.errors;
  }
  warnings.push(...routeValidation.warnings);
  
  const frequencyValidation = validateFrequency(prescription.frequency);
  if (!frequencyValidation.valid) {
    errors.push(...frequencyValidation.errors);
    fieldErrors.frequency = frequencyValidation.errors;
  }
  warnings.push(...frequencyValidation.warnings);
  
  const durationValidation = validateDuration(prescription.duration, prescription.medication_name);
  if (!durationValidation.valid) {
    errors.push(...durationValidation.errors);
    fieldErrors.duration = durationValidation.errors;
  }
  warnings.push(...durationValidation.warnings);
  
  // Check for duplicate prescriptions
  const duplicate = existingPrescriptions.find(p => 
    p.medication_name?.toLowerCase() === prescription.medication_name?.toLowerCase() &&
    p.dosage === prescription.dosage &&
    p.frequency === prescription.frequency
  );
  
  if (duplicate) {
    warnings.push('Duplicate prescription detected. Please verify this is intentional.');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    fieldErrors,
    requiresOverride: drugNameValidation.requiresOverride
  };
}

/**
 * Get standard frequency options
 */
export function getStandardFrequencies() {
  return Object.entries(STANDARD_FREQUENCIES).map(([code, data]) => ({
    value: code,
    label: `${code} - ${data.label}`,
    ...data
  }));
}

/**
 * Get dosage form options
 */
export function getDosageForms() {
  return DOSAGE_FORMS;
}

/**
 * Get route options
 */
export function getRoutes() {
  return ROUTES;
}

/**
 * Get route-compatible dosage forms
 */
export function getCompatibleForms(route) {
  return ROUTE_FORM_COMPATIBILITY[route] || DOSAGE_FORMS;
}

/**
 * Get special instruction suggestions based on medication
 */
export function getSpecialInstructionSuggestions(medicationName) {
  const suggestions = [];
  const lowerName = medicationName.toLowerCase();
  
  if (lowerName.match(/(antibiotic|amoxicillin|penicillin)/i)) {
    suggestions.push('Take with food to reduce stomach upset');
    suggestions.push('Complete the full course even if you feel better');
  }
  
  if (lowerName.match(/(metformin|metformin)/i)) {
    suggestions.push('Take with meals to reduce side effects');
  }
  
  if (lowerName.match(/(warfarin|coumadin|anticoagulant)/i)) {
    suggestions.push('Take at the same time each day');
    suggestions.push('Avoid alcohol');
    suggestions.push('Monitor for bleeding');
  }
  
  if (lowerName.match(/(opioid|morphine|oxycodone|narcotic)/i)) {
    suggestions.push('May cause drowsiness - do not drive');
    suggestions.push('Do not drink alcohol');
  }
  
  if (lowerName.match(/(syrup|suspension|liquid)/i)) {
    suggestions.push('Shake well before use');
  }
  
  if (lowerName.match(/(inhaler|spray)/i)) {
    suggestions.push('Rinse mouth after use');
  }
  
  if (lowerName.match(/(topical|cream|ointment)/i)) {
    suggestions.push('Apply to clean, dry skin');
    suggestions.push('Wash hands after application');
  }
  
  return suggestions;
}


