# JVS Unified Ticket Booking System

## Overview

The JVS Unified Ticket Booking System consolidates the traditional 4-step booking process into a single, intuitive page with modern Tailwind CSS design and JVS branding. This system provides a seamless user experience while maintaining all the functionality of the original step-based approach.

## Features

### 🎯 **Single Page Architecture**
- **Unified Interface**: All booking steps consolidated into one page at `/booking/[eventId]`
- **Collapsible Sections**: Smooth expand/collapse animations for each booking step
- **Real-time Updates**: Live progress tracking and form validation
- **Auto-advance**: Intelligent progression through completed sections

### 🎨 **Modern Design System**
- **JVS Brand Colors**: Consistent with Jewish Vegan Society branding
- **Tailwind CSS**: Modern, responsive design with smooth animations
- **Mobile-First**: Optimized for all device sizes
- **Accessibility**: WCAG compliant with proper focus management

### 📱 **Enhanced User Experience**
- **Progress Indicator**: Visual progress bar with step-by-step navigation
- **Smart Validation**: Real-time form validation with inline feedback
- **Persistent State**: Form data saved during the booking session
- **Quick Navigation**: Jump between completed sections seamlessly

## Architecture

### Component Structure

```
UnifiedBookingPage (Main Container)
├── JVSHeader (Navigation & Branding)
├── BookingProgress (Progress Indicator)
├── Main Content Area
│   ├── TicketSelection (Collapsible)
│   ├── PersonalDetails (Collapsible)
│   ├── PaymentSection (Collapsible)
│   └── OrderSummary (Always Visible)
└── JVSFooter (Links & Contact)
```

### State Management

The system uses Redux for state management across all booking steps:

- **Event Selection**: Current event and available categories
- **Order Management**: Selected tickets and quantities
- **Personal Information**: Contact details and shipping preferences
- **Payment**: Payment method selection and terms acceptance

## Implementation Details

### File Structure

```
src/
├── components/booking/
│   ├── UnifiedBookingPage.tsx      # Main unified component
│   ├── BookingProgress.tsx         # Progress indicator
│   ├── TicketSelection.tsx         # Ticket selection interface
│   ├── PersonalDetails.tsx         # Contact form
│   ├── PaymentSection.tsx          # Payment setup
│   ├── OrderSummary.tsx            # Final review
│   ├── JVSHeader.tsx               # Header component
│   └── JVSFooter.tsx               # Footer component
├── pages/booking/
│   └── [eventId].tsx               # Booking page route
└── store/                          # Redux store configuration
```

### Key Components

#### UnifiedBookingPage
- **Main Container**: Orchestrates all booking sections
- **State Management**: Handles section expansion and navigation
- **Auto-advance Logic**: Intelligently progresses through completed steps
- **Form Data Consolidation**: Manages data across all sections

#### BookingProgress
- **Visual Progress**: Shows current step and completion status
- **Interactive Navigation**: Click to jump between completed sections
- **Responsive Design**: Adapts to mobile and desktop layouts
- **Step Descriptions**: Provides context for each booking phase

#### TicketSelection
- **Category Display**: Shows available ticket types with pricing
- **Quantity Controls**: +/- buttons for ticket selection
- **Real-time Validation**: Ensures ticket limits are respected
- **Auto-advance**: Proceeds when tickets are selected

#### PersonalDetails
- **Contact Form**: Email, name, and address fields
- **Form Validation**: Real-time validation with error messages
- **Auto-advance**: Proceeds when all required fields are completed
- **Responsive Layout**: Grid-based form for optimal mobile experience

#### PaymentSection
- **Payment Methods**: Visual selection of available payment options
- **Order Summary**: Real-time calculation of total with fees
- **Terms Acceptance**: GTC and privacy policy checkboxes
- **Auto-advance**: Proceeds when payment is configured

#### OrderSummary
- **Complete Overview**: All booking information in one place
- **Checkout Button**: Prominent call-to-action for completion
- **Security Notice**: Reassurance about payment security
- **Validation**: Ensures all previous steps are completed

