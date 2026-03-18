import { useSession } from 'next-auth/react';
import { AdminLayout } from '../../components/admin/layout';
import { getAdminServerSideProps } from '../../constants/serverUtil';
import { PermissionSection, PermissionType } from '../../constants/interfaces';
import prisma from '../../lib/prisma';
import { Button, Input, showToast } from '../../ui';
import { CheckIcon, LightningBoltIcon } from '@heroicons/react/solid';
import axios from 'axios';
import { useState, useEffect } from 'react';

interface EventDate {
  id: number;
  date: string;
}

interface Event {
  id: number;
  title: string;
  dates: EventDate[];
}

interface TicketType {
  id: number;
  name: string;
  price: number;
  currency: string;
  isActive: boolean;
  capacity: number | null;
  sold: number;
}

interface DoorSalesProps {
  events: Event[];
  permissionDenied?: boolean;
}

export default function DoorSales({ events, permissionDenied }: DoorSalesProps) {
  const { status } = useSession();
  
  // Form state
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [selectedEventDateId, setSelectedEventDateId] = useState<string>('');
  const [selectedTicketTypeId, setSelectedTicketTypeId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  
  // UI state
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [loadingTicketTypes, setLoadingTicketTypes] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [submittedData, setSubmittedData] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    quantity: number;
    ticketTypeName: string;
  } | null>(null);

  // Get the selected event and its dates
  const selectedEvent = events.find(e => e.id === parseInt(selectedEventId));
  const eventDates = selectedEvent?.dates || [];
  
  // Get the selected ticket type
  const selectedTicketType = ticketTypes.find(tt => tt.id === parseInt(selectedTicketTypeId));

  // Auto-select single event on load
  useEffect(() => {
    const upcomingEvents = events.filter(e => e.dates.length > 0);
    if (upcomingEvents.length === 1) {
      setSelectedEventId(upcomingEvents[0].id.toString());
    }
  }, [events]);

  // Auto-select single event date when event changes
  useEffect(() => {
    if (selectedEvent && selectedEvent.dates.length === 1) {
      setSelectedEventDateId(selectedEvent.dates[0].id.toString());
    } else {
      setSelectedEventDateId('');
    }
  }, [selectedEvent]);

  // Load ticket types when event changes
  useEffect(() => {
    if (!selectedEventId) {
      setTicketTypes([]);
      setSelectedTicketTypeId('');
      return;
    }

    const loadTicketTypes = async () => {
      setLoadingTicketTypes(true);
      try {
        const response = await axios.get(`/api/admin/events/${selectedEventId}/ticket-types`);
        const activeTypes = response.data.filter((tt: TicketType) => tt.isActive);
        setTicketTypes(activeTypes);
        
        // Auto-select if only one active ticket type
        if (activeTypes.length === 1) {
          setSelectedTicketTypeId(activeTypes[0].id.toString());
        } else {
          setSelectedTicketTypeId('');
        }
      } catch (error) {
        console.error('Failed to load ticket types:', error);
        showToast.error('Failed to load ticket types');
        setTicketTypes([]);
      } finally {
        setLoadingTicketTypes(false);
      }
    };

    loadTicketTypes();
  }, [selectedEventId]);

  // Calculate total price
  const totalPrice = selectedTicketType 
    ? (selectedTicketType.price / 100) * quantity 
    : 0;

  // Check if form is valid
  const isFormValid = 
    selectedEventId && 
    selectedEventDateId && 
    selectedTicketTypeId && 
    quantity > 0 && 
    firstName.trim() && 
    lastName.trim() && 
    email.trim() && 
    email.includes('@');

  // Handle form submission
  const handleSubmit = async () => {
    if (!isFormValid || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const payload = {
        eventId: parseInt(selectedEventId),
        eventDateId: parseInt(selectedEventDateId),
        items: [{ 
          eventTicketTypeId: parseInt(selectedTicketTypeId), 
          quantity 
        }],
        customer: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim().toLowerCase(),
          phone: '',
          address: '',
          zip: '',
          city: '',
          countryCode: 'GB',
          regionCode: ''
        },
        paymentMethod: 'stripe_link',
        notes: 'Door sale',
        locale: 'en'
      };

      await axios.post('/api/admin/orders/create-with-ticket-types', payload);

      // Success
      setSubmittedData({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        quantity,
        ticketTypeName: selectedTicketType?.name || 'Ticket'
      });
      setSubmitted(true);

    } catch (error: any) {
      console.error('Door sale failed:', error);
      const message = error.response?.data?.error || error.message || 'Failed to create order';
      showToast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle reset for another sale
  const handleReset = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setQuantity(1);
    setSubmitted(false);
    setSubmittedData(null);
  };

  // Format date for display
  const formatEventDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Loading state
  if (status === 'loading') {
    return (
      <AdminLayout permissionDenied={permissionDenied}>
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <div className="ml-3 text-gray-600">Loading...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout permissionDenied={permissionDenied}>
      <div className="max-w-lg mx-auto px-4 pb-32">
        <div className="flex items-center gap-3 py-4">
          <LightningBoltIcon className="w-8 h-8 text-yellow-500" />
          <h1 className="text-2xl font-bold">Door Sales</h1>
        </div>

        {submitted && submittedData ? (
          // Confirmation Panel
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-6">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
              <CheckIcon className="w-10 h-10 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Payment link sent!</h2>
              <p className="mt-2 text-gray-600">
                {submittedData.quantity} × {submittedData.ticketTypeName}
              </p>
              <p className="text-gray-600">
                for {submittedData.firstName} {submittedData.lastName}
              </p>
              <p className="mt-1 text-sm text-gray-400">
                Link sent to {submittedData.email}
              </p>
            </div>
            <Button 
              className="w-full min-h-[56px] text-lg" 
              onClick={handleReset}
            >
              Sell another ticket
            </Button>
          </div>
        ) : (
          // Input Form
          <div className="space-y-6">
            {/* Event Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event
              </label>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full min-h-[48px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
              >
                <option value="">Select event...</option>
                {events.filter(e => e.dates.length > 0).map(event => (
                  <option key={event.id} value={event.id}>
                    {event.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Event Date Selector */}
            {selectedEventId && eventDates.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event Date
                </label>
                <select
                  value={selectedEventDateId}
                  onChange={(e) => setSelectedEventDateId(e.target.value)}
                  className="w-full min-h-[48px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                >
                  <option value="">Select date...</option>
                  {eventDates.map(date => (
                    <option key={date.id} value={date.id}>
                      {formatEventDate(date.date)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Ticket Type Selector */}
            {selectedEventId && ticketTypes.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ticket Type
                </label>
                <select
                  value={selectedTicketTypeId}
                  onChange={(e) => setSelectedTicketTypeId(e.target.value)}
                  className="w-full min-h-[48px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                  disabled={loadingTicketTypes}
                >
                  <option value="">
                    {loadingTicketTypes ? 'Loading...' : 'Select ticket type...'}
                  </option>
                  {ticketTypes.map(tt => (
                    <option key={tt.id} value={tt.id}>
                      {tt.name} — £{(tt.price / 100).toFixed(2)}
                    </option>
                  ))}
                </select>

                {/* Price Info */}
                {selectedTicketType && (
                  <p className="mt-2 text-sm text-gray-500">
                    {selectedTicketType.name} — £{(selectedTicketType.price / 100).toFixed(2)} each
                    · Total: £{totalPrice.toFixed(2)}
                  </p>
                )}
              </div>
            )}

            {/* Quantity Stepper */}
            {selectedTicketTypeId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity
                </label>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    className="w-12 h-12 rounded-full border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 flex items-center justify-center text-2xl font-medium text-gray-600 transition-colors"
                  >
                    −
                  </button>
                  <span className="text-2xl font-bold w-8 text-center">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity(q => q + 1)}
                    className="w-12 h-12 rounded-full border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 flex items-center justify-center text-2xl font-medium text-gray-600 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {/* Customer Details */}
            {selectedTicketTypeId && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name
                  </label>
                  <Input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First name"
                    className="w-full min-h-[48px]"
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name
                  </label>
                  <Input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last name"
                    className="w-full min-h-[48px]"
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="customer@example.com"
                    className="w-full min-h-[48px]"
                    disabled={isSubmitting}
                  />
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Sticky Bottom Button - only shown during input state */}
      {!submitted && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 lg:left-80">
          <Button
            className="w-full min-h-[56px] text-lg"
            onClick={handleSubmit}
            disabled={!isFormValid || isSubmitting}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Sending…
              </span>
            ) : (
              <>
                Send Payment Link
                {selectedTicketType && ` — £${totalPrice.toFixed(2)}`}
              </>
            )}
          </Button>
        </div>
      )}
    </AdminLayout>
  );
}

export async function getServerSideProps(context: any) {
  return await getAdminServerSideProps(
    context,
    async () => {
      const events = await prisma.event.findMany({
        select: {
          id: true,
          title: true,
          dates: {
            select: { id: true, date: true },
            orderBy: { date: 'asc' },
            where: { date: { gte: new Date() } }
          }
        },
        orderBy: { title: 'asc' }
      });

      return {
        props: {
          events: JSON.parse(JSON.stringify(events))
        }
      };
    },
    {
      permission: PermissionSection.Orders,
      permissionType: PermissionType.Write
    }
  );
}
