/**
 * Server-side validation for custom fields
 * Ensures data integrity and prevents invalid field configurations
 */

export interface CustomFieldValidationResult {
    isValid: boolean;
    errors: string[];
}

export interface CustomFieldInput {
    id?: number;
    label: string;
    name: string;
    isRequired: boolean;
}

/**
 * Validates a single custom field
 */
export function validateCustomField(field: CustomFieldInput): CustomFieldValidationResult {
    const errors: string[] = [];

    // Validate label
    if (!field.label || typeof field.label !== 'string') {
        errors.push('Field label is required');
    } else {
        const trimmedLabel = field.label.trim();
        if (trimmedLabel.length < 2) {
            errors.push('Field label must be at least 2 characters');
        }
        if (trimmedLabel.length > 100) {
            errors.push('Field label must be less than 100 characters');
        }
    }

    // Validate name
    if (!field.name || typeof field.name !== 'string') {
        errors.push('Field name is required');
    } else {
        const trimmedName = field.name.trim();
        if (trimmedName.length < 2) {
            errors.push('Field name must be at least 2 characters');
        }
        if (trimmedName.length > 50) {
            errors.push('Field name must be less than 50 characters');
        }
        // Only allow lowercase letters, numbers, and underscores
        if (!/^[a-z0-9_]+$/.test(trimmedName)) {
            errors.push('Field name can only contain lowercase letters, numbers, and underscores');
        }
        // Cannot start with a number
        if (/^[0-9]/.test(trimmedName)) {
            errors.push('Field name cannot start with a number');
        }
    }

    // Validate isRequired
    if (typeof field.isRequired !== 'boolean') {
        errors.push('Field isRequired must be a boolean');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Validates an array of custom fields and checks for duplicates
 */
export function validateCustomFields(
    fields: CustomFieldInput[]
): CustomFieldValidationResult {
    const errors: string[] = [];

    if (!Array.isArray(fields)) {
        return {
            isValid: false,
            errors: ['Custom fields must be an array']
        };
    }

    // Validate each field
    fields.forEach((field, index) => {
        const validation = validateCustomField(field);
        if (!validation.isValid) {
            errors.push(`Field ${index + 1}: ${validation.errors.join(', ')}`);
        }
    });

    // Check for duplicate names
    const names = fields.map(f => f.name.trim().toLowerCase());
    const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
    if (duplicates.length > 0) {
        const uniqueDuplicates = Array.from(new Set(duplicates));
        errors.push(`Duplicate field names found: ${uniqueDuplicates.join(', ')}`);
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Sanitize custom field data before saving
 */
export function sanitizeCustomField(field: CustomFieldInput): CustomFieldInput {
    return {
        id: field.id,
        label: field.label.trim(),
        name: field.name.trim().toLowerCase(),
        isRequired: Boolean(field.isRequired)
    };
}

/**
 * Check if field names have changed (potential data orphaning risk)
 */
export function detectFieldNameChanges(
    existingFields: Array<{ id: number; name: string }>,
    newFields: Array<{ id?: number; name: string }>
): Array<{ id: number; oldName: string; newName: string }> {
    const changes: Array<{ id: number; oldName: string; newName: string }> = [];

    newFields.forEach(newField => {
        if (newField.id) {
            const existing = existingFields.find(f => f.id === newField.id);
            if (existing && existing.name !== newField.name) {
                changes.push({
                    id: newField.id,
                    oldName: existing.name,
                    newName: newField.name
                });
            }
        }
    });

    return changes;
}
