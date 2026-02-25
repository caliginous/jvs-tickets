# 🎫 JVS Tessera - Event Ticketing System

<div align="center">
  <h3>Jewish Vegetarian Society Event Ticketing Platform</h3>
  <p>
    <a href="LICENSE" target="_blank">
      <img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge" />
    </a>
    <img alt="Next.js" src="https://img.shields.io/badge/Next.js-13+-black?style=for-the-badge&logo=next.js" />
    <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.0+-blue?style=for-the-badge&logo=typescript" />
    <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS-3.0+-06B6D4?style=for-the-badge&logo=tailwindcss" />
    <img alt="Production Ready" src="https://img.shields.io/badge/Status-Production_Ready-success?style=for-the-badge" />
  </p>
</div>

> **Modern, feature-rich event ticketing system** built specifically for the Jewish Vegetarian Society. Comprehensive admin dashboard, real-time availability tracking, email management, and seamless Stripe integration.

## 🌟 **Production Deployment**

- **🌐 Live Site**: [tickets.jvs.org.uk](https://tickets.jvs.org.uk)
- **📊 Admin Panel**: [tickets.jvs.org.uk/admin](https://tickets.jvs.org.uk/admin)
- **🔧 Status**: Production Ready & Actively Used

## ⚡️ **Quick Start**

### 🚀 **JVS Development Setup**

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env
# Edit .env with your database and API keys

# 3. Database setup
npx prisma generate
npx prisma migrate dev

# 4. Seed with realistic data (recommended for development)
npm run seed:comprehensive

# 5. Start development server
npm run dev
```

### 🔑 **Default Admin Credentials** (Development)
- **Email**: `admin@jvs.org.uk`
- **Password**: `admin123`

*Change these immediately in production!*

## 🎯 **Key Features**

### 🎭 **Event Management**
- ✅ **Modern Event Creation** with venues, descriptions, and custom messages
- ✅ **SEO-Friendly URLs** with automatic slug generation
- ✅ **Multiple Ticket Types** per event with individual pricing
- ✅ **Capacity Management** with real-time availability tracking
- ✅ **Event Images** with automatic optimization
- ✅ **Venue Association** with full venue management system

### 🎫 **Ticketing System**
- ✅ **EventTicketType System** - Modern per-event ticket types
- ✅ **Legacy Category Support** - Backward compatibility maintained
- ✅ **Real-time Availability** - Prevent overselling with atomic operations
- ✅ **Discount Codes** - Percentage and fixed amount discounts
- ✅ **Seat Maps** - Interactive seating for assigned events
- ✅ **QR Code Tickets** - Digital ticket generation and scanning

### 💳 **Payment & Orders**
- ✅ **Stripe Integration** - Secure credit card and IBAN payments
- ✅ **Multiple Payment Methods** - Stripe, PayPal, Invoice, POS
- ✅ **Refund Management** - Full and partial refunds through admin
- ✅ **Order Tracking** - Comprehensive order management
- ✅ **Webhook Processing** - Automated payment confirmation

### 📧 **Email Management**
- ✅ **Template System** - HTML email templates with token replacement
- ✅ **Multi-language Support** - English, German, Hebrew
- ✅ **SMTP & Provider Support** - SendGrid, Mailgun, custom SMTP
- ✅ **Email Logging** - Track all sent emails with delivery status
- ✅ **Bespoke Messages** - Event-specific custom messages in emails

### 👥 **Administration**
- ✅ **Granular Permissions** - Role-based access control
- ✅ **User Management** - Admin user creation and management
- ✅ **Venue Management** - Create and manage event venues
- ✅ **Reports & Analytics** - Event performance and sales reports
- ✅ **Order Management** - View, edit, refund, and cancel orders
- ✅ **Localization** - Multi-language string management

### 🔌 **Public API**
- ✅ **Events API** - Public endpoint for third-party integrations
- ✅ **Real-time Availability** - Live ticket counts and availability
- ✅ **No Authentication Required** - Easy integration for external sites
- ✅ **Rate Limiting** - Built-in protection against abuse

## 🏗️ **Modern Tech Stack**

### **Frontend**
- **Next.js 13+** - React framework with App Router + Pages Router hybrid
- **TypeScript 5.0+** - Full type safety throughout the application
- **Tailwind CSS 3.0+** - Modern utility-first CSS framework
- **HeadlessUI** - Accessible, unstyled UI components
- **React Hook Form + Zod** - Type-safe form handling and validation
- **Framer Motion** - Smooth animations and transitions

### **Backend**
- **Next.js API Routes** - Serverless API endpoints
- **Prisma ORM** - Type-safe database access
- **PostgreSQL** - Robust relational database
- **Stripe API** - Payment processing
- **Nodemailer** - Email delivery system

### **Infrastructure**
- **Vercel** - Production hosting and deployment
- **Vercel Blob** - File storage for images
- **GitHub Actions** - CI/CD pipeline
- **ESLint + Prettier** - Code quality and formatting

## 📋 **Database Schema Overview**

### **Core Models**
- **Event** - Events with venues, descriptions, slugs, bespoke messages
- **EventTicketType** - Modern per-event ticket types with pricing
- **EventDate** - Specific event date instances
- **Venue** - Event locations with full address information
- **Order** - Customer orders with payment and refund tracking
- **Ticket** - Individual tickets with QR codes and validation

### **Admin & Management**
- **AdminUser** - Admin users with granular permissions
- **DiscountCode** - Discount codes with usage tracking
- **EmailTemplate** - HTML email templates with token system
- **EmailLog** - Email delivery tracking and logging

### **Legacy Support**
- **Category** - Legacy global ticket categories (deprecated)
- **CategoriesOnEvents** - Event-category relationships (legacy)

*See [Database Schema Documentation](DOCUMENTATION_ANALYSIS.md) for complete details.*

## 🔧 **Environment Configuration**

### **Required Environment Variables**
```bash
# Database
DATABASE_URL="postgresql://user:pass@host:port/database"

# Stripe (Payment Processing)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_..."
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Email Configuration
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT=587
EMAIL_USER="noreply@jvs.org.uk"
EMAIL_PASS="your-app-password"

# Application
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="https://tickets.jvs.org.uk"
```

### **Optional Configuration**
```bash
# Vercel Blob (Image Storage)
BLOB_READ_WRITE_TOKEN="vercel_blob_..."

# PayPal (Alternative Payment)
PAYPAL_CLIENT_ID="your-paypal-client-id"
PAYPAL_CLIENT_SECRET="your-paypal-secret"

# Development
NODE_ENV="development"
DEBUG="email:*"
```

## 📚 **Documentation**

### **Core Documentation**
- 📖 **[Setup Guide](scripts/JVS-QUICK-SETUP.md)** - Detailed setup instructions
- 🗄️ **[Database Seeding](scripts/SEEDING-README.md)** - Modern seeding system
- 📧 **[Email Management](EMAIL_MANAGEMENT_README.md)** - Email system guide
- 💳 **[Stripe Setup](STRIPE_SETUP.md)** - Payment integration guide
- 🔌 **[API Documentation](API_README.md)** - Public API reference

### **Development Documentation**
- 📋 **[Documentation Analysis](DOCUMENTATION_ANALYSIS.md)** - Complete documentation overview
- ✅ **[TODO Status](TODO.md)** - Current development status
- 🚀 **[What's Next](WHATS_NEXT.md)** - Development roadmap
- 📝 **[Email Triggers](EMAIL-TRIGGERS-SUMMARY.md)** - Email system implementation

### **Feature Documentation**
- 🎫 **[Event Ticket Types](EVENT_TICKET_TYPES_IMPLEMENTATION.md)** - Modern ticket system
- 📱 **[Unified Booking](UNIFIED_BOOKING_README.md)** - Booking system design

## 🚀 **Deployment**

### **Production Deployment**
```bash
# Deploy to production (Vercel)
npx vercel --prod

# Deploy with cache invalidation
npx vercel --prod --force
```

### **Environment Setup**
1. **Database**: Set up PostgreSQL instance (Neon, Railway, etc.)
2. **Stripe**: Configure webhook endpoint at `/api/webhook/stripe`
3. **Email**: Configure SMTP or email provider credentials
4. **Vercel**: Set up environment variables in Vercel dashboard

## 🛠️ **Development Commands**

### **Database**
```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# View database in browser
npx prisma studio

# Seed database with realistic data
npm run seed:comprehensive
```

### **Development**
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

### **Seeding Options**
```bash
# Complete database reset + comprehensive seed
npm run seed:comprehensive

# Modern seed only (preserve existing data)
npm run seed:modern

# Email templates only
npm run seed:emails-only
```

## 🔍 **Key Architectural Decisions**

### **MUI → Tailwind Migration** ✅ **Completed**
- Migrated from Material-UI to Tailwind CSS + HeadlessUI
- Custom UI component library in `/src/components/ui/`
- Improved performance and maintainability
- Consistent design system

### **EventTicketType System** ✅ **Implemented**
- Modern per-event ticket types replace global categories
- Better pricing control and inventory management
- Backward compatibility with legacy categories
- Real-time capacity tracking

### **Email Management System** ✅ **Implemented**
- Comprehensive email template management
- Token-based dynamic content replacement
- Multi-language support with fallbacks
- Email logging and delivery tracking

### **Modern Form Handling** ✅ **Implemented**
- React Hook Form + Zod validation
- Type-safe form handling throughout
- Better user experience and error handling
- Consistent validation patterns

## 🤝 **Contributing**

### **Development Workflow**
1. **Setup**: Follow the Quick Start guide above
2. **Branch**: Create feature branches from `main`
3. **Code**: Follow TypeScript and ESLint guidelines
4. **Test**: Ensure all functionality works correctly
5. **Deploy**: Use preview deployments for testing

### **Code Standards**
- **TypeScript**: Strict mode enabled, full type coverage
- **ESLint**: Enforced code style and best practices
- **Prettier**: Automated code formatting
- **Component Structure**: Consistent patterns throughout

## 📊 **Production Metrics**

### **Current Usage** (as of March 2025)
- 🎭 **37 Events** managed and published
- 🎫 **501 Orders** processed successfully
- 👥 **5 Admin Users** with full permissions
- 📧 **8 Email Templates** active and functional
- 🏢 **2 Venues** configured and in use

### **Performance**
- ⚡ **< 3s** Time to Interactive
- 📱 **100%** Mobile responsive
- ♿ **WCAG 2.1 AA** Accessibility compliant
- 🔒 **PCI DSS** Payment security compliant

## 🆘 **Support & Troubleshooting**

### **Common Issues**
- **Database Connection**: Check `DATABASE_URL` format
- **Stripe Webhooks**: Verify endpoint URL and secret
- **Email Delivery**: Confirm SMTP credentials
- **Build Errors**: Run `npx prisma generate`

### **Getting Help**
- 📧 **Email**: Contact the JVS development team
- 📖 **Documentation**: Check the documentation files above
- 🐛 **Issues**: Report bugs with detailed reproduction steps

## 📄 **License**

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🎉 **Acknowledgments**

Built on the foundation of [Tessera](https://github.com/mbpictures/tessera) by Marius Butz, extensively customized and enhanced for the Jewish Vegetarian Society's specific requirements.

**Customizations include**:
- Complete UI/UX redesign with JVS branding
- Modern EventTicketType system
- Comprehensive email management
- Advanced admin permissions
- Venue management system
- Modern seeding and development tools
- Production-ready deployment configuration

---

*Last Updated: March 2025 | Production Ready ✅*