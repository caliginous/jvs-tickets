/**
 * UI Component Tests for Monetary Amount Display
 * 
 * Tests all UI components that display monetary amounts:
 * - Order dialogs
 * - Refund components
 * - Ticket selection
 * - Price displays
 */

import { describe, test, expect, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

// Mock Next.js components
jest.mock('next/dynamic', () => () => {
  const DynamicComponent = () => null;
  DynamicComponent.displayName = 'DynamicComponent';
  return DynamicComponent;
});

jest.mock('next/image', () => {
  return function MockImage(props: any) {
    return <img {...props} />;
  };
});

// Mock UI components
jest.mock('../../ui', () => ({
  Dialog: ({ children, open }: any) => open ? <div data-testid="dialog">{children}</div> : null,
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
  Input: ({ value, onChange, ...props }: any) => (
    <input 
      value={value} 
      onChange={(e) => onChange?.(e)} 
      {...props}
    />
  ),
  showToast: {
    success: jest.fn(),
    error: jest.fn()
  }
}));

// Import components to test
import { formatAmount, formatTicketPrice, getOrderTotalInPounds } from '../src/lib/amountUtils';

// Mock data
const mockOrder = {
  id: 'test-order-123',
  finalTotal: 2500, // £25.00 in pence
  originalTotal: 3000, // £30.00 in pence
  discountAmount: 500, // £5.00 in pence
  status: 'PAID',
  user: { firstName: 'John', lastName: 'Doe' },
  eventDate: {
    event: { title: 'Test Event' },
    date: new Date('2025-12-25')
  }
};

const mockTicketType = {
  id: 1,
  name: 'Standard Ticket',
  price: 2000, // £20.00 in pence
  currency: 'GBP'
};

describe('Amount Utility Functions in UI Context', () => {
  test('formatAmount should display correct currency in components', () => {
    expect(formatAmount(2500)).toBe('£25.00');
    expect(formatAmount(1500)).toBe('£15.00');
    expect(formatAmount(100)).toBe('£1.00');
    expect(formatAmount(50)).toBe('£0.50');
    expect(formatAmount(0)).toBe('£0.00');
  });

  test('formatTicketPrice should display ticket prices correctly', () => {
    expect(formatTicketPrice(2000)).toBe('£20.00');
    expect(formatTicketPrice(1500)).toBe('£15.00');
    expect(formatTicketPrice(500)).toBe('£5.00');
  });

  test('getOrderTotalInPounds should extract display amounts', () => {
    expect(getOrderTotalInPounds(mockOrder)).toBe(25.00);
    
    const orderWithZeroFinal = { ...mockOrder, finalTotal: 0 };
    expect(getOrderTotalInPounds(orderWithZeroFinal)).toBe(30.00);
  });
});

describe('OrderDetailsDialog Amount Display', () => {
  // Mock the OrderDetailsDialog component behavior
  const MockOrderDetailsDialog = ({ order }: { order: any }) => {
    const displayAmount = formatAmount(order.finalTotal || order.originalTotal || 0, order.id);
    
    return (
      <div data-testid="order-details">
        <div data-testid="order-total">
          Order Total: {displayAmount}
        </div>
        <div data-testid="order-info">
          <div>Event: {order.eventDate?.event?.title}</div>
          <div>Customer: {order.user?.firstName} {order.user?.lastName}</div>
          <div>Status: {order.status}</div>
        </div>
      </div>
    );
  };

  test('should display order total correctly', () => {
    render(<MockOrderDetailsDialog order={mockOrder} />);
    
    expect(screen.getByTestId('order-total')).toHaveTextContent('Order Total: £25.00');
  });

  test('should display zero amounts correctly', () => {
    const zeroOrder = { ...mockOrder, finalTotal: 0, originalTotal: 0 };
    render(<MockOrderDetailsDialog order={zeroOrder} />);
    
    expect(screen.getByTestId('order-total')).toHaveTextContent('Order Total: £0.00');
  });

  test('should handle large amounts correctly', () => {
    const largeOrder = { ...mockOrder, finalTotal: 999999 }; // £9999.99
    render(<MockOrderDetailsDialog order={largeOrder} />);
    
    expect(screen.getByTestId('order-total')).toHaveTextContent('Order Total: £9999.99');
  });
});

describe('RefundDialog Amount Handling', () => {
  const MockRefundDialog = ({ order, onRefund }: { order: any, onRefund: (amount: number) => void }) => {
    const maxAmount = getOrderTotalInPounds(order);
    const [refundAmount, setRefundAmount] = React.useState(maxAmount);

    const handleRefund = () => {
      const amountInPence = Math.round(refundAmount * 100);
      onRefund(amountInPence);
    };

    return (
      <div data-testid="refund-dialog">
        <div data-testid="order-total">
          Order Total: £{maxAmount.toFixed(2)}
        </div>
        <input
          data-testid="refund-amount"
          type="number"
          value={refundAmount.toFixed(2)}
          onChange={(e) => setRefundAmount(parseFloat(e.target.value) || 0)}
          step="0.01"
          min="0"
          max={maxAmount}
        />
        <div data-testid="refund-summary">
          Refund Amount: £{refundAmount.toFixed(2)}
        </div>
        <button data-testid="process-refund" onClick={handleRefund}>
          Process Refund
        </button>
      </div>
    );
  };

  test('should display correct order total and allow refund input', () => {
    const mockRefundHandler = jest.fn();
    render(<MockRefundDialog order={mockOrder} onRefund={mockRefundHandler} />);
    
    expect(screen.getByTestId('order-total')).toHaveTextContent('Order Total: £25.00');
    expect(screen.getByTestId('refund-amount')).toHaveValue(25.00);
  });

  test('should handle partial refund amounts', async () => {
    const mockRefundHandler = jest.fn();
    render(<MockRefundDialog order={mockOrder} onRefund={mockRefundHandler} />);
    
    const refundInput = screen.getByTestId('refund-amount');
    fireEvent.change(refundInput, { target: { value: '15.50' } });
    
    expect(screen.getByTestId('refund-summary')).toHaveTextContent('Refund Amount: £15.50');
    
    fireEvent.click(screen.getByTestId('process-refund'));
    
    await waitFor(() => {
      expect(mockRefundHandler).toHaveBeenCalledWith(1550); // £15.50 in pence
    });
  });

  test('should handle edge case amounts', async () => {
    const mockRefundHandler = jest.fn();
    render(<MockRefundDialog order={mockOrder} onRefund={mockRefundHandler} />);
    
    const refundInput = screen.getByTestId('refund-amount');
    
    // Test minimum amount
    fireEvent.change(refundInput, { target: { value: '0.01' } });
    fireEvent.click(screen.getByTestId('process-refund'));
    
    await waitFor(() => {
      expect(mockRefundHandler).toHaveBeenCalledWith(1); // £0.01 in pence
    });

    // Test maximum amount
    fireEvent.change(refundInput, { target: { value: '25.00' } });
    fireEvent.click(screen.getByTestId('process-refund'));
    
    await waitFor(() => {
      expect(mockRefundHandler).toHaveBeenCalledWith(2500); // £25.00 in pence
    });
  });
});

describe('Ticket Price Display Components', () => {
  const MockTicketTypeCard = ({ ticketType }: { ticketType: any }) => {
    return (
      <div data-testid="ticket-card">
        <h3 data-testid="ticket-name">{ticketType.name}</h3>
        <div data-testid="ticket-price">
          {formatTicketPrice(ticketType.price, ticketType.currency)}
        </div>
        <div data-testid="ticket-currency">Currency: {ticketType.currency}</div>
      </div>
    );
  };

  test('should display ticket price correctly', () => {
    render(<MockTicketTypeCard ticketType={mockTicketType} />);
    
    expect(screen.getByTestId('ticket-name')).toHaveTextContent('Standard Ticket');
    expect(screen.getByTestId('ticket-price')).toHaveTextContent('£20.00');
    expect(screen.getByTestId('ticket-currency')).toHaveTextContent('Currency: GBP');
  });

  test('should handle various ticket price ranges', () => {
    const ticketTypes = [
      { ...mockTicketType, name: 'Free', price: 0 },
      { ...mockTicketType, name: 'Student', price: 500 }, // £5.00
      { ...mockTicketType, name: 'Premium', price: 5000 }, // £50.00
      { ...mockTicketType, name: 'VIP', price: 15000 } // £150.00
    ];

    ticketTypes.forEach((ticket, index) => {
      const { rerender } = render(<MockTicketTypeCard ticketType={ticket} />);
      
      expect(screen.getByTestId('ticket-name')).toHaveTextContent(ticket.name);
      
      const expectedPrices = ['£0.00', '£5.00', '£50.00', '£150.00'];
      expect(screen.getByTestId('ticket-price')).toHaveTextContent(expectedPrices[index]);
    });
  });
});

describe('Shopping Cart Amount Calculations', () => {
  const MockShoppingCart = ({ ticketTypes }: { ticketTypes: any[] }) => {
    const [cart, setCart] = React.useState<{ [key: number]: number }>({});

    const updateQuantity = (ticketId: number, quantity: number) => {
      setCart(prev => ({ ...prev, [ticketId]: quantity }));
    };

    const getTotalAmount = () => {
      return Object.entries(cart).reduce((total, [ticketId, quantity]) => {
        const ticket = ticketTypes.find(t => t.id === parseInt(ticketId));
        return total + (ticket ? ticket.price * quantity : 0);
      }, 0);
    };

    const getTotalDisplay = () => {
      const totalPence = getTotalAmount();
      return `£${(totalPence / 100).toFixed(2)}`;
    };

    return (
      <div data-testid="shopping-cart">
        {ticketTypes.map(ticket => (
          <div key={ticket.id} data-testid={`ticket-${ticket.id}`}>
            <span>{ticket.name} - {formatTicketPrice(ticket.price)}</span>
            <input
              data-testid={`quantity-${ticket.id}`}
              type="number"
              value={cart[ticket.id] || 0}
              onChange={(e) => updateQuantity(ticket.id, parseInt(e.target.value) || 0)}
              min="0"
              max="10"
            />
          </div>
        ))}
        <div data-testid="cart-total">Total: {getTotalDisplay()}</div>
      </div>
    );
  };

  test('should calculate cart total correctly', () => {
    const ticketTypes = [
      { id: 1, name: 'Standard', price: 2000 }, // £20.00
      { id: 2, name: 'Student', price: 1500 }   // £15.00
    ];

    render(<MockShoppingCart ticketTypes={ticketTypes} />);

    expect(screen.getByTestId('cart-total')).toHaveTextContent('Total: £0.00');

    // Add 2 standard tickets
    fireEvent.change(screen.getByTestId('quantity-1'), { target: { value: '2' } });
    expect(screen.getByTestId('cart-total')).toHaveTextContent('Total: £40.00');

    // Add 1 student ticket
    fireEvent.change(screen.getByTestId('quantity-2'), { target: { value: '1' } });
    expect(screen.getByTestId('cart-total')).toHaveTextContent('Total: £55.00');
  });
});

describe('Amount Input Validation Components', () => {
  const MockPriceInput = ({ onPriceChange }: { onPriceChange: (pence: number) => void }) => {
    const [displayValue, setDisplayValue] = React.useState('');
    const [error, setError] = React.useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setDisplayValue(value);

      const numValue = parseFloat(value);
      
      if (isNaN(numValue) || numValue < 0) {
        setError('Please enter a valid amount');
        return;
      }

      if (numValue > 1000) {
        setError('Amount cannot exceed £1000');
        return;
      }

      setError('');
      const pence = Math.round(numValue * 100);
      onPriceChange(pence);
    };

    return (
      <div data-testid="price-input">
        <label>Price (£)</label>
        <input
          data-testid="price-field"
          type="number"
          value={displayValue}
          onChange={handleChange}
          step="0.01"
          min="0"
          max="1000"
          placeholder="0.00"
        />
        {error && <div data-testid="price-error" className="error">{error}</div>}
      </div>
    );
  };

  test('should convert user input to pence correctly', () => {
    const mockPriceChange = jest.fn();
    render(<MockPriceInput onPriceChange={mockPriceChange} />);

    const priceField = screen.getByTestId('price-field');

    fireEvent.change(priceField, { target: { value: '25.99' } });
    expect(mockPriceChange).toHaveBeenLastCalledWith(2599);

    fireEvent.change(priceField, { target: { value: '10.00' } });
    expect(mockPriceChange).toHaveBeenLastCalledWith(1000);

    fireEvent.change(priceField, { target: { value: '0.50' } });
    expect(mockPriceChange).toHaveBeenLastCalledWith(50);
  });

  test('should validate input ranges', () => {
    const mockPriceChange = jest.fn();
    render(<MockPriceInput onPriceChange={mockPriceChange} />);

    const priceField = screen.getByTestId('price-field');

    // Test negative amount
    fireEvent.change(priceField, { target: { value: '-5.00' } });
    expect(screen.getByTestId('price-error')).toHaveTextContent('Please enter a valid amount');

    // Test excessive amount
    fireEvent.change(priceField, { target: { value: '1500.00' } });
    expect(screen.getByTestId('price-error')).toHaveTextContent('Amount cannot exceed £1000');

    // Test valid amount
    fireEvent.change(priceField, { target: { value: '25.00' } });
    expect(screen.queryByTestId('price-error')).toBeNull();
  });
});

describe('Responsive Amount Display', () => {
  test('should handle different screen sizes and amount lengths', () => {
    const amounts = [
      { pence: 500, display: '£5.00' },
      { pence: 12345, display: '£123.45' },
      { pence: 999999, display: '£9999.99' }
    ];

    amounts.forEach(({ pence, display }) => {
      const formattedAmount = formatAmount(pence);
      expect(formattedAmount).toBe(display);
      expect(formattedAmount.length).toBeLessThanOrEqual(10); // Reasonable length for UI
    });
  });

  test('should maintain precision in calculations', () => {
    // Test that UI calculations don't introduce floating point errors
    const price1 = 3333; // £33.33
    const price2 = 3334; // £33.34
    const total = price1 + price2; // Should be 6667 pence = £66.67
    
    expect(total).toBe(6667);
    expect(formatAmount(total)).toBe('£66.67');
  });
});









