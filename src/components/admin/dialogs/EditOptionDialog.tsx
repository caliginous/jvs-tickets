import { useState, useEffect } from 'react';
import { Dialog } from '../../../ui';
import { Button } from '../../../ui';
import { showToast } from '../../../ui';

interface Option {
    id: string;
    key: string;
    value: any;
    category: string;
    description?: string;
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    required: boolean;
    editable: boolean;
}

interface EditOptionDialogProps {
    isOpen: boolean;
    onClose: () => void;
    option: Option | null;
    onSave: (key: string, value: any) => Promise<void>;
}

export default function EditOptionDialog({ isOpen, onClose, option, onSave }: EditOptionDialogProps) {
    const [value, setValue] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Update local value when option changes
    useEffect(() => {
        if (option) {
            setValue(typeof option.value === 'object' ? JSON.stringify(option.value, null, 2) : String(option.value));
        }
    }, [option]);

    const handleSave = async () => {
        if (!option) return;

        try {
            setIsSaving(true);
            
            // Parse value based on type
            let parsedValue: any = value;
            if (option.type === 'number') {
                parsedValue = parseFloat(value);
                if (isNaN(parsedValue)) {
                    showToast.error('Please enter a valid number');
                    return;
                }
            } else if (option.type === 'boolean') {
                parsedValue = value.toLowerCase() === 'true';
            } else if (option.type === 'array' || option.type === 'object') {
                try {
                    parsedValue = JSON.parse(value);
                } catch (error) {
                    showToast.error('Please enter valid JSON');
                    return;
                }
            }

            await onSave(option.key, parsedValue);
            showToast.success('Option updated successfully');
            onClose();
        } catch (error) {
            console.error('Error saving option:', error);
            showToast.error('Failed to save option');
        } finally {
            setIsSaving(false);
        }
    };

    const handleClose = () => {
        if (option) {
            setValue(typeof option.value === 'object' ? JSON.stringify(option.value, null, 2) : String(option.value));
        }
        onClose();
    };

    if (!option) return null;

    return (
        <Dialog open={isOpen} onClose={handleClose}>
            <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Edit Option: {option.key}
                </h2>
                
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                    </label>
                    <p className="text-sm text-gray-600">
                        {option.description || 'No description available'}
                    </p>
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Value
                    </label>
                    {option.type === 'boolean' ? (
                        <select
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="true">True</option>
                            <option value="false">False</option>
                        </select>
                    ) : option.type === 'array' || option.type === 'object' ? (
                        <textarea
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            rows={6}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                            placeholder={`Enter valid ${option.type === 'array' ? 'JSON array' : 'JSON object'}`}
                        />
                    ) : (
                        <input
                            type={option.type === 'number' ? 'number' : 'text'}
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder={`Enter ${option.type}`}
                        />
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                        Type: {option.type} {option.required && <span className="text-red-500">(Required)</span>}
                    </p>
                </div>

                <div className="flex justify-end space-x-3">
                    <Button
                        variant="outline"
                        onClick={handleClose}
                        disabled={isSaving}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        loading={isSaving}
                        disabled={!value.trim()}
                    >
                        Save Changes
                    </Button>
                </div>
            </div>
        </Dialog>
    );
}
