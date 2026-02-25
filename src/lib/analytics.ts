// Google Tag Manager / Google Analytics helper functions for tickets app

declare global {
  interface Window {
    dataLayer: Record<string, unknown>[];
    gtag: (...args: any[]) => void;
  }
}

// Initialize dataLayer if it doesn't exist
export const initDataLayer = () => {
  if (typeof window !== 'undefined') {
    window.dataLayer = window.dataLayer || [];
  }
};

// Generic GTM event push
export const pushToDataLayer = (event: Record<string, unknown>) => {
  if (typeof window !== 'undefined') {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(event);
  }
};

// Helper for gtag calls
const gtag = (command: string, eventName: string, parameters?: Record<string, unknown>) => {
  if (typeof window !== 'undefined') {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: eventName,
      ...parameters
    });
  }
};

// Purchase Funnel Events
export const trackBeginCheckout = (eventData: {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  ticketTypes: Array<{
    typeId: string;
    typeName: string;
    quantity: number;
    price: number;
  }>;
  totalValue: number;
}) => {
  const items = eventData.ticketTypes.map(ticket => ({
    item_id: `event-${eventData.eventId}-${ticket.typeId}`,
    item_name: `${eventData.eventTitle} - ${ticket.typeName}`,
    item_category: 'Event Ticket',
    item_category2: eventData.eventTitle,
    quantity: ticket.quantity,
    price: ticket.price
  }));

  gtag('event', 'begin_checkout', {
    currency: 'GBP',
    value: eventData.totalValue,
    items: items,
    event_title: eventData.eventTitle,
    event_date: eventData.eventDate
  });
};

export const trackAddPaymentInfo = (paymentMethod: string, value: number) => {
  gtag('event', 'add_payment_info', {
    currency: 'GBP',
    value: value,
    payment_type: paymentMethod
  });
};

export const trackPurchase = (orderData: {
  orderId: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  totalValue: number;
  ticketCount: number;
  paymentMethod: string;
  customerEmail: string;
}) => {
  gtag('event', 'purchase', {
    transaction_id: orderData.orderId,
    currency: 'GBP',
    value: orderData.totalValue,
    event_title: orderData.eventTitle,
    event_date: orderData.eventDate,
    ticket_count: orderData.ticketCount,
    payment_method: orderData.paymentMethod,
    customer_type: 'registered'
  });
};

// User Journey Events
export const trackSignUp = (method: string = 'email') => {
  gtag('event', 'sign_up', {
    method: method,
    user_type: 'customer'
  });
};

export const trackLogin = (userType: 'customer' | 'admin' = 'customer') => {
  gtag('event', 'login', {
    method: 'email',
    user_type: userType
  });
};

// Event Discovery
export const trackEventView = (eventData: {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  venue: string;
  ticketTypes: number;
}) => {
  gtag('event', 'event_view', {
    event_title: eventData.eventTitle,
    event_date: eventData.eventDate,
    venue: eventData.venue,
    ticket_types_available: eventData.ticketTypes,
    page_location: window.location.href
  });
};

// Ticket Management
export const trackTicketDownload = (eventTitle: string, deliveryMethod: string = 'email') => {
  gtag('event', 'ticket_download', {
    event_title: eventTitle,
    delivery_method: deliveryMethod
  });
};

export const trackTicketScan = (eventTitle: string, scanLocation: string = 'entrance') => {
  gtag('event', 'ticket_scan', {
    event_title: eventTitle,
    scan_location: scanLocation
  });
};

// Admin Events
export const trackAdminAction = (actionData: {
  actionType: string;
  resource: string;
  resourceId?: string;
  resourceTitle?: string;
  count?: number;
}) => {
  gtag('event', 'admin_action', {
    action_type: actionData.actionType,
    resource: actionData.resource,
    resource_id: actionData.resourceId,
    resource_title: actionData.resourceTitle,
    resource_count: actionData.count || 1
  });
};

export const trackReportExport = (reportType: string, format: string, eventCount?: number) => {
  gtag('event', 'report_export', {
    report_type: reportType,
    export_format: format,
    event_count: eventCount
  });
};

// Error Tracking
export const trackError = (errorType: string, errorMessage: string, context?: string) => {
  gtag('event', 'exception', {
    description: `${errorType}: ${errorMessage}`,
    fatal: false,
    context: context
  });
};

// Page Views (automatic with GTM, but can be enhanced)
export const trackPageView = (pagePath: string, pageTitle?: string) => {
  gtag('event', 'page_view', {
    page_path: pagePath,
    page_title: pageTitle || document.title,
    page_location: window.location.href
  });
};
