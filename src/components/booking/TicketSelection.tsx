import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectOrder, setTickets } from '../../store/reducers/orderReducer';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui';

interface TicketSelectionProps {
  event: any;
  ticketTypes: any[];
  isActive: boolean;
  onComplete: () => void;
}

export const TicketSelection: React.FC<TicketSelectionProps> = ({
  event,
  ticketTypes,
  isActive,
  onComplete
}) => {
  const dispatch = useAppDispatch();
  const order = useAppSelector(selectOrder);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastClickTimeRef = useRef<number>(0);
  const clickCooldownRef = useRef<number>(300); // 300ms cooldown between clicks

  // Initialize quantities from existing order
  useEffect(() => {
    if (order.tickets.length > 0) {
      const newQuantities: Record<number, number> = {};
      order.tickets.forEach(ticket => {
        newQuantities[ticket.ticketTypeId] = (newQuantities[ticket.ticketTypeId] || 0) + ticket.amount;
      });
      setQuantities(newQuantities);
    }
  }, [order.tickets]);

  const handleQuantityChange = useCallback((ticketTypeId: number, change: number) => {
    const now = Date.now();
    
    // Prevent rapid clicks with cooldown
    if (now - lastClickTimeRef.current < clickCooldownRef.current) {
      return;
    }
    
    // Prevent updates if already updating
    if (isUpdating) {
      return;
    }
    
    lastClickTimeRef.current = now;
    setIsUpdating(true);
    
    // Use functional update to ensure we're working with the latest state
    setQuantities(prev => {
      const currentQty = prev[ticketTypeId] || 0;
      const newQty = Math.max(0, currentQty + change);
      
      return {
        ...prev,
        [ticketTypeId]: newQty
      };
    });

    // Clear errors when user makes changes
    if (errors.length > 0) {
      setErrors([]);
    }

    // Longer debounce to prevent rapid state changes
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    updateTimeoutRef.current = setTimeout(() => {
      setIsUpdating(false);
    }, 300); // Increased to 300ms debounce
  }, [errors.length, isUpdating]);

  const updateOrder = useCallback(() => {
    const newTickets: any[] = [];
    
    Object.entries(quantities).forEach(([ticketTypeId, amount]) => {
      if (amount > 0) {
        const ticketType = ticketTypes.find(t => t && t.id === parseInt(ticketTypeId));
        if (ticketType && ticketType.name && typeof ticketType.price === 'number') {
          newTickets.push({
            ticketTypeId: parseInt(ticketTypeId),
            ticketTypeName: ticketType.name,
            name: ticketType.name,
            amount: amount,
            price: ticketType.price
          });
        } else {
          console.error('TicketSelection: Invalid ticket type data for ID:', ticketTypeId, ticketType);
        }
      }
    });

    dispatch(setTickets(newTickets));
  }, [quantities, ticketTypes, dispatch]);

  // Update order whenever quantities change, but with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      updateOrder();
    }, 100); // Small delay to batch updates

    return () => clearTimeout(timeoutId);
  }, [updateOrder]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  // Safety check: Ensure ticketTypes is a valid array (AFTER all hooks)
  if (!ticketTypes || !Array.isArray(ticketTypes) || ticketTypes.length === 0) {
    console.error('TicketSelection: Invalid ticketTypes prop:', ticketTypes);
    return (
      <div className="text-center py-8">
        <div className="text-red-600 text-lg font-semibold mb-2">
          Unable to load ticket types
        </div>
        <p className="text-gray-600">
          Please refresh the page or contact support if the problem persists.
        </p>
      </div>
    );
  }

  // Safety check: Ensure event is valid (AFTER all hooks)
  if (!event || typeof event !== 'object') {
    console.error('TicketSelection: Invalid event prop:', event);
    return (
      <div className="text-center py-8">
        <div className="text-red-600 text-lg font-semibold mb-2">
          Unable to load event information
        </div>
        <p className="text-gray-600">
          Please refresh the page or contact support if the problem persists.
        </p>
      </div>
    );
  }

  // Check if ticket sales are within the valid window
  const checkSalesWindow = () => {
    const now = new Date();
    
    // Check event dates array first (if available)
    if (event.dates && event.dates.length > 0) {
      const eventDate = event.dates[0]; // Use the first/next event date
      
      // Check if sales have started
      if (eventDate.ticketSaleStartDate) {
        const startDate = new Date(eventDate.ticketSaleStartDate);
        if (now < startDate) {
          return {
            isValid: false,
            message: `Ticket sales open on ${startDate.toLocaleDateString('en-GB', { 
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', 
              hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' 
            })}`
          };
        }
      }
      
      // Check if sales have ended
      if (eventDate.ticketSaleEndDate) {
        const endDate = new Date(eventDate.ticketSaleEndDate);
        if (now > endDate) {
          return {
            isValid: false,
            message: `Ticket sales for this event have ended. Bookings closed on ${endDate.toLocaleDateString('en-GB', { 
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', 
              hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' 
            })}`
          };
        }
      }
    }
    
    // Fallback: check if event date has passed
    if (event.date) {
      const eventDate = new Date(event.date);
      if (now > eventDate) {
        return {
          isValid: false,
          message: 'This event has already taken place and tickets are no longer available.'
        };
      }
    }
    
    return { isValid: true };
  };

  const salesWindow = checkSalesWindow();

  // Show message if sales window is not valid
  if (!salesWindow.isValid) {
    return (
      <div className="text-center py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <svg 
            className="w-12 h-12 text-yellow-600 mx-auto mb-4" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
            />
          </svg>
          <h3 className="text-xl font-semibold text-yellow-900 mb-2">
            Tickets Not Available
          </h3>
          <p className="text-yellow-800">
            {salesWindow.message}
          </p>
        </div>
      </div>
    );
  }

  const getTotalTickets = () => Object.values(quantities).reduce((sum, qty) => sum + qty, 0);
  const getTotalPrice = () => {
    return Object.entries(quantities).reduce((total, [ticketTypeId, amount]) => {
      const ticketType = ticketTypes.find(t => t.id === parseInt(ticketTypeId));
      return total + ((ticketType?.price || 0) * amount);
    }, 0);
  };

  const canContinue = getTotalTickets() > 0;

  if (!isActive) return null;

  return (
    <div className="space-y-8">
      {/* Introduction */}
      <div className="text-center">
        <h3 className="text-2xl font-semibold text-neutral-900 mb-3">
          Choose your tickets for {event?.title || event?.name}
        </h3>
        <p className="text-neutral-600 text-lg">
          Select the number of tickets you need for each category
        </p>
      </div>

      {/* Error Messages */}
      {errors.length > 0 && (
        <Card className="border-error-200 bg-error-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <svg className="w-6 h-6 text-error-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                {errors.map((error, index) => (
                  <p key={index} className="text-error-800 text-sm">{error}</p>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ticket Types - Single Row Layout */}
      <div className="space-y-6">
        {/* Section Header */}
        <div className="border-b-2 border-primary-200 pb-3">
          <h4 className="text-xl font-semibold text-neutral-900">
            Select Your Tickets
          </h4>
          <p className="text-neutral-600">
            Choose the number of tickets you need for each type
          </p>
        </div>

        {/* Ticket Cards Grid - Horizontal Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {ticketTypes.map((ticketType) => {
            // Safety check: Ensure ticketType has required properties
            if (!ticketType || typeof ticketType !== 'object' || !ticketType.id || !ticketType.name) {
              console.error('TicketSelection: Invalid ticketType object:', ticketType);
              return null; // Skip invalid ticket types
            }
            
            const quantity = quantities[ticketType.id] || 0;
            const isAvailable = ticketType.available !== undefined ? ticketType.available > 0 : true;
            const remaining = ticketType.available !== undefined ? ticketType.available - quantity : null;

            return (
              <Card
                key={ticketType.id}
                className={`bg-white border rounded-lg p-6 shadow-sm transition-all duration-200 ${
                  quantity > 0
                    ? 'border-primary-400 bg-primary-50 shadow-lg'
                    : 'border-neutral-200 hover:border-primary-300 hover:shadow-md'
                } ${!isAvailable ? 'opacity-60' : ''}`}
              >
                <CardHeader className="pb-4">
                  <div className="text-center">
                    <CardTitle className="text-xl mb-2 text-neutral-900">
                      {ticketType.name}
                    </CardTitle>
                    <p className="text-sm text-gray-600 mb-3">
                      {ticketType.description || 'Standard admission ticket'}
                    </p>
                    
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Price */}
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-700">
                      £{ticketType.price?.toFixed(2) || '0.00'}
                    </div>
                    {ticketType.originalPrice && ticketType.originalPrice > ticketType.price && (
                      <div className="text-sm text-gray-600 line-through mt-1">
                        £{ticketType.originalPrice.toFixed(2)}
                      </div>
                    )}
                  </div>

                  {/* Quantity Selector */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-center space-x-4 quantity-selector">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleQuantityChange(ticketType.id, -1)}
                        disabled={quantity === 0 || !isAvailable || isUpdating}
                        className="w-10 h-10 rounded-full p-0 button-no-shake transition-all duration-200 hover:scale-105 active:scale-95"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                        </svg>
                      </Button>
                      
                      <span className="quantity-number text-2xl font-bold text-neutral-900 min-w-[3rem] text-center select-none">
                        {quantity}
                      </span>
                      
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleQuantityChange(ticketType.id, 1)}
                        disabled={!isAvailable || (remaining !== null && quantity >= remaining) || isUpdating}
                        className="w-10 h-10 rounded-full p-0 button-no-shake transition-all duration-200 hover:scale-105 active:scale-95"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </Button>
                    </div>
                    
                    {/* Subtotal */}
                    <div className="text-center">
                      <div className="text-lg font-bold text-neutral-900">
                        £{((ticketType.price || 0) * quantity).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Sold Out Badge */}
                  {!isAvailable && (
                    <div className="inline-block bg-error-100 text-error-800 text-sm font-medium px-3 py-1 rounded-full">
                      Sold Out
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Enhanced Total Price Display */}
      {getTotalTickets() > 0 && (
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm text-green-600 font-medium uppercase tracking-wide">Order Summary</div>
                  <div className="text-lg font-bold text-gray-800">
                    {getTotalTickets()} ticket{getTotalTickets() !== 1 ? 's' : ''} selected
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-green-600 font-medium mb-1">Total Amount</div>
                <div className="text-3xl font-bold text-green-700">
                  £{getTotalPrice().toFixed(2)}
                </div>
                <div className="text-xs text-green-600 mt-1">Ready to proceed</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State Warning */}
      {getTotalTickets() === 0 && (
        <Card className="border-warning-200 bg-warning-50">
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <svg className="w-8 h-8 text-warning-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-warning-800 font-semibold text-lg">No tickets selected</span>
            </div>
            <p className="text-warning-700 text-base">
              Please select at least 1 ticket to continue with your booking.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Continue Button */}
      {getTotalTickets() > 0 && (
        <div className="flex justify-center pt-8">
          <Button
            onClick={onComplete}
            size="md"
            className="px-12 py-5 text-xl font-bold bg-green-600 hover:bg-green-700 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
          >
            <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            Continue to Personal Details
          </Button>
        </div>
      )}
    </div>
  );
};
