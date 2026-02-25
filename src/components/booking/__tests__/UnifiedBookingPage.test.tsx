import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { UnifiedBookingPage } from '../UnifiedBookingPage';

// Mock the Next.js router
const mockRouter = {
  pathname: '/booking/[eventDateId]', // Updated from [eventId] to [eventDateId]
  query: { eventDateId: '123' }, // Updated from eventId to eventDateId
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
};

jest.mock('next/router', () => ({
  useRouter: () => mockRouter,
}));

// Mock the Redux store
const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      selectedEvent: (state = { id: -1 }, action) => {
        if (action.type === 'event/setEvent') {
          return { id: action.payload };
        }
        return state;
      },
      order: (state = { tickets: [] }, action) => {
        if (action.type === 'order/setTickets') {
          return { ...state, tickets: action.payload };
        }
        return state;
      },
      personalInformation: (state = { email: '', address: null }, action) => state,
      payment: (state = { state: 'pending' }, action) => state,
    },
    preloadedState: initialState,
  });
};

// Mock data
const mockEvent = {
  id: 1,
  title: 'Test Event',
  description: 'A test event for testing',
  coverImage: 'test-image.jpg',
  personalTicket: false,
  customFields: [],
  categories: [
    { id: 1, name: 'General Admission', price: 25.00, maxAmount: 10, color: '#000000' },
    { id: 2, name: 'VIP', price: 50.00, maxAmount: 5, color: '#FFD700' },
  ],
};

const mockCategories = [
  { id: 1, name: 'General Admission', price: 25.00, maxAmount: 10, color: '#000000' },
  { id: 2, name: 'VIP', price: 50.00, maxAmount: 5, color: '#FFD700' },
];

const mockPaymentMethods = [
  { id: 'stripe', name: 'Credit Card' },
  { id: 'paypal', name: 'PayPal' },
];

const mockDeliveryMethods = ['download', 'postal'];

const defaultProps = {
  event: mockEvent,
  categories: mockCategories,
  paymentMethods: mockPaymentMethods,
  deliveryMethods: mockDeliveryMethods,
  shippingFees: {},
  paymentFees: {},
  theme: {},
  impressUrl: 'https://example.com/impress',
};

describe('UnifiedBookingPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <UnifiedBookingPage {...defaultProps} />
      </Provider>
    );

    expect(screen.getByText('Test Event')).toBeInTheDocument();
    expect(screen.getByText('Select Tickets')).toBeInTheDocument();
    expect(screen.getByText('Personal Details')).toBeInTheDocument();
    expect(screen.getByText('Payment & Review')).toBeInTheDocument();
    expect(screen.getByText('Order Summary')).toBeInTheDocument();
  });

  it('shows event title and description', () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <UnifiedBookingPage {...defaultProps} />
      </Provider>
    );

    expect(screen.getByText('Test Event')).toBeInTheDocument();
    expect(screen.getByText('A test event for testing')).toBeInTheDocument();
  });

  it('displays progress indicator with correct sections', () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <UnifiedBookingPage {...defaultProps} />
      </Provider>
    );

    // Check that all sections are displayed
    expect(screen.getByText('Select Tickets')).toBeInTheDocument();
    expect(screen.getByText('Personal Details')).toBeInTheDocument();
    expect(screen.getByText('Payment & Review')).toBeInTheDocument();
    expect(screen.getByText('Order Summary')).toBeInTheDocument();
  });

  it('shows ticket selection section when active', () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <UnifiedBookingPage {...defaultProps} />
      </Provider>
    );

    // Ticket selection should be visible by default
    expect(screen.getByText('General Admission')).toBeInTheDocument();
    expect(screen.getByText('VIP')).toBeInTheDocument();
    expect(screen.getByText('£25.00 per ticket')).toBeInTheDocument();
    expect(screen.getByText('£50.00 per ticket')).toBeInTheDocument();
  });

  it('handles missing event gracefully', () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <UnifiedBookingPage {...defaultProps} event={null} />
      </Provider>
    );

    expect(screen.getByText('Event Not Found')).toBeInTheDocument();
    expect(screen.getByText('The requested event could not be found.')).toBeInTheDocument();
  });

  it('displays JVS branding in header and footer', () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <UnifiedBookingPage {...defaultProps} />
      </Provider>
    );

    expect(screen.getByText('Jewish Vegan Society')).toBeInTheDocument();
    expect(screen.getByText('JVS')).toBeInTheDocument();
  });
});
