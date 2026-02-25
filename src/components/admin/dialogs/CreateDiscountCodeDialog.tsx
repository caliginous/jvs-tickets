import React, { useState, useEffect } from 'react';
import { Button, Input, Select, Switch } from '../../../ui';
import axios from 'axios';
import { showToast } from '../../../ui';

interface Event {
    id: string;
    title: string;
}

interface DiscountCodeFormData {
    id?: string;
    code: string;
    description: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    validFrom: string;
    validUntil?: string;
    usageLimit?: number;
    isActive: boolean;
    appliesToEvents: string[];
    minimumOrderValue?: number;
    maximumDiscount?: number;
}

interface CreateDiscountCodeDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    editData?: DiscountCodeFormData | null;
}

export const CreateDiscountCodeDialog: React.FC<CreateDiscountCodeDialogProps> = ({
    isOpen,
    onClose,
    onSuccess,
    editData
}) => {
    const [formData, setFormData] = useState<DiscountCodeFormData>({
        code: '',
        description: '',
        discountType: 'percentage',
        discountValue: 0,
        validFrom: new Date().toISOString().split('T')[0],
        validUntil: '',
        usageLimit: undefined,
        isActive: true,
        appliesToEvents: [],
        minimumOrderValue: undefined,
        maximumDiscount: undefined
    });

    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchEvents();
            if (editData) {
                setFormData({
                    ...editData,
                    validFrom: editData.validFrom ? new Date(editData.validFrom).toISOString().split('T')[0] : '',
                    validUntil: editData.validUntil ? new Date(editData.validUntil).toISOString().split('T')[0] : ''
                });
            } else {
                setFormData({
                    code: '',
                    description: '',
                    discountType: 'percentage',
                    discountValue: 0,
                    validFrom: new Date().toISOString().split('T')[0],
                    validUntil: '',
                    usageLimit: undefined,
                    isActive: true,
                    appliesToEvents: [],
                    minimumOrderValue: undefined,
                    maximumDiscount: undefined
                });
            }
        }
    }, [isOpen, editData]);

    const fetchEvents = async () => {
        try {
            const response = await axios.get('/api/admin/events');
            setEvents(response.data);
        } catch (error) {
            console.error('Error fetching events:', error);
        }
    };

    const handleInputChange = (field: keyof DiscountCodeFormData, value: any) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.code.trim()) {
            showToast.error('Discount code is required');
            return;
        }

        if (!formData.description.trim()) {
            showToast.error('Description is required');
            return;
        }

        if (formData.discountValue <= 0) {
            showToast.error('Discount value must be greater than 0');
            return;
        }

        if (formData.discountType === 'percentage' && formData.discountValue > 100) {
            showToast.error('Percentage cannot exceed 100%');
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                ...formData,
                discountValue: formData.discountValue,
                usageLimit: formData.usageLimit || null,
                minimumOrderValue: formData.minimumOrderValue || null,
                maximumDiscount: formData.maximumDiscount || null,
                validFrom: new Date(formData.validFrom).toISOString(),
                validUntil: formData.validUntil ? new Date(formData.validUntil).toISOString() : null
            };

            if (editData) {
                // Update existing discount code (use ID to avoid false duplicate detection)
                await axios.put(`/api/admin/discount-codes/${editData.id || editData.code}`, payload);
                showToast.success('Discount code updated successfully');
            } else {
                // Create new discount code
                await axios.post('/api/admin/discount-codes', payload);
                showToast.success('Discount code created successfully');
            }

            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error saving discount code:', error);
            const errorMessage = error.response?.data?.error || 'Failed to save discount code';
            showToast.error(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
                <div className="mt-3">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                        {editData ? 'Edit Discount Code' : 'Create Discount Code'}
                    </h3>
                    
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Discount Code *
                                </label>
                                <Input
                                    type="text"
                                    value={formData.code}
                                    onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
                                    placeholder="e.g., SUMMER20"
                                    required
                                    disabled={!!editData}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Description *
                                </label>
                                <Input
                                    type="text"
                                    value={formData.description}
                                    onChange={(e) => handleInputChange('description', e.target.value)}
                                    placeholder="e.g., 20% off summer events"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Discount Type *
                                </label>
                                <Select
                                    options={[
                                        { value: 'percentage', label: 'Percentage (%)' },
                                        { value: 'fixed', label: 'Fixed Amount (£)' }
                                    ]}
                                    value={formData.discountType}
                                    onChange={(value) => handleInputChange('discountType', value)}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Discount Value *
                                </label>
                                <Input
                                    type="number"
                                    value={formData.discountValue}
                                    onChange={(e) => handleInputChange('discountValue', parseFloat(e.target.value) || 0)}
                                    placeholder={formData.discountType === 'percentage' ? '20' : '10'}
                                    min="0"
                                    max={formData.discountType === 'percentage' ? '100' : undefined}
                                    step="0.01"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Valid From *
                                </label>
                                <Input
                                    type="date"
                                    value={formData.validFrom}
                                    onChange={(e) => handleInputChange('validFrom', e.target.value)}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Valid Until
                                </label>
                                <Input
                                    type="date"
                                    value={formData.validUntil}
                                    onChange={(e) => handleInputChange('validUntil', e.target.value)}
                                    min={formData.validFrom}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Usage Limit
                                </label>
                                <Input
                                    type="number"
                                    value={formData.usageLimit || ''}
                                    onChange={(e) => handleInputChange('usageLimit', e.target.value ? parseInt(e.target.value) : undefined)}
                                    placeholder="Unlimited"
                                    min="1"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Minimum Order Value (£)
                                </label>
                                <Input
                                    type="number"
                                    value={formData.minimumOrderValue || ''}
                                    onChange={(e) => handleInputChange('minimumOrderValue', e.target.value ? parseFloat(e.target.value) : undefined)}
                                    placeholder="No minimum"
                                    min="0"
                                    step="0.01"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Maximum Discount (£)
                                </label>
                                <Input
                                    type="number"
                                    value={formData.maximumDiscount || ''}
                                    onChange={(e) => handleInputChange('maximumDiscount', e.target.value ? parseFloat(e.target.value) : undefined)}
                                    placeholder="No maximum"
                                    min="0"
                                    step="0.01"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Applies to Events
                            </label>
                            <Select
                                options={[
                                    { value: '', label: 'All Events' },
                                    ...events.map(event => ({
                                        value: String(event.id),
                                        label: event.title
                                    }))
                                ]}
                                value={formData.appliesToEvents[0] || ''}
                                onChange={(value) => {
                                    if (value === '') {
                                        handleInputChange('appliesToEvents', []);
                                    } else {
                                        const newEvents = formData.appliesToEvents.includes(value) 
                                            ? formData.appliesToEvents 
                                            : [...formData.appliesToEvents, value];
                                        handleInputChange('appliesToEvents', newEvents);
                                    }
                                }}
                                placeholder="Select events"
                            />
                        </div>

                        <div className="flex items-center">
                            <Switch
                                checked={formData.isActive}
                                onChange={(checked) => handleInputChange('isActive', checked)}
                            />
                            <label className="ml-2 text-sm text-gray-700">
                                Active
                            </label>
                        </div>

                        <div className="flex justify-end space-x-3 pt-4">
                            <Button
                                type="button"
                                onClick={onClose}
                                variant="outline"
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Saving...' : (editData ? 'Update' : 'Create')}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
