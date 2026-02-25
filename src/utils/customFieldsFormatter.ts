/**
 * Utilities for formatting and displaying custom fields
 */

import { CustomField, CustomFieldResponses } from '../types/customFields';

/**
 * Format custom fields for display using field labels instead of field names
 */
export function formatCustomFieldsForDisplay(
  customFieldResponses: string | null | undefined,
  fieldDefinitions?: CustomField[]
): Array<{ label: string; value: string; fieldName: string }> {
  if (!customFieldResponses) return [];

  try {
    const responses: CustomFieldResponses = JSON.parse(customFieldResponses);
    
    return Object.entries(responses).map(([fieldName, value]) => {
      // Try to find the field definition to get the label
      const fieldDef = fieldDefinitions?.find(f => f.name === fieldName);
      const label = fieldDef?.label || formatFieldName(fieldName);
      
      return {
        label,
        value: value || '',
        fieldName
      };
    });
  } catch (error) {
    console.error('Failed to parse custom fields:', error);
    return [];
  }
}

/**
 * Convert field name to human-readable format if no label is available
 * e.g., "kids_age" → "Kids Age"
 */
function formatFieldName(fieldName: string): string {
  return fieldName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Get custom fields as a comma-separated string for table display
 */
export function formatCustomFieldsSummary(
  customFieldResponses: string | null | undefined,
  fieldDefinitions?: CustomField[],
  maxLength = 50
): string {
  const formatted = formatCustomFieldsForDisplay(customFieldResponses, fieldDefinitions);
  
  if (formatted.length === 0) return '-';
  
  const summary = formatted
    .map(f => `${f.label}: ${f.value}`)
    .join(', ');
  
  if (summary.length > maxLength) {
    return summary.substring(0, maxLength) + '...';
  }
  
  return summary;
}

/**
 * Get custom fields as CSV columns
 * Returns an array of [columnName, value] pairs
 */
export function formatCustomFieldsForCSV(
  customFieldResponses: string | null | undefined,
  fieldDefinitions?: CustomField[]
): Array<[string, string]> {
  const formatted = formatCustomFieldsForDisplay(customFieldResponses, fieldDefinitions);
  
  return formatted.map(f => [f.label, f.value]);
}

/**
 * Get all unique custom field names from a list of orders
 * Used for CSV headers
 */
export function getAllCustomFieldColumns(
  orders: Array<{ customFields?: string | null }>,
  eventCustomFields?: CustomField[]
): string[] {
  const allFieldNames = new Set<string>();
  
  // If we have event definitions, use those first (ensures proper order)
  if (eventCustomFields && eventCustomFields.length > 0) {
    eventCustomFields.forEach(field => allFieldNames.add(field.name));
  }
  
  // Also check actual order data for any additional fields
  orders.forEach(order => {
    if (order.customFields) {
      try {
        const responses = JSON.parse(order.customFields);
        Object.keys(responses).forEach(fieldName => allFieldNames.add(fieldName));
      } catch (error) {
        // Skip invalid JSON
      }
    }
  });
  
  // Convert field names to labels
  return Array.from(allFieldNames).map(fieldName => {
    const fieldDef = eventCustomFields?.find(f => f.name === fieldName);
    return fieldDef?.label || formatFieldName(fieldName);
  });
}