## Usage

### Basic Implementation

```tsx
import { UnifiedBookingPage } from '../components/booking/UnifiedBookingPage';

export default function BookingPage({ event, categories, paymentMethods }) {
  return (
    <UnifiedBookingPage
      event={event}
      categories={categories}
      paymentMethods={paymentMethods}
      deliveryMethods={deliveryMethods}
      shippingFees={shippingFees}
      paymentFees={paymentFees}
      theme={theme}
      impressUrl={impressUrl}
    />
  );
}
```

### Props Interface

```tsx
interface UnifiedBookingPageProps {
  event: Event;                    // Event details
  categories: Category[];          // Available ticket categories
  paymentMethods: PaymentMethod[]; // Available payment methods
  deliveryMethods: string[];       // Shipping options
  shippingFees: any;              // Shipping fee configuration
  paymentFees: any;               // Payment fee configuration
  theme: any;                     // Theme configuration
  impressUrl?: string;            // Legal information URL
}
```

## Styling

### JVS Color Palette

The system uses a custom JVS color palette defined in `tailwind.config.js`:

```javascript
colors: {
  'jvs': {
    50: '#f0f9ff',   // Light blue background
    100: '#e0f2fe',  // Light blue borders
    500: '#0ea5e9',  // Primary blue
    600: '#0284c7',  // Darker blue
    700: '#0369a1',  // Even darker blue
    900: '#0c4a6e',  // Darkest blue
  }
}
```

### Animation Classes

Custom animations are defined for smooth transitions:

```css
.animate-fade-in    /* Fade in effect */
.animate-slide-up   /* Slide up from bottom */
.animate-slide-down /* Slide down from top */
```

## Responsive Design

### Mobile-First Approach

- **Touch-Friendly**: Optimized button sizes and spacing
- **Progressive Enhancement**: Enhanced features on larger screens
- **Adaptive Layout**: Grid systems that adapt to screen size
- **Mobile Navigation**: Simplified progress indicator for small screens

### Breakpoints

- **Mobile**: < 768px (md:)
- **Tablet**: 768px - 1024px (lg:)
- **Desktop**: > 1024px (xl:)

## Testing

### Test Coverage

The system includes comprehensive tests for:

- Component rendering
- User interactions
- State management
- Form validation
- Responsive behavior

### Running Tests

```bash
npm test                    # Run all tests
npm test -- --watch        # Watch mode
npm test -- --coverage     # Coverage report
```

## Migration from Old System

### Benefits

1. **Improved UX**: Single page reduces friction
2. **Better Performance**: Fewer page loads and re-renders
3. **Easier Maintenance**: Centralized booking logic
4. **Enhanced Analytics**: Better tracking of user behavior

### Backward Compatibility

- All existing Redux state is preserved
- API endpoints remain unchanged
- Existing components can still be used independently
- Gradual migration path available

## Future Enhancements

### Planned Features

- **Save Progress**: Resume booking from where you left off
- **Guest Checkout**: Streamlined process for new users
- **Multi-language Support**: Internationalization support
- **Advanced Analytics**: Detailed user journey tracking
- **A/B Testing**: Optimize conversion rates

### Technical Improvements

- **Performance Optimization**: Lazy loading and code splitting
- **PWA Support**: Offline capabilities and app-like experience
- **Accessibility**: Enhanced screen reader support
- **SEO Optimization**: Better search engine visibility

## Support

### Documentation

- **Component API**: Detailed prop documentation
- **Styling Guide**: Design system and component library
- **Best Practices**: Implementation recommendations
- **Troubleshooting**: Common issues and solutions

### Development

- **Code Standards**: ESLint and Prettier configuration
- **Git Workflow**: Branch naming and commit conventions
- **Review Process**: Code review guidelines
- **Deployment**: CI/CD pipeline configuration

---

**Version**: 1.0.0  
**Last Updated**: December 2024  
**Maintainer**: JVS Development Team
