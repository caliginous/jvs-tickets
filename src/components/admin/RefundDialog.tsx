import React, { useState } from 'react';
import { Dialog } from '../../ui/dialog';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/input';
import { Select } from '../../ui/select';
import { showToast } from '../../ui';
import { getOrderTotalInPounds, toPence } from '../../lib/amountUtils';

interface RefundDialogProps {
    isOpen: boolean;
    onClose: () => void;
    order: {
        id: string;
        status: string;
        finalTotal: number;
        originalTotal: number;
        customerName?: string;
        email?: string;
    };
    onRefundSuccess: () => void;
}

const REFUND_REASONS = [
    { value: 'requested_by_customer', label: 'Requested by Customer' },
    { value: 'duplicate', label: 'Duplicate Order' },
    { value: 'fraudulent', label: 'Fraudulent Transaction' },
    { value: 'event_cancelled', label: 'Event Cancelled' },
    { value: 'service_not_received', label: 'Service Not Received' },
    { value: 'other', label: 'Other' }
];

export default function RefundDialog({ isOpen, onClose, order, onRefundSuccess }: RefundDialogProps) {
    const maxRefundAmountInPounds = getOrderTotalInPounds(order);
    const [refundAmount, setRefundAmount] = useState<number>(maxRefundAmountInPounds);
    const [refundReason, setRefundReason] = useState<string>('requested_by_customer');
    const [customReason, setCustomReason] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState(false);

    const maxRefundAmount = maxRefundAmountInPounds;
    const isFullRefund = refundAmount >= maxRefundAmount;
    const isPartialRefund = refundAmount > 0 && refundAmount < maxRefundAmount;

    const handleRefund = async () => {
        if (refundAmount <= 0) {
            showToast.error('Refund amount must be greater than 0');
            return;
        }

        if (refundAmount > maxRefundAmount) {
            showToast.error('Refund amount cannot exceed order total');
            return;
        }

        setIsProcessing(true);

        try {
            const response = await fetch('/api/admin/refund', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    orderId: order.id,
                    amount: Math.round(refundAmount * 100), // Convert pounds to pence for API
                    reason: refundReason === 'other' ? customReason : refundReason
                }),
            });

            const result = await response.json();

            if (response.ok) {
                showToast.success(`Refund processed successfully! Amount: £${refundAmount.toFixed(2)}`);
                onRefundSuccess();
                onClose();
            } else {
                showToast.error(result.error || 'Failed to process refund');
            }
        } catch (error) {
            console.error('Refund error:', error);
            showToast.error('An error occurred while processing the refund');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleAmountChange = (value: string) => {
        const amount = parseFloat(value) || 0;
        setRefundAmount(amount);
    };

    const handleFullRefund = () => {
        setRefundAmount(maxRefundAmount);
    };

    const handlePartialRefund = () => {
        setRefundAmount(maxRefundAmount / 2);
    };

    return (
        <Dialog open={isOpen} onClose={onClose} size="lg">
            <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Process Refund
                </h2>

                {/* Order Information */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <h3 className="font-medium text-gray-900 mb-2">Order Details</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="text-gray-600">Order ID:</span>
                            <span className="ml-2 font-mono text-gray-900">{order.id}</span>
                        </div>
                        <div>
                            <span className="text-gray-600">Status:</span>
                            <span className="ml-2 text-gray-900">{order.status}</span>
                        </div>
                        {order.customerName && (
                            <div>
                                <span className="text-gray-600">Customer:</span>
                                <span className="ml-2 text-gray-900">{order.customerName}</span>
                            </div>
                        )}
                        {order.email && (
                            <div>
                                <span className="text-gray-600">Email:</span>
                                <span className="ml-2 text-gray-900">{order.email}</span>
                            </div>
                        )}
                        <div>
                            <span className="text-gray-600">Order Total:</span>
                            <span className="ml-2 font-semibold text-gray-900">£{maxRefundAmount.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* Refund Amount */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Refund Amount (£)
                    </label>
                    <div className="flex space-x-2 mb-3">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleFullRefund}
                            disabled={isProcessing}
                        >
                            Full Refund
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handlePartialRefund}
                            disabled={isProcessing}
                        >
                            Half Refund
                        </Button>
                    </div>
                    <Input
                        type="number"
                        value={refundAmount.toFixed(2)}
                        onChange={(e) => handleAmountChange(e.target.value)}
                        min="0"
                        max={maxRefundAmount}
                        step="0.01"
                        disabled={isProcessing}
                        className="w-full"
                    />
                    <div className="mt-2 text-sm text-gray-600">
                        {isFullRefund && (
                            <span className="text-green-600">Full refund will be processed</span>
                        )}
                        {isPartialRefund && (
                            <span className="text-orange-600">Partial refund will be processed</span>
                        )}
                        {refundAmount === 0 && (
                            <span className="text-red-600">Please enter a refund amount</span>
                        )}
                    </div>
                </div>

                {/* Refund Reason */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Refund Reason
                    </label>
                    <Select
                        options={REFUND_REASONS}
                        value={refundReason}
                        onChange={setRefundReason}
                        placeholder="Select a reason"
                        disabled={isProcessing}
                    />
                    {refundReason === 'other' && (
                        <Input
                            type="text"
                            value={customReason}
                            onChange={(e) => setCustomReason(e.target.value)}
                            placeholder="Please specify the reason"
                            className="mt-2"
                            disabled={isProcessing}
                        />
                    )}
                </div>

                {/* Refund Summary */}
                <div className="bg-blue-50 rounded-lg p-4 mb-6">
                    <h3 className="font-medium text-blue-900 mb-2">Refund Summary</h3>
                    <div className="text-sm text-blue-800">
                        <div className="flex justify-between">
                            <span>Order Total:</span>
                            <span>£{maxRefundAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Refund Amount:</span>
                            <span className="font-semibold">£{refundAmount.toFixed(2)}</span>
                        </div>
                        {isPartialRefund && (
                            <div className="flex justify-between">
                                <span>Remaining Amount:</span>
                                <span>£{(maxRefundAmount - refundAmount).toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between mt-2 pt-2 border-t border-blue-200">
                            <span>New Order Status:</span>
                            <span className="font-semibold">
                                {isFullRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={isProcessing}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="danger"
                        onClick={handleRefund}
                        disabled={isProcessing || refundAmount <= 0}
                    >
                        {isProcessing ? 'Processing...' : 'Process Refund'}
                    </Button>
                </div>
            </div>
        </Dialog>
    );
}
