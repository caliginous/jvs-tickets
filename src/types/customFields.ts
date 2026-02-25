/**
 * Custom Fields Type Definitions
 * Centralized types for event custom fields functionality
 */

/**
 * Custom field definition stored in database
 */
export interface CustomField {
  id?: number; // Optional for new fields being created
  label: string;
  name: string;
  isRequired: boolean;
  eventId?: number;
}

/**
 * Custom field with client-side temporary ID for tracking during editing
 */
export interface CustomFieldWithClientId extends CustomField {
  clientId: string; // Temporary UUID for tracking unsaved fields
}

/**
 * Customer responses to custom fields (key-value pairs)
 */
export interface CustomFieldResponses {
  [fieldName: string]: string;
}

/**
 * Validation result for custom field
 */
export interface CustomFieldValidation {
  isValid: boolean;
  errors: string[];
}

/**
 * Props for CustomFields component (customer-facing)
 */
export interface CustomFieldsProps {
  customFields: CustomField[];
  value: CustomFieldResponses;
  onChange: (value: CustomFieldResponses) => void;
}

/**
 * Props for EventCustomFieldsDialog (admin)
 */
export interface EventCustomFieldsDialogProps {
  customFields: CustomField[];
  onChange: (fields: CustomField[]) => void;
  open: boolean;
  onClose: () => void;
}

/**
 * Props for CustomFieldEntry component
 */
export interface CustomFieldEntryProps {
  customField: CustomFieldWithClientId;
  onChange: (index: number, field: CustomFieldWithClientId) => void;
  onDelete: (index: number) => void;
  index: number;
  existingFieldNames: string[];
}

/**
 * Props for AddCustomField component
 */
export interface AddCustomFieldProps {
  onAdd: (field: CustomField) => void;
  existingFieldNames: string[];
}

/**
 * Validation utilities
 */
export class CustomFieldValidator {
  /**
   * Validates a field name (lowercase, no spaces, alphanumeric + underscore only)
   */
  static validateFieldName(name: string): CustomFieldValidation {
    const errors: string[] = [];
    
    if (!name || name.trim().length === 0) {
      errors.push('Field name is required');
    }
    
    if (name.length < 2) {
      errors.push('Field name must be at least 2 characters');
    }
    
    if (name.length > 50) {
      errors.push('Field name must be less than 50 characters');
    }
    
    // Only allow lowercase letters, numbers, and underscores
    if (!/^[a-z0-9_]+$/.test(name)) {
      errors.push('Field name can only contain lowercase letters, numbers, and underscores');
    }
    
    // Cannot start with a number
    if (/^[0-9]/.test(name)) {
      errors.push('Field name cannot start with a number');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Validates a field label
   */
  static validateFieldLabel(label: string): CustomFieldValidation {
    const errors: string[] = [];
    
    if (!label || label.trim().length === 0) {
      errors.push('Field label is required');
    }
    
    if (label.length < 2) {
      errors.push('Field label must be at least 2 characters');
    }
    
    if (label.length > 100) {
      errors.push('Field label must be less than 100 characters');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Check for duplicate field names
   */
  static isDuplicateName(name: string, existingNames: string[], excludeIndex?: number): boolean {
    return existingNames.some((existingName, index) => {
      if (excludeIndex !== undefined && index === excludeIndex) {
        return false; // Skip checking against self
      }
      return existingName === name;
    });
  }
  
  /**
   * Validates customer field responses against field definitions
   */
  static validateCustomerResponses(
    fields: CustomField[], 
    responses: CustomFieldResponses
  ): boolean {
    // Check that all required fields have non-empty values
    return fields
      .filter(field => field.isRequired)
      .every(field => {
        const value = responses[field.name];
        return value && value.trim().length > 0;
      });
  }
  
  /**
   * Sanitize field name (convert to valid format)
   */
  static sanitizeFieldName(input: string): string {
    return input
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/[^a-z0-9_]/g, '') // Remove invalid characters
      .replace(/^[0-9]+/, '') // Remove leading numbers
      .substring(0, 50); // Limit length
  }
}

/**
 * Generate a client-side temporary ID for tracking fields during editing
 */
export function generateClientId(): string {
  return `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}







