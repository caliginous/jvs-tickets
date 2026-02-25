import React, { useState } from 'react';
import { Dialog } from '../../ui';
import { Button } from '../../ui';
import axios from 'axios';

interface CancellationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  order: {
    id: string;
    status: string;
    finalTotal: number;
    originalTotal: number;
    customerName?: string;
    email?: string;
    eventTitle?: string;
  };
  onCancellationSuccess: () => void;
}

export default function CancellationDialog({ isOpen, onClose, order, onCancellationSuccess }: CancellationDialogProps) {
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCancellation = async () => {
    if (!reason.trim()) {
      setError('Please provide a cancellation reason');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await axios.post(`/api/admin/bookings/${order.id}/cancel`, {
        reason: reason.trim()
      });

      if (response.data.success) {
        onCancellationSuccess();
      } else {
        setError(response.data.error || 'Failed to cancel booking');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to cancel booking');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setReason('');
    setError('');
    setIsLoading(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={handleClose}>
      <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
        <div className="sm:flex sm:items-start">
          <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Cancel Booking
            </h3>
            <div className="mt-2">
              <p className="text-sm text-gray-500">
                Are you sure you want to cancel this booking? This action will:
              </p>
              <ul className="mt-2 text-sm text-gray-500 list-disc list-inside">
                <li>Cancel the booking and mark it as cancelled</li>
                <li>Process a full refund through Stripe</li>
                <li>Release any reserved seats back to inventory</li>
                <li>Send a cancellation email to the customer</li>
              </ul>
              
              <div className="mt-4 p-3 bg-gray-50 rounded-md">
                <p className="text-sm font-medium text-gray-700">Booking Details:</p>
                <p className="text-sm text-gray-600">Customer: {order.customerName || 'N/A'}</p>
                <p className="text-sm text-gray-600">Event: {order.eventTitle || 'N/A'}</p>
                <p className="text-sm text-gray-600">Amount: £{(order.finalTotal / 100).toFixed(2)}</p>
              </div>

              <div className="mt-4">
                <label htmlFor="reason" className="block text-sm font-medium text-gray-700">
                  Cancellation Reason *
                </label>
                <textarea
                  id="reason"
                  rows={3}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter the reason for cancellation..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              {error && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
        <Button
          variant="danger"
          onClick={handleCancellation}
          disabled={isLoading || !reason.trim()}
          className="w-full sm:w-auto sm:ml-3"
        >
          {isLoading ? 'Cancelling...' : 'Cancel Booking'}
        </Button>
        <Button
          variant="secondary"
          onClick={handleClose}
          disabled={isLoading}
          className="mt-3 w-full sm:w-auto sm:mt-0"
        >
          Close
        </Button>
      </div>
    </Dialog>
  );
}
