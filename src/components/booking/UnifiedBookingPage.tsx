import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectEventSelected, setEvent } from '../../store/reducers/eventSelectionReducer';
import { selectOrder, setTickets } from '../../store/reducers/orderReducer';
import { selectPersonalInformation, setFirstName, setLastName, setEmail, setAddressAddress, setZip, setCity } from '../../store/reducers/personalInformationReducer';
import { selectPayment, setPayment } from '../../store/reducers/paymentReducer';
import { setCurrency } from '../../store/reducers/paymentReducer';
import { TicketSelection } from './TicketSelection';
import { PersonalDetails } from './PersonalDetails';
import { PaymentSection } from './PaymentSection';
import { linkifyParagraph, linkifyText } from '../../utils/linkify';
import { htmlToText } from 'html-to-text';
import DOMPurify from 'dompurify';

// StickySummary and BookingProgress removed - no longer needed
import Navbar from './Navbar';
import Footer from './Footer';

interface BookingSection {
  id: string;
  title: string;
  description?: string;
  isComplete: boolean;
  isActive?: boolean;
  isValid?: boolean;
}

interface UnifiedBookingPageProps {
  event: any;
  ticketTypes: any[];
  paymentMethods: any[];
  deliveryMethods: any[];
  shippingFees: any;
  paymentFees: any;
  theme: any;
  impressUrl: string;
  claimSessionToken?: string | null;
}

