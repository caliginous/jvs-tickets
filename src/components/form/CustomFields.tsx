import { useState } from "react";
import { Input } from "../ui";
import { CustomFieldsProps, CustomField } from "../../types/customFields";

export const CustomFields = ({ customFields, value, onChange }: CustomFieldsProps) => {
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    const handleUpdate = (property: string, newValue: string) => {
        const newValues = { ...value };
        newValues[property] = newValue;
        onChange(newValues);
    };

    const handleBlur = (fieldName: string) => {
        setTouched({ ...touched, [fieldName]: true });
    };

    const getFieldError = (field: CustomField): string | undefined => {
        if (!field.isRequired) return undefined;
        if (!touched[field.name]) return undefined;

        const fieldValue = value[field.name];
        if (!fieldValue || fieldValue.trim().length === 0) {
            return `${field.label} is required`;
        }

        return undefined;
    };

    if (!customFields || customFields.length === 0) return null;

    return (
        <div className="space-y-4">
            <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">
                    Additional Information
                </h3>
                {customFields.map((customField) => {
                    const error = getFieldError(customField);
                    const isRequired = customField.isRequired;

                    return (
                        <div key={customField.name} className="mb-4">
                            <Input
                                label={isRequired ? `${customField.label} *` : customField.label}
                                value={value[customField.name] ?? ""}
                                onChange={(event) =>
                                    handleUpdate(customField.name, event.target.value)
                                }
                                onBlur={() => handleBlur(customField.name)}
                                error={error}
                                required={isRequired}
                                placeholder={
                                    isRequired
                                        ? `Enter ${customField.label.toLowerCase()}`
                                        : `Enter ${customField.label.toLowerCase()} (optional)`
                                }
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
};