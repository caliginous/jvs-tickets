import React from 'react';
import { Dialog } from '../../../ui';
import { ExclamationCircleIcon, TrashIcon } from '@heroicons/react/solid';
import { formatAmount } from '../../../lib/amountUtils';

interface BulkDeleteOrdersDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    selectedOrders: any[];
    isLoading?: boolean;
}

export const BulkDeleteOrdersDialog: React.FC<BulkDeleteOrdersDialogProps> = ({
    isOpen,
    onClose,
    onConfirm,
    selectedOrders,
    isLoading = false
}) => {
    const totalAmountInPounds = selectedOrders.reduce((sum, order) => {
        const amountInPence = order.finalTotal || order.originalTotal || 0;
        return sum + (amountInPence / 100); // Convert pence to pounds for display
    }, 0);

    const paidOrders = selectedOrders.filter(order => order.status === "PAID");
    const pendingOrders = selectedOrders.filter(order => order.status === "PENDING");
    const cancelledOrders = selectedOrders.filter(order => order.status === "CANCELLED");

    return (
        <Dialog
            open={isOpen}
            onClose={onClose}
            className="max-w-md"
        >
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
                <ExclamationCircleIcon className="w-6 h-6 text-red-600" />
            </div>
            
            <div className="mt-3 text-center">
                <h3 className="text-lg font-medium text-gray-900">
                    Delete Orders
                </h3>
                <div className="mt-2">
                    <p className="text-sm text-gray-500">
                        Are you sure you want to delete {selectedOrders.length} order{selectedOrders.length !== 1 ? 's' : ''}? 
                        This action cannot be undone.
                    </p>
                </div>
            </div>

            <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                                            <ExclamationCircleIcon className="w-5 h-5 text-red-400" />
                    <div className="ml-3">
                        <h4 className="text-sm font-medium text-red-800">
                            Important: This will permanently delete the orders
                        </h4>
                        <div className="mt-2 text-sm text-red-700">
                            <ul className="list-disc pl-5 space-y-1">
                                {paidOrders.length > 0 && (
                                    <li>
                                        {paidOrders.length} paid order{paidOrders.length !== 1 ? 's' : ''} will be refunded
                                    </li>
                                )}
                                {pendingOrders.length > 0 && (
                                    <li>
                                        {pendingOrders.length} pending order{pendingOrders.length !== 1 ? 's' : ''} will be cancelled
                                    </li>
                                )}
                                {cancelledOrders.length > 0 && (
                                    <li>
                                        {cancelledOrders.length} cancelled order{cancelledOrders.length !== 1 ? 's' : ''} will be removed
                                    </li>
                                )}
                                <li>All tickets will be permanently deleted</li>
                                <li>Order data will be completely removed from the database</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {totalAmountInPounds > 0 && (
                <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-md p-3">
                    <div className="text-sm text-yellow-800">
                        <strong>Total Amount:</strong> £{totalAmountInPounds.toFixed(2)}
                        {paidOrders.length > 0 && (
                            <span className="block mt-1">
                                This includes £{paidOrders.reduce((sum, order) => sum + ((order.finalTotal || order.originalTotal || 0) / 100), 0).toFixed(2)} that will be refunded
                            </span>
                        )}
                    </div>
                </div>
            )}

            <div className="mt-6 flex justify-end space-x-3">
                <button
                    type="button"
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    onClick={onClose}
                    disabled={isLoading}
                >
                    Cancel
                </button>
                <button
                    type="button"
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={onConfirm}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <div className="flex items-center">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                            Deleting...
                        </div>
                    ) : (
                        <div className="flex items-center">
                            <TrashIcon className="w-4 h-4 mr-2" />
                            Delete Orders
                        </div>
                    )}
                </button>
            </div>
        </Dialog>
    );
};
