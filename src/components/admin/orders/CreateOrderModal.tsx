import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, Button, Input, Select } from '../../../ui';
import { showToast } from '../../../ui';
import { XIcon, PlusIcon, MinusIcon } from '@heroicons/react/solid';

interface Event {
  id: number;
  title: string;
  dates: Array<{
    id: number;
    date: string;
    title?: string;
  }>;
}

interface EventTicketType {
  id: number;
  name: string;
  description?: string | null;
  price: number;
  currency: string;
  capacity?: number | null;
  sold: number;
  isActive: boolean;
}

interface TicketSelection {
  eventTicketTypeId: number;
  quantity: number;
  priceOverride?: number; // Allow admin to override ticket price
}

interface CreateOrderModalProps {
  open: boolean;
  events: Event[];
  onClose: () => void;
  onOrderCreated: (orderId: string, paymentLink?: string) => void;
}

export default function CreateOrderModal({
  open,
  events,
  onClose,
  onOrderCreated
}: CreateOrderModalProps) {
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [selectedEventDateId, setSelectedEventDateId] = useState<number | null>(null);
  const [ticketTypes, setTicketTypes] = useState<EventTicketType[]>([]);
  const [ticketSelections, setTicketSelections] = useState<TicketSelection[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingTicketTypes, setLoadingTicketTypes] = useState(false);
  
  // Customer information
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  
  // Payment and admin
  const [paymentMethod, setPaymentMethod] = useState<'stripe_link' | 'manual_paid' | 'invoice' | 'free'>('stripe_link');
  const [adminNotes, setAdminNotes] = useState('');

  // Filter events to show only future events
  const futureEvents = events.filter(event => {
    if (!event.dates || event.dates.length === 0) return false;
    // Check if any date is in the future
    return event.dates.some(date => new Date(date.date) > new Date());
  });

  const selectedEvent = futureEvents.find(e => e.id === selectedEventId);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open]);

  const loadTicketTypes = useCallback(async () => {
    if (!selectedEventId) return;
    
    try {
      setLoadingTicketTypes(true);
      const response = await fetch(`/api/admin/events/${selectedEventId}/ticket-types`);
      if (!response.ok) {
        throw new Error('Failed to load ticket types');
      }
      const data = await response.json();
      const activeTicketTypes = data.filter((tt: EventTicketType) => tt.isActive);
      setTicketTypes(activeTicketTypes);
      setTicketSelections([]);
    } catch (error) {
      console.error('Error loading ticket types:', error);
      showToast.error('Failed to load ticket types');
    } finally {
      setLoadingTicketTypes(false);
    }
  }, [selectedEventId]);

  // Load ticket types when event changes
  useEffect(() => {
    if (selectedEventId) {
      loadTicketTypes();
    } else {
      setTicketTypes([]);
      setTicketSelections([]);
    }
  }, [selectedEventId, loadTicketTypes]);

  const resetForm = () => {
    setSelectedEventId(null);
    setSelectedEventDateId(null);
    setTicketTypes([]);
    setTicketSelections([]);
    setFirstName('');
    setLastName('');
    setPhone('');
    setEmail('');
    setPaymentMethod('stripe_link');
    setAdminNotes('');
  };

  const addTicketSelection = () => {
    if (ticketTypes.length === 0) return;
    
    setTicketSelections(prev => [...prev, {
      eventTicketTypeId: ticketTypes[0].id,
      quantity: 1,
      priceOverride: ticketTypes[0].price / 100 // Default to original price in pounds
    }]);
  };

  const updateTicketSelection = (index: number, field: keyof TicketSelection, value: number) => {
    setTicketSelections(prev => prev.map((selection, i) => 
      i === index ? { ...selection, [field]: value } : selection
    ));
  };

  const removeTicketSelection = (index: number) => {
    setTicketSelections(prev => prev.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return ticketSelections.reduce((total, selection) => {
      const price = selection.priceOverride || 0;
      return total + (price * selection.quantity);
    }, 0);
  };

  const handleSubmit = async () => {
    // Validation
    if (!selectedEventId || !selectedEventDateId) {
      showToast.error('Please select an event and date');
      return;
    }

    if (ticketSelections.length === 0) {
      showToast.error('Please select at least one ticket');
      return;
    }

    if (!firstName || !lastName || !email) {
      showToast.error('Please fill in customer first name, last name, and email');
      return;
    }

    if (ticketSelections.some(s => s.quantity <= 0)) {
      showToast.error('All ticket quantities must be greater than 0');
      return;
    }

    if (ticketSelections.some(s => !s.priceOverride || s.priceOverride < 0)) {
      showToast.error('All ticket prices must be greater than or equal to 0');
      return;
    }

    try {
      setLoading(true);

      const orderData = {
        eventId: selectedEventId,
        eventDateId: selectedEventDateId,
        items: ticketSelections.map(selection => ({
          eventTicketTypeId: selection.eventTicketTypeId,
          quantity: selection.quantity,
          priceOverride: selection.priceOverride // Send price override to API
        })),
        customer: {
          firstName,
          lastName,
          email,
          phone,
          address: '', // Not required for admin orders
          zip: '',
          city: '',
          countryCode: 'GB',
          regionCode: ''
        },
        paymentMethod,
        notes: adminNotes,
        locale: 'en'
      };

      const response = await fetch('/api/admin/orders/create-with-ticket-types', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create order');
      }

      const result = await response.json();
      
      showToast.success('Order created successfully!');
      onOrderCreated(result.orderId, result.paymentLink);
      onClose();
      
    } catch (error) {
      console.error('Error creating order:', error);
      showToast.error(error instanceof Error ? error.message : 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} className="max-w-4xl">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Create Order with Ticket Types</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-500"
        >
          <XIcon className="h-6 w-6" />
        </button>
      </div>

      <div className="space-y-6">
        {/* Event Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Event *
            </label>
            <Select
              value={selectedEventId?.toString() || ''}
              onChange={(value) => {
                const eventId = value ? parseInt(value) : null;
                setSelectedEventId(eventId);
                setSelectedEventDateId(null);
              }}
              placeholder="Select an event..."
              options={[
                { value: '', label: 'Select an event...', disabled: true },
                ...futureEvents.map(event => ({
                  value: event.id.toString(),
                  label: event.title
                }))
              ]}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Event Date *
            </label>
            <Select
              value={selectedEventDateId?.toString() || ''}
              onChange={(value) => setSelectedEventDateId(value ? parseInt(value) : null)}
              placeholder="Select a date..."
              options={[
                { value: '', label: 'Select a date...', disabled: true },
                ...(selectedEvent?.dates.map(date => ({
                  value: date.id.toString(),
                  label: date.title || new Date(date.date).toLocaleDateString('en-GB', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })
                })) || [])
              ]}
              className="w-full"
              disabled={!selectedEvent}
            />
          </div>
        </div>

        {/* Ticket Selection */}
        {selectedEventId && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Select Tickets *
              </label>
              <Button
                type="button"
                onClick={addTicketSelection}
                disabled={loadingTicketTypes || ticketTypes.length === 0}
                className="text-sm px-3 py-1"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Ticket
              </Button>
            </div>

            {loadingTicketTypes ? (
              <div className="text-center py-4 text-gray-500">Loading ticket types...</div>
            ) : ticketTypes.length === 0 ? (
              <div className="text-center py-4 text-gray-500">No active ticket types found for this event</div>
            ) : (
              <div className="space-y-3">
                {ticketSelections.map((selection, index) => {
                  const ticketType = ticketTypes.find(tt => tt.id === selection.eventTicketTypeId);
                  return (
                    <div key={index} className="flex items-center space-x-3 p-3 border rounded-lg">
                      <div className="flex-1">
                        <Select
                          value={selection.eventTicketTypeId.toString()}
                          onChange={(value) => {
                            const newTicketTypeId = parseInt(value);
                            const newTicketType = ticketTypes.find(tt => tt.id === newTicketTypeId);
                            updateTicketSelection(index, 'eventTicketTypeId', newTicketTypeId);
                            // Update price override to new ticket type's default price
                            if (newTicketType) {
                              updateTicketSelection(index, 'priceOverride', newTicketType.price / 100);
                            }
                          }}
                          options={ticketTypes.map(tt => ({
                            value: tt.id.toString(),
                            label: `${tt.name}${tt.capacity ? ` (${tt.capacity - tt.sold} available)` : ''}`
                          }))}
                          className="w-full"
                        />
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => updateTicketSelection(index, 'quantity', Math.max(1, selection.quantity - 1))}
                          className="p-1 text-gray-400 hover:text-gray-600"
                        >
                          <MinusIcon className="h-4 w-4" />
                        </button>
                        
                        <Input
                          type="number"
                          min="1"
                          value={selection.quantity}
                          onChange={(e) => updateTicketSelection(index, 'quantity', parseInt(e.target.value) || 1)}
                          className="w-16 text-center"
                        />
                        
                        <button
                          type="button"
                          onClick={() => updateTicketSelection(index, 'quantity', selection.quantity + 1)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                        >
                          <PlusIcon className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">£</span>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={selection.priceOverride?.toFixed(2) || '0.00'}
                          onChange={(e) => updateTicketSelection(index, 'priceOverride', parseFloat(e.target.value) || 0)}
                          className="w-20 text-center"
                        />
                      </div>

                      <div className="text-sm font-medium text-gray-900 w-20 text-right">
                        £{((selection.priceOverride || 0) * selection.quantity).toFixed(2)}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeTicketSelection(index)}
                        className="p-1 text-red-400 hover:text-red-600"
                      >
                        <XIcon className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}

                {ticketSelections.length > 0 && (
                  <div className="flex justify-end pt-3 border-t">
                    <div className="text-lg font-semibold">
                      Total: £{calculateTotal().toFixed(2)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Customer Information */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Customer Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name *
              </label>
              <Input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name *
              </label>
              <Input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full"
                required
              />
            </div>
          </div>
        </div>

        {/* Payment Method and Admin Notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Method
            </label>
            <Select
              value={paymentMethod}
              onChange={(value) => setPaymentMethod(value as typeof paymentMethod)}
              options={[
                { value: 'stripe_link', label: 'Generate Stripe Payment Link' },
                { value: 'manual_paid', label: 'Mark as Paid' },
                { value: 'invoice', label: 'Invoice' },
                { value: 'free', label: 'Free' }
              ]}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Admin Notes
            </label>
            <Input
              type="text"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              className="w-full"
              placeholder="Optional notes for internal use"
            />
          </div>
        </div>
      </div>

      {/* Actions */}
              <div className="flex justify-end space-x-3 mt-8 pt-6 border-t">
          <Button
            type="button"
            onClick={onClose}
            variant="outline"
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={
              loading || 
              !selectedEventId || 
              !selectedEventDateId || 
              ticketSelections.length === 0 ||
              !firstName.trim() ||
              !lastName.trim() ||
              !email.trim() ||
              ticketSelections.some(s => s.quantity <= 0 || !s.priceOverride || s.priceOverride < 0)
            }
          >
            {loading ? 'Creating...' : 'Create Order'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
