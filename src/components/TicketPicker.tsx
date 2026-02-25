import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/input';
import { useAppDispatch } from '../store/hooks';
import { setTickets, setReservationId } from '../store/reducers/orderReducer';

interface TicketType {
  id: number;
  name: string;
  description?: string;
  price: number;
  currency: string;
  capacity?: number;
  sold: number; // Computed from Ticket rows, not DB column
  available: number; // Computed availability
  isSoldOut: boolean;
  isAvailable: boolean;
  publicSortOrder: number;
  colorHex?: string;
}

interface TicketPickerProps {
  eventId: number;
  eventDateId?: number;
  eventSlug: string;
  onCheckout: (sessionId: string) => void;
}

interface CartItem {
  ticketTypeId: number;
  quantity: number;
  ticketType: TicketType;
}

export default function TicketPicker({ eventId, eventDateId, eventSlug, onCheckout }: TicketPickerProps) {
  const dispatch = useAppDispatch();
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const loadTicketTypes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const url = eventDateId 
        ? `/api/public/events/${eventId}/ticket-types?eventDateId=${eventDateId}`
        : `/api/public/events/${eventId}/ticket-types`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to load ticket types');
      }
      
      const data = await response.json();
      // API returns { eventDateId, ticketTypes: [...], ... }
      setTicketTypes(data.ticketTypes || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ticket types');
    } finally {
      setLoading(false);
    }
  }, [eventId, eventDateId]);

  useEffect(() => {
    loadTicketTypes();
  }, [loadTicketTypes]);

  const getAvailableQuantity = (ticketType: TicketType) => {
    // Use pre-computed availability from the API
    if (ticketType.available === null || ticketType.available === undefined) {
      return Infinity;
    }
    return ticketType.available;
  };

  const getAvailabilityText = (ticketType: TicketType) => {
    const available = getAvailableQuantity(ticketType);
    if (available === Infinity) {
      return 'Unlimited';
    }
    if (available === 0) {
      return 'Sold out';
    }
    if (available <= 5) {
      return `${available} available`;
    }
    return `${available}+ available`;
  };

  const getAvailabilityColor = (ticketType: TicketType) => {
    const available = getAvailableQuantity(ticketType);
    if (available === 0) return 'text-red-600';
    if (available <= 5) return 'text-orange-600';
    return 'text-green-600';
  };

  const addToCart = (ticketType: TicketType) => {
    const existingItem = cart.find(item => item.ticketTypeId === ticketType.id);
    
    if (existingItem) {
      const newQuantity = existingItem.quantity + 1;
      const available = getAvailableQuantity(ticketType);
      
      if (newQuantity > available) {
        return;
      }
      
      setCart(cart.map(item => 
        item.ticketTypeId === ticketType.id 
          ? { ...item, quantity: newQuantity }
          : item
      ));
    } else {
      setCart([...cart, { ticketTypeId: ticketType.id, quantity: 1, ticketType }]);
    }
  };

  const removeFromCart = (ticketTypeId: number) => {
    setCart(cart.filter(item => item.ticketTypeId !== ticketTypeId));
  };

  const updateQuantity = (ticketTypeId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(ticketTypeId);
      return;
    }
    
    const cartItem = cart.find(item => item.ticketTypeId === ticketTypeId);
    if (!cartItem) return;
    
    const available = getAvailableQuantity(cartItem.ticketType);
    if (quantity > available) {
      return;
    }
    
    setCart(cart.map(item => 
      item.ticketTypeId === ticketTypeId 
        ? { ...item, quantity }
        : item
    ));
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) => {
      return total + (item.ticketType.price * item.quantity);
    }, 0);
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency || 'GBP'
    }).format(price / 100);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    try {
      setCheckoutLoading(true);

      // Track begin checkout event
      const totalValue = getTotalPrice() / 100; // Convert to pounds for analytics
      const trackingData = {
        eventId: eventId.toString(),
        eventTitle: 'Event Checkout', // Simplified since ticketType doesn't have event relation
        eventDate: new Date().toISOString(), // You might want to get actual event date
        ticketTypes: cart.map(item => ({
          typeId: item.ticketType.id.toString(),
          typeName: item.ticketType.name,
          quantity: item.quantity,
          price: item.ticketType.price / 100 // Convert to pounds
        })),
        totalValue
      };

      // Import and call analytics
      if (typeof window !== 'undefined') {
        const { trackBeginCheckout } = await import('../lib/analytics');
        trackBeginCheckout(trackingData);
      }

      // Store tickets in Redux for the booking workflow
      const ticketsForRedux = cart.map(item => ({
        ticketTypeId: item.ticketTypeId,
        amount: item.quantity,
        price: item.ticketType.price
      }));

      dispatch(setTickets(ticketsForRedux));
      dispatch(setReservationId(null)); // Clear any existing reservation

      // Call the onCheckout callback (will redirect to information page)
      onCheckout(null);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process checkout');
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading ticket types...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={loadTicketTypes} variant="secondary">
          Try Again
        </Button>
      </div>
    );
  }

  if (!ticketTypes || ticketTypes.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">No tickets available for this event.</p>
      </div>
    );
  }

  // API already filters for active/public and sorts by publicSortOrder
  const activeTicketTypes = ticketTypes || [];

  if (activeTicketTypes.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">No tickets are currently available for this event.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {activeTicketTypes.map((ticketType) => {
          const available = getAvailableQuantity(ticketType);
          const isSoldOut = available === 0;
          const cartItem = cart.find(item => item.ticketTypeId === ticketType.id);
          
          return (
            <div 
              key={ticketType.id}
              className={`border rounded-lg p-4 ${
                isSoldOut ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {ticketType.colorHex && (
                      <div 
                        className="w-4 h-4 rounded-full border border-gray-300"
                        style={{ backgroundColor: ticketType.colorHex }}
                      />
                    )}
                    <h3 className="text-lg font-semibold text-gray-900">
                      {ticketType.name}
                    </h3>
                    <span className={`text-sm font-medium ${getAvailabilityColor(ticketType)}`}>
                      {getAvailabilityText(ticketType)}
                    </span>
                  </div>
                  
                  {ticketType.description && (
                    <p className="text-gray-600 mb-3">{ticketType.description}</p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold text-gray-900">
                      {formatPrice(ticketType.price, ticketType.currency)}
                    </span>
                    
                    {!isSoldOut && (
                      <div className="flex items-center gap-2">
                        {cartItem ? (
                          <>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => updateQuantity(ticketType.id, cartItem.quantity - 1)}
                              disabled={cartItem.quantity <= 1}
                            >
                              -
                            </Button>
                            <Input
                              type="number"
                              min="1"
                              max={available}
                              value={cartItem.quantity}
                              onChange={(e) => updateQuantity(ticketType.id, parseInt(e.target.value) || 0)}
                              className="w-16 text-center"
                            />
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => updateQuantity(ticketType.id, cartItem.quantity + 1)}
                              disabled={cartItem.quantity >= available}
                            >
                              +
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => addToCart(ticketType)}
                            disabled={isSoldOut}
                          >
                            Add to Cart
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {cart.length > 0 && (
        <div className="border-t pt-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>
            
            <div className="space-y-2 mb-4">
              {cart.map((item) => (
                <div key={item.ticketTypeId} className="flex justify-between items-center">
                  <span className="text-gray-600">
                    {item.ticketType.name} × {item.quantity}
                  </span>
                  <span className="font-medium">
                    {formatPrice(item.ticketType.price * item.quantity, item.ticketType.currency)}
                  </span>
                </div>
              ))}
            </div>
            
            <div className="border-t pt-3">
              <div className="flex justify-between items-center mb-4">
                <span className="text-lg font-semibold">Total</span>
                <span className="text-xl font-bold text-gray-900">
                  {formatPrice(getTotalPrice(), 'GBP')}
                </span>
              </div>
              
              <Button
                onClick={handleCheckout}
                disabled={checkoutLoading}
                className="w-full"
                size="md"
              >
                {checkoutLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  'Proceed to Checkout'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
