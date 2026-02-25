import React from 'react';
import { Dialog } from '../../../ui';
import { ExclamationCircleIcon, TrashIcon } from '@heroicons/react/solid';
import { formatAmount } from '../../../lib/amountUtils';

interface DeleteOrderDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    order: any;
    isLoading?: boolean;
}

export const DeleteOrderDialog: React.FC<DeleteOrderDialogProps> = ({
    isOpen,
    onClose,
    onConfirm,
    order,
    isLoading = false
}) => {
    if (!order) return null;

    const amountInPounds = (order.finalTotal || order.originalTotal || 0) / 100; // Convert pence to pounds
    const customerName = order.user ? `${order.user.firstName} ${order.user.lastName}` : 'Unknown Customer';
    const eventTitle = order.eventDate?.event?.title || 'Unknown Event';

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
                    Delete Order
                </h3>
                <div className="mt-2">
                    <p className="text-sm text-gray-500">
                        Are you sure you want to delete this order? This action cannot be undone.
                    </p>
                </div>
            </div>

            <div className="mt-4 bg-gray-50 border border-gray-200 rounded-md p-4">
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="font-medium text-gray-700">Customer:</span>
                        <span className="text-gray-900">{customerName}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="font-medium text-gray-700">Event:</span>
                        <span className="text-gray-900">{eventTitle}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="font-medium text-gray-700">Tickets:</span>
                        <span className="text-gray-900">{order.tickets?.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="font-medium text-gray-700">Status:</span>
                        <span className={`font-medium ${
                            order.status === 'PAID' ? 'text-green-600' : 
                            order.status === 'PENDING' ? 'text-yellow-600' : 
                            'text-red-600'
                        }`}>
                            {order.status}
                        </span>
                    </div>
                    {amountInPounds > 0 && (
                        <div className="flex justify-between">
                            <span className="font-medium text-gray-700">Amount:</span>
                            <span className="text-gray-900">£{amountInPounds.toFixed(2)}</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
                                    <div className="flex">
                        <ExclamationCircleIcon className="w-5 h-5 text-red-400" />
                        <div className="ml-3">
                        <h4 className="text-sm font-medium text-red-800">
                            This will permanently delete the order
                        </h4>
                        <div className="mt-2 text-sm text-red-700">
                            <ul className="list-disc pl-5 space-y-1">
                                {order.status === "PAID" && (
                                    <li>Order will be refunded</li>
                                )}
                                {order.status === "PENDING" && (
                                    <li>Order will be cancelled</li>
                                )}
                                <li>All tickets will be permanently deleted</li>
                                <li>Order data will be completely removed from the database</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

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
                            Delete Order
                        </div>
                    )}
                </button>
            </div>
        </Dialog>
    );
};