export const UnifiedBookingPage: React.FC<UnifiedBookingPageProps> = ({
  event,
  ticketTypes,
  paymentMethods,
  deliveryMethods,
  shippingFees,
  paymentFees,
  theme,
  impressUrl,
  claimSessionToken
}) => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const selectedEvent = useAppSelector(selectEventSelected);
  const order = useAppSelector(selectOrder);
  const personalInfo = useAppSelector(selectPersonalInformation);
  const payment = useAppSelector(selectPayment);

  // Stable date formatting functions to prevent hydration errors
  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    
    // Use London timezone to match main website (not UTC)
    return new Intl.DateTimeFormat('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Europe/London'
    }).format(date);
  };

  const formatEventTime = (dateString: string) => {
    const date = new Date(dateString);
    
    // Use London timezone to match main website (not UTC)
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/London'
    }).format(date);
  };

  // Debug logging
  // Debug logging removed for production

  const [activeSection, setActiveSection] = useState('tickets');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['tickets']));
  const [collapsePreviousOnAdvance, setCollapsePreviousOnAdvance] = useState(true);
  const [discountInfo, setDiscountInfo] = useState<any>(null);
  
  // Calculate if this is a free event
  const totalPrice = order.tickets.reduce((sum, ticket) => sum + (ticket.price * ticket.amount), 0);
  const isFreeEvent = totalPrice === 0;
  
  // Always start with payment section to prevent hydration mismatch
  // We'll hide it dynamically for free events
  const [sections, setSections] = useState<BookingSection[]>([
    { id: 'tickets', title: 'Select Tickets', description: 'Choose your event tickets', isComplete: false, isValid: false },
    { id: 'personal', title: 'Personal Details', description: 'Enter your contact information', isComplete: false, isValid: false },
    { id: 'payment', title: 'Payment', description: '', isComplete: false, isValid: false }
  ]);
  const [errors, setErrors] = useState<string[]>([]);
  const [sessionTimeout, setSessionTimeout] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [freeEventLoading, setFreeEventLoading] = useState(false);

  // Session timeout check (30 minutes)
  useEffect(() => {
    const timeout = setTimeout(() => {
      setSessionTimeout(true);
      // Redirect to step 1
      setActiveSection('tickets');
      setExpandedSections(new Set(['tickets']));
      setErrors(['Your booking timed out. Please start again.']);
    }, 30 * 60 * 1000); // 30 minutes

    return () => clearTimeout(timeout);
  }, []);

  // Reset session timeout on user activity
  useEffect(() => {
    const resetTimeout = () => {
      setSessionTimeout(false);
      setErrors([]);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => document.addEventListener(event, resetTimeout));

    return () => {
      events.forEach(event => document.removeEventListener(event, resetTimeout));
    };
  }, []);

  // Toggle description expansion
  const toggleDescription = () => {
    setDescriptionExpanded(!descriptionExpanded);
  };

  // Handle free event registration
  const handleFreeEventRegistration = async () => {
    // Prevent double submissions
    if (freeEventLoading) return;
    
    setFreeEventLoading(true);
    
    try {
      console.log('🆓 Processing free event registration...');
      
      const registrationData = {
        tickets: order.tickets.map(ticket => ({
          ticketTypeId: ticket.ticketTypeId,
          amount: ticket.amount,
          price: ticket.price,
          name: (ticket as any).ticketTypeName || (ticket as any).name || `Ticket ${ticket.ticketTypeId}`
        })),
        eventDateId: event.dates[0].id,
        eventName: event.title,
        eventDate: new Date().toISOString(),
        customerEmail: personalInfo.email,
        customerData: {
          firstName: personalInfo.address?.firstName || '',
          lastName: personalInfo.address?.lastName || '',
          phone: personalInfo.phone || '',
          address: personalInfo.address?.address || '',
          zip: personalInfo.address?.zip || '',
          city: personalInfo.address?.city || '',
          countryCode: personalInfo.address?.country?.countryShortCode || 'GB',
          regionCode: personalInfo.address?.region?.shortCode || '',
          customFields: personalInfo.customFields || {}
        }
      };

      const response = await fetch('/api/free-event/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registrationData),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Free event registration successful:', result);
        
        // Track free event registration
        if (typeof window !== 'undefined') {
          import('../../lib/analytics').then(({ trackPurchase }) => {
            trackPurchase({
              orderId: result.orderId,
              eventId: event.id.toString(),
              eventTitle: event.title,
              eventDate: new Date().toISOString(),
              totalValue: 0,
              ticketCount: result.tickets,
              paymentMethod: 'free',
              customerEmail: personalInfo.email
            });
          }).catch(console.warn);
        }
        
        // Redirect to success page
        window.location.href = `/confirmation?orderId=${result.orderId}&free=true`;
      } else {
        const errorData = await response.json();
        console.error('❌ Free event registration failed:', errorData);
        setErrors([errorData.error || 'Registration failed']);
        setFreeEventLoading(false);
      }
    } catch (error) {
      console.error('❌ Free event registration error:', error);
      setErrors(['Failed to process registration']);
      setFreeEventLoading(false);
    }
  };



  // Set event in store when component mounts
  useEffect(() => {
    if (event && !selectedEvent) {
      dispatch(setEvent(event));
    }
  }, [event, selectedEvent, dispatch]);

  // Filter sections for free events (after hydration to prevent mismatch)
  useEffect(() => {
    if (isFreeEvent) {
      setSections(current => current.filter(section => section.id !== 'payment'));
    } else {
      // Ensure payment section exists for paid events
      setSections(current => {
        const hasPaymentSection = current.some(section => section.id === 'payment');
        if (!hasPaymentSection) {
          return [...current, { id: 'payment', title: 'Payment', description: '', isComplete: false, isValid: false }];
        }
        return current;
      });
    }
  }, [isFreeEvent]);

  // Update section validation and completion status
  useEffect(() => {
    const updatedSections = sections.map(section => {
      let isValid = false;
      let isComplete = false;
      
      switch (section.id) {
        case 'tickets':
          isValid = order.tickets.length > 0;
          isComplete = order.tickets.length > 0;
          break;
        case 'personal':
          isValid = !!(personalInfo.email && personalInfo.address?.firstName && personalInfo.address?.lastName);
          isComplete = !!(personalInfo.email && personalInfo.address?.firstName && personalInfo.address?.lastName);
          
          // Personal section validation (no logging to prevent spam)
          break;
        case 'payment':
          // Check if payment method is selected and terms are accepted
          // Note: We can't directly check terms acceptance from here, so we'll rely on the PaymentSection's internal validation
          isValid = !!(payment.payment?.type);
          isComplete = !!(payment.payment?.type);
          break;

      }
      
      return { ...section, isValid, isComplete };
    });
    
    setSections(updatedSections);
  }, [order.tickets, personalInfo, payment.payment?.type]); // ESLint warning about 'sections' is acceptable to prevent infinite loop

  // Validate tickets before allowing progression
  const validateTickets = useCallback(() => {
    if (order.tickets.length === 0) {
      setErrors(['Please select at least 1 ticket.']);
      return false;
    }
    setErrors([]);
    return true;
  }, [order.tickets]);

  const canNavigateToSection = useCallback((sectionId: string) => {
    const sectionIndex = sections.findIndex(s => s.id === sectionId);
    const activeIndex = sections.findIndex(s => s.id === activeSection);
    
    // Can navigate to current section or any previous section
    if (sectionIndex <= activeIndex) return true;
    
    // Can navigate to next section only if current is complete
    if (sectionIndex === activeIndex + 1) {
      return sections[activeIndex]?.isComplete;
    }
    
    // Can navigate to future sections only if all previous are complete
    return sections.slice(0, sectionIndex).every(s => s.isComplete);
  }, [sections, activeSection]);

  const goNextSection = useCallback(() => {
    const currentIndex = sections.findIndex(s => s.id === activeSection);
    
    if (currentIndex < sections.length - 1) {
      const nextSection = sections[currentIndex + 1];
      
      // Validate current section before proceeding
      if (activeSection === 'tickets' && !validateTickets()) {
        return;
      }
      
      // Allow progression if current section is valid (not next section)
      const currentSection = sections.find(s => s.id === activeSection);
      
      if (currentSection?.isValid) {
        console.log(`✅ Progressing from ${activeSection} to ${nextSection.id}`);
        setActiveSection(nextSection.id);
        setExpandedSections(prev => new Set([...Array.from(prev), nextSection.id]));
        
        // Scroll to the new section
        const nextSectionElement = document.getElementById(`section-${nextSection.id}`);
        if (nextSectionElement) {
          nextSectionElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        
        // Optionally collapse previous section after a delay
        if (collapsePreviousOnAdvance) {
          setTimeout(() => {
            setExpandedSections(prev => {
              const newSet = new Set(Array.from(prev));
              newSet.delete(activeSection);
              return newSet;
            });
          }, 250);
        }
      } else {
        console.log(`❌ Cannot progress from ${activeSection}: section not valid`);
      }
    }
  }, [activeSection, sections, collapsePreviousOnAdvance, validateTickets]);

  const goToSection = useCallback((sectionId: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (section && canNavigateToSection(sectionId)) {
      setActiveSection(sectionId);
      setExpandedSections(prev => new Set([...Array.from(prev), sectionId]));
      
      // Scroll to the section
      const sectionElement = document.getElementById(`section-${sectionId}`);
      if (sectionElement) {
        sectionElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [sections, canNavigateToSection]);

  const toggleSectionExpansion = useCallback((sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
        setActiveSection(sectionId);
      }
      return newSet;
    });
  }, []);

  const computeTotals = useCallback(() => {
    const subtotal = order.tickets.reduce((total, ticket) => {
      const ticketType = ticketTypes.find(t => t.id === ticket.ticketTypeId);
      const price = ticketType?.price || 0;
      return total + (price * ticket.amount);
    }, 0);
    
    const fees = 0; // Add any additional fees here
    const total = subtotal + fees;
    
    return { subtotal, fees, total };
  }, [order.tickets, ticketTypes]);

  if (!event) {
    return <div>Loading...</div>;
  }

  return (
    <div className="bg-neutral-50">
      
      {/* Error Banner */}
      {(errors.length > 0 || sessionTimeout) && (
        <div className="bg-red-50 border-b border-red-200 sticky top-16 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  {sessionTimeout ? (
                    <p className="text-red-800 font-medium">Your booking timed out.</p>
                  ) : (
                    <div className="space-y-1">
                      {errors.map((error, index) => (
                        <p key={index} className="text-red-800 text-sm">{error}</p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  setErrors([]);
                  setSessionTimeout(false);
                }}
                className="text-red-600 hover:text-red-800"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Event Header */}
      <div className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-start">
            {/* Event Hero Image - Optimized for 800x600 (4:3 ratio) */}
            <div className="md:col-span-2 flex justify-center md:justify-start">
              <div className="w-full max-w-[480px] rounded-lg shadow-lg overflow-hidden bg-white border border-gray-100" style={{ aspectRatio: '4/3' }}>
                {event.coverImage ? (
                  <Image 
                    src={event.coverImage} 
                    alt={event.name}
                    width={800}
                    height={600}
                    className="w-full h-full object-cover"
                    sizes="(max-width: 768px) 100vw, 480px"
                    priority
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                    <svg className="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
            </div>
            
            {/* Event Details - Better alignment and spacing */}
            <div className="md:col-span-3 space-y-6 flex flex-col justify-start">
              <h1 className="text-2xl md:text-3xl font-bold text-neutral-900">{event.name}</h1>
              
              <div className="space-y-5">
                {/* Date & Time Card */}
                <div className="bg-green-50 p-4 rounded-lg border border-green-100 shadow-sm">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-neutral-900">
                        {event.date ? formatEventDate(event.date) : 'Date TBA'}
                      </p>
                      {event.date && (
                        <p className="text-sm text-neutral-600 mt-1">
                          {formatEventTime(event.date)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Venue Card */}
                {event.venue && (
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 shadow-sm">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-lg font-semibold text-neutral-900">{event.venue.name}</p>
                        {event.venue.address && (
                          <p className="text-sm text-neutral-600 mt-1">{event.venue.address}, {event.venue.city} {event.venue.postcode}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Event Description Card - Enhanced */}
                {event.description && (() => {
                  // Safely render HTML content while preserving links for ticket purchase UI
                  const getSafeHTML = (htmlContent: string) => {
                    if (typeof window === 'undefined') {
                      // Server-side: convert to plain text
                      return htmlToText(htmlContent, {
                        wordwrap: false,
                        selectors: [{ selector: 'a', options: { ignoreHref: true } }],
                      });
                    }
                    
                    // Client-side: sanitize HTML but preserve links
                    const cleanHTML = DOMPurify.sanitize(htmlContent, {
                      ALLOWED_TAGS: ['a', 'strong', 'em', 'b', 'i', 'p', 'br'],
                      ALLOWED_ATTR: ['href', 'target', 'rel'],
                      ADD_ATTR: ['target', 'rel'] // Ensure external links open in new tab
                    });
                    
                    // Add target="_blank" and rel="noopener noreferrer" to all links
                    return cleanHTML.replace(/<a /g, '<a target="_blank" rel="noopener noreferrer" ');
                  };

                  const isClientSide = typeof window !== 'undefined';
                  const content = getSafeHTML(event.description);
                  const plainTextForLength = htmlToText(event.description, {
                    wordwrap: false,
                    selectors: [{ selector: 'a', options: { ignoreHref: true } }],
                  });
                  
                  return (
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 shadow-sm">
                      <div className="flex items-start space-x-4">
                        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="text-lg font-semibold text-neutral-900 mb-3">About This Event</p>
                          <div className="text-sm leading-relaxed text-gray-800 [&_a]:text-purple-600 [&_a]:underline [&_a:hover]:text-purple-800 [&_strong]:text-gray-900 [&_em]:text-gray-700 [&_b]:font-semibold [&_i]:italic">
                            {!descriptionExpanded ? (
                              <div className="line-clamp-3">
                                {isClientSide ? (
                                  <div dangerouslySetInnerHTML={{ __html: content }} />
                                ) : (
                                  <p className="whitespace-pre-line">{content}</p>
                                )}
                              </div>
                            ) : (
                              <div>
                                {isClientSide ? (
                                  <div dangerouslySetInnerHTML={{ __html: content }} />
                                ) : (
                                  <p className="whitespace-pre-line">{content}</p>
                                )}
                              </div>
                            )}
                          </div>
                          {plainTextForLength.length > 150 && (
                            <button 
                              onClick={toggleDescription}
                              className="text-purple-700 text-sm mt-3 hover:underline focus:outline-none font-medium"
                            >
                              {descriptionExpanded ? 'Show Less' : 'Read More'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Global Progress Indicator */}
      <div className="bg-white border-b border-neutral-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-8">
              {sections.map((section, index) => (
                <div key={section.id} className="flex items-center">
                  <div className="flex items-center space-x-3">
                    <div 
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200 ${
                        section.isComplete
                          ? 'bg-green-500 text-white'
                          : section.id === activeSection
                          ? 'bg-primary-500 text-white'
                          : 'bg-neutral-200 text-neutral-600'
                      }`}
                    >
                      {section.isComplete ? '✓' : index + 1}
                    </div>
                    <div className="hidden sm:block">
                      <p className={`text-sm font-medium ${
                        section.id === activeSection
                          ? 'text-primary-600'
                          : section.isComplete
                          ? 'text-green-600'
                          : 'text-neutral-500'
                      }`}>
                        {section.title}
                      </p>
                    </div>
                  </div>
                  {index < sections.length - 1 && (
                    <div className={`w-16 h-0.5 mx-4 ${
                      section.isComplete ? 'bg-green-300' : 'bg-neutral-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-16">
        <div className="space-y-8">
          {/* Main Content */}
          <div className="space-y-8">
            {/* Tickets Section */}
            {expandedSections.has('tickets') ? (
              <div id="section-tickets" className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6" role="region" aria-labelledby="tickets-header">
                <div className="flex items-center justify-between mb-6">
                  <div>
                                      <div>
                    <p className="uppercase text-xs tracking-wide text-gray-400 mb-1">Step 1 of 3</p>
                    <h2 id="tickets-header" className="text-2xl font-bold text-neutral-900">Select Tickets</h2>
                    <p className="text-sm text-gray-500 mt-1">Choose your event tickets</p>
                  </div>
                  </div>
                  <button
                    onClick={() => toggleSectionExpansion('tickets')}
                    className="text-neutral-500 hover:text-neutral-700"
                    aria-expanded="true"
                    aria-controls="section-tickets"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <TicketSelection
                  event={event}
                  ticketTypes={ticketTypes}
                  isActive={activeSection === 'tickets'}
                  onComplete={goNextSection}
                />
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      sections.find(s => s.id === 'tickets')?.isComplete 
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {sections.find(s => s.id === 'tickets')?.isComplete ? '✓' : '1'}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-neutral-900">Select Tickets</h3>
                      <p className="text-sm text-neutral-600">
                        {sections.find(s => s.id === 'tickets')?.isComplete 
                          ? `${order.tickets.length} ticket(s) selected` 
                          : 'Choose your event tickets'
                        }
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleSectionExpansion('tickets')}
                    className="text-neutral-500 hover:text-neutral-700 flex items-center space-x-2"
                    aria-expanded="false"
                    aria-controls="section-tickets"
                  >
                    <span>Edit</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Personal Details Section */}
            {expandedSections.has('personal') ? (
              <div id="section-personal" className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6" role="region" aria-labelledby="personal-header">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 id="personal-header" className="text-2xl font-semibold text-neutral-900">Step 2 of {isFreeEvent ? '2' : '3'}: Your Details</h2>
                    <p className="text-neutral-600 mt-1">Enter your contact information</p>
                  </div>
                  <button
                    onClick={() => toggleSectionExpansion('personal')}
                    className="text-neutral-500 hover:text-neutral-700"
                    aria-expanded="true"
                    aria-controls="section-personal"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <PersonalDetails
                  isActive={activeSection === 'personal'}
                  onComplete={isFreeEvent ? handleFreeEventRegistration : goNextSection}
                  isLoading={isFreeEvent ? freeEventLoading : false}
                  event={event}
                />
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      sections.find(s => s.id === 'personal')?.isComplete 
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {sections.find(s => s.id === 'personal')?.isComplete ? '✓' : '2'}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-neutral-900">Personal Details</h3>
                      <p className="text-sm text-neutral-600">
                        {sections.find(s => s.id === 'personal')?.isComplete 
                          ? 'Contact information provided' 
                          : 'Enter your contact information'
                        }
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleSectionExpansion('personal')}
                    className="text-neutral-500 hover:text-neutral-700 flex items-center space-x-2"
                    aria-expanded="false"
                    aria-controls="section-personal"
                  >
                    <span>Edit</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Payment Section - Only show for paid events */}
            {!isFreeEvent && expandedSections.has('payment') && (
              <div id="section-payment" className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6" role="region" aria-labelledby="payment-header">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 id="payment-header" className="text-2xl font-semibold text-neutral-900">Step 3 of 3: Payment</h2>
                  </div>
                  <button
                    onClick={() => toggleSectionExpansion('payment')}
                    className="text-neutral-500 hover:text-neutral-700"
                    aria-expanded="true"
                    aria-controls="section-payment"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <PaymentSection
                  isActive={activeSection === 'payment'}
                  onComplete={goNextSection}
                  paymentMethods={paymentMethods}
                  deliveryMethods={deliveryMethods}
                  shippingFees={shippingFees}
                  paymentFees={paymentFees}
                  eventDateId={event?.id || selectedEvent}
                  eventName={event?.name || event?.title}
                  eventDate={event?.date}
                  onDiscountChange={setDiscountInfo}
                  claimSessionToken={claimSessionToken}
                />
                {/* Debug info */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="mt-4 p-4 bg-gray-100 rounded text-xs">
                    <p>Debug: event.id (EventDate ID) = {event?.id}, selectedEvent = {selectedEvent}</p>
                    <p>Final eventDateId = {event?.id || selectedEvent}</p>
                    <p>Note: This is EventDate ID, not Event ID</p>
                  </div>
                )}
              </div>
            )}
            
            {/* Payment Section Collapsed - Only show for paid events */}
            {!isFreeEvent && !expandedSections.has('payment') && (
              <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      sections.find(s => s.id === 'payment')?.isComplete 
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {sections.find(s => s.id === 'payment')?.isComplete ? '✓' : '3'}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-neutral-900">Payment</h3>
                      <p className="text-sm text-neutral-600">
                        {sections.find(s => s.id === 'payment')?.isComplete 
                          ? 'Payment method selected' 
                          : 'Select payment method'
                        }
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleSectionExpansion('payment')}
                    className="text-neutral-500 hover:text-neutral-700 flex items-center space-x-2"
                    aria-expanded="false"
                    aria-controls="section-payment"
                  >
                    <span>Edit</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                </div>
              </div>
            )}


          </div>
        </div>
      </main>
      
      {/* Sticky Summary Removed - Right Panel Eliminated */}
    </div>
  );
};
