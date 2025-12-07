import { useState, useCallback } from 'react';
import { schemas } from './validationSchemas';

/**
 * Custom hook for form validation
 * @param {object} initialValues - Initial form values
 * @returns {object} - Validation state and helpers
 */
export const useFormValidation = (initialValues = {}) => {
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [values, setValues] = useState(initialValues);

  /**
   * Validate a single field
   */
  const validateField = useCallback((name, value, schema) => {
    if (!schema) return null;

    // Required check
    if (schema.required && (!value || value.trim() === '')) {
      return schema.required;
    }

    // Skip other validations if field is empty and not required
    if (!value || value.trim() === '') {
      return null;
    }

    // Pattern validation
    if (schema.pattern && !schema.pattern.value.test(value)) {
      return schema.pattern.message;
    }

    // Min length
    if (schema.minLength && value.length < schema.minLength.value) {
      return schema.minLength.message;
    }

    // Max length
    if (schema.maxLength && value.length > schema.maxLength.value) {
      return schema.maxLength.message;
    }

    // Custom validation function
    if (schema.validate && typeof schema.validate === 'function') {
      const customError = schema.validate(value);
      if (customError) return customError;
    }

    return null;
  }, []);

  /**
   * Validate all fields
   */
  const validateForm = useCallback((formValues, fieldSchemas) => {
    const newErrors = {};
    
    Object.keys(fieldSchemas).forEach(fieldName => {
      const schema = fieldSchemas[fieldName];
      const value = formValues[fieldName];
      const error = validateField(fieldName, value, schema);
      
      if (error) {
        newErrors[fieldName] = error;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [validateField]);

  /**
   * Handle field change with validation
   */
  const handleChange = useCallback((name, value, schema) => {
    setValues(prev => ({ ...prev, [name]: value }));
    
    if (touched[name]) {
      const error = validateField(name, value, schema);
      setErrors(prev => ({
        ...prev,
        [name]: error || undefined
      }));
    }
  }, [touched, validateField]);

  /**
   * Mark field as touched
   */
  const setFieldTouched = useCallback((name) => {
    setTouched(prev => ({ ...prev, [name]: true }));
  }, []);

  /**
   * Mark all fields as touched
   */
  const setAllTouched = useCallback(() => {
    const allTouched = {};
    Object.keys(values).forEach(key => {
      allTouched[key] = true;
    });
    setTouched(allTouched);
  }, [values]);

  /**
   * Reset validation state
   */
  const reset = useCallback(() => {
    setErrors({});
    setTouched({});
    setValues(initialValues);
  }, [initialValues]);

  return {
    values,
    errors,
    touched,
    setValues,
    setErrors,
    validateField,
    validateForm,
    handleChange,
    setFieldTouched,
    setAllTouched,
    reset,
    isValid: Object.keys(errors).length === 0
  };
};

