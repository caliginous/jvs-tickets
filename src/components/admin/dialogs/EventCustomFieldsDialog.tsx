import { Dialog, Button, Input } from "../../../ui";
import { TrashIcon, ExclamationCircleIcon } from "@heroicons/react/solid";
import { useState, useMemo, useEffect } from "react";
import {
    CustomField,
    CustomFieldWithClientId,
    CustomFieldEntryProps,
    AddCustomFieldProps,
    EventCustomFieldsDialogProps,
    CustomFieldValidator,
    generateClientId,
} from "../../../types/customFields";

const CustomFieldEntry = ({
    customField,
    onChange,
    onDelete,
    index,
    existingFieldNames,
}: CustomFieldEntryProps) => {
    const [localLabel, setLocalLabel] = useState(customField.label);
    const [localName, setLocalName] = useState(customField.name);
    const [errors, setErrors] = useState<string[]>([]);
    const [isExpanded, setIsExpanded] = useState(false);

    const handleChange = (key: keyof CustomField, value: string | boolean) => {
        const newField = { ...customField, [key]: value };
        onChange(index, newField);

        // Validate on change
        if (key === "name" && typeof value === "string") {
            const validation = CustomFieldValidator.validateFieldName(value);
            const isDuplicate = CustomFieldValidator.isDuplicateName(
                value,
                existingFieldNames,
                index
            );

            const newErrors = [...validation.errors];
            if (isDuplicate) {
                newErrors.push("This field name already exists");
            }
            setErrors(newErrors);
        } else if (key === "label" && typeof value === "string") {
            const validation = CustomFieldValidator.validateFieldLabel(value);
            setErrors(validation.errors);
        }
    };

    const handleNameChange = (value: string) => {
        setLocalName(value);
        const sanitized = CustomFieldValidator.sanitizeFieldName(value);
        handleChange("name", sanitized);
    };

    const handleLabelChange = (value: string) => {
        setLocalLabel(value);
        handleChange("label", value);
    };

    return (
        <div className="border border-gray-200 rounded-lg mb-4">
            <div 
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <span className="text-sm font-medium text-gray-700">
                    {customField.label || <em className="text-gray-400">Untitled field</em>}
                </span>
                <div className="flex items-center space-x-2">
                    {customField.isRequired && (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                            Required
                        </span>
                    )}
                    <div className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                        ▼
                    </div>
                </div>
            </div>
            {isExpanded && (
                <div className="p-4 border-t border-gray-200 space-y-4">
                    <div className="space-y-4">
                        <div>
                            <Input
                                label="Label *"
                                value={localLabel}
                                onChange={(event) => handleLabelChange(event.target.value)}
                                error={
                                    errors.find((e) => e.includes("label"))
                                        ? "Label is required"
                                        : undefined
                                }
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                What customers see during checkout (you can change this anytime)
                            </p>
                        </div>
                        
                        {customField.id && (
                            <div className="bg-gray-50 rounded-md p-3">
                                <p className="text-xs font-medium text-gray-700 mb-1">Field Name (Internal ID)</p>
                                <code className="text-xs text-gray-600 bg-white px-2 py-1 rounded border border-gray-200">
                                    {customField.name}
                                </code>
                                <p className="text-xs text-gray-500 mt-1">
                                    This identifier is locked to protect existing order data
                                </p>
                            </div>
                        )}
                        
                        {!customField.id && (
                            <div>
                                <Input
                                    label="Name (unique identifier) *"
                                    value={localName}
                                    onChange={(event) => handleNameChange(event.target.value)}
                                    error={errors.find((e) => e.includes("name")) || undefined}
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Auto-formatted: lowercase, underscores only
                                </p>
                            </div>
                        )}
                    </div>

                    {errors.length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-md p-3">
                            <div className="flex items-start">
                                <ExclamationCircleIcon className="w-5 h-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-red-800">
                                        Validation Errors:
                                    </p>
                                    <ul className="mt-1 text-sm text-red-700 list-disc list-inside">
                                        {errors.map((error, idx) => (
                                            <li key={idx}>{error}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                    <label className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            checked={customField.isRequired}
                            onChange={(event) =>
                                handleChange("isRequired", event.target.checked)
                            }
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">
                            Required field
                            <span className="text-xs text-gray-500 block">
                                Customer must fill this out to complete booking
                            </span>
                        </span>
                    </label>

                    <Button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(index);
                        }}
                        variant="danger"
                        className="w-full"
                    >
                        <TrashIcon className="w-4 h-4 mr-2" />
                        Delete Field
                    </Button>
                </div>
            )}
        </div>
    );
};

const AddCustomField = ({ onAdd, existingFieldNames }: AddCustomFieldProps) => {
    const [label, setLabel] = useState("");
    const [name, setName] = useState("");
    const [isRequired, setIsRequired] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);
    const [touched, setTouched] = useState({ label: false, name: false });
    const [nameManuallyEdited, setNameManuallyEdited] = useState(false);

    const validateForm = (): boolean => {
        const labelValidation = CustomFieldValidator.validateFieldLabel(label);
        const nameValidation = CustomFieldValidator.validateFieldName(name);
        const isDuplicate = CustomFieldValidator.isDuplicateName(name, existingFieldNames);

        const allErrors = [
            ...labelValidation.errors,
            ...nameValidation.errors,
            ...(isDuplicate ? ["This field name already exists"] : []),
        ];

        setErrors(allErrors);
        return allErrors.length === 0;
    };

    const handleAdd = () => {
        setTouched({ label: true, name: true });

        if (!validateForm()) {
            return;
        }

        onAdd({
            label: label.trim(),
            name: name.trim(),
            isRequired,
        });

        // Reset form
        setLabel("");
        setName("");
        setIsRequired(false);
        setErrors([]);
        setTouched({ label: false, name: false });
        setNameManuallyEdited(false);
    };

    const handleNameChange = (value: string) => {
        setNameManuallyEdited(true); // Mark as manually edited
        const sanitized = CustomFieldValidator.sanitizeFieldName(value);
        setName(sanitized);

        if (touched.name) {
            const validation = CustomFieldValidator.validateFieldName(sanitized);
            const isDuplicate = CustomFieldValidator.isDuplicateName(
                sanitized,
                existingFieldNames
            );
            setErrors([
                ...validation.errors,
                ...(isDuplicate ? ["This field name already exists"] : []),
            ]);
        }
    };

    const handleLabelChange = (value: string) => {
        setLabel(value);

        // Auto-generate name from label if name hasn't been manually edited
        if (!nameManuallyEdited) {
            const autoName = CustomFieldValidator.sanitizeFieldName(value);
            setName(autoName);
        }

        if (touched.label) {
            const validation = CustomFieldValidator.validateFieldLabel(value);
            setErrors(validation.errors);
        }
    };

    const isValid = useMemo(() => {
        return (
            label.trim().length >= 2 &&
            name.trim().length >= 2 &&
            CustomFieldValidator.validateFieldName(name).isValid &&
            CustomFieldValidator.validateFieldLabel(label).isValid &&
            !CustomFieldValidator.isDuplicateName(name, existingFieldNames)
        );
    }, [label, name, existingFieldNames]);

    return (
        <div className="bg-gray-50 rounded-lg p-4 space-y-4">
            <h4 className="text-sm font-semibold text-gray-900">Add New Custom Field</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Input
                        label="Label *"
                        value={label}
                        onChange={(event) => handleLabelChange(event.target.value)}
                        onBlur={() => setTouched({ ...touched, label: true })}
                        placeholder="e.g., Dietary Requirements"
                    />
                    <p className="text-xs text-gray-500 mt-1">What customers will see</p>
                </div>
                <div>
                    <Input
                        label="Name (unique identifier) *"
                        value={name}
                        onChange={(event) => handleNameChange(event.target.value)}
                        onBlur={() => setTouched({ ...touched, name: true })}
                        placeholder="e.g., dietary_requirements"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Auto-formatted: lowercase, underscores only
                    </p>
                </div>
            </div>

            {errors.length > 0 && (touched.label || touched.name) && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                    <div className="flex items-start">
                        <ExclamationCircleIcon className="w-5 h-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
                        <div className="flex-1">
                            <p className="text-sm font-medium text-red-800">
                                Please fix these errors:
                            </p>
                            <ul className="mt-1 text-sm text-red-700 list-disc list-inside">
                                {errors.map((error, idx) => (
                                    <li key={idx}>{error}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            <label className="flex items-center space-x-2">
                <input
                    type="checkbox"
                    checked={isRequired}
                    onChange={(event) => setIsRequired(event.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                    Make this a required field
                </span>
            </label>

            <Button
                type="button"
                onClick={handleAdd}
                variant="solid"
                disabled={!isValid}
                className="w-full"
            >
                Add Custom Field
            </Button>
        </div>
    );
};

export const EventCustomFieldsDialog = ({
    customFields,
    onChange,
    open,
    onClose,
}: EventCustomFieldsDialogProps) => {
    // Add client IDs to fields for stable tracking
    const [fieldsWithClientIds, setFieldsWithClientIds] = useState<
        CustomFieldWithClientId[]
    >(() =>
        customFields.map((field) => ({
            ...field,
            clientId: field.id ? `db_${field.id}` : generateClientId(),
        }))
    );

    // Sync with parent when customFields prop changes
    useEffect(() => {
        console.log('[EventCustomFieldsDialog] customFields prop changed:', customFields);
        setFieldsWithClientIds(
            customFields.map((field) => ({
                ...field,
                clientId: field.id ? `db_${field.id}` : generateClientId(),
            }))
        );
    }, [customFields]);

    const existingFieldNames = useMemo(
        () => fieldsWithClientIds.map((field) => field.name),
        [fieldsWithClientIds]
    );

    const handleChange = (index: number, newField: CustomFieldWithClientId) => {
        const newFields = [...fieldsWithClientIds];
        newFields[index] = newField;
        setFieldsWithClientIds(newFields);

        // Propagate to parent (remove client IDs)
        onChange(
            newFields.map(({ clientId, ...field }) => field as CustomField)
        );
    };

    const handleDelete = (index: number) => {
        const newFields = fieldsWithClientIds.filter((_, i) => i !== index);
        setFieldsWithClientIds(newFields);

        // Propagate to parent
        onChange(
            newFields.map(({ clientId, ...field }) => field as CustomField)
        );
    };

    const handleAdd = (newField: CustomField) => {
        const fieldWithClientId: CustomFieldWithClientId = {
            ...newField,
            clientId: generateClientId(),
        };
        const newFields = [...fieldsWithClientIds, fieldWithClientId];
        setFieldsWithClientIds(newFields);

        // Propagate to parent
        onChange(
            newFields.map(({ clientId, ...field }) => field as CustomField)
        );
    };

    const hasValidationErrors = fieldsWithClientIds.some((field) => {
        const nameValidation = CustomFieldValidator.validateFieldName(field.name);
        const labelValidation = CustomFieldValidator.validateFieldLabel(field.label);
        return !nameValidation.isValid || !labelValidation.isValid;
    });

    return (
        <Dialog open={open} onClose={onClose} size="lg">
            <Dialog.Header onClose={onClose}>
                <h3 className="text-lg font-semibold">Manage Custom Fields</h3>
            </Dialog.Header>
            <Dialog.Body>
                <div className="space-y-6">
                    {/* Info Banner */}
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                        <p className="text-sm text-blue-900">
                            <strong>Custom fields</strong> collect additional information from
                            customers during checkout. They appear in the Personal Information
                            step.
                        </p>
                    </div>

                    {/* Existing Fields */}
                    {fieldsWithClientIds.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="text-sm font-semibold text-gray-900">
                                Current Fields ({fieldsWithClientIds.length})
                            </h4>
                            {fieldsWithClientIds.map((field, index) => (
                                <CustomFieldEntry
                                    key={field.clientId}
                                    onChange={handleChange}
                                    onDelete={handleDelete}
                                    customField={field}
                                    index={index}
                                    existingFieldNames={existingFieldNames}
                                />
                            ))}
                        </div>
                    )}

                    {fieldsWithClientIds.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                            <p>No custom fields configured yet.</p>
                            <p className="text-sm mt-1">Add your first field below.</p>
                        </div>
                    )}

                    <div className="border-t border-gray-200" />

                    {/* Add New Field */}
                    <AddCustomField onAdd={handleAdd} existingFieldNames={existingFieldNames} />

                    {hasValidationErrors && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                            <p className="text-sm text-yellow-800">
                                ⚠️ Please fix validation errors before saving the event.
                            </p>
                        </div>
                    )}
                </div>
            </Dialog.Body>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
                <Button type="button" onClick={onClose} variant="solid">
                    Done
                </Button>
            </div>
        </Dialog>
    );
};