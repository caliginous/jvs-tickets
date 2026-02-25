# 👋 JVS Tessera - Developer Onboarding Guide

## Welcome to the JVS Tessera Development Team! 🎉

This guide will take you from zero to productive contributor in **under 30 minutes**. By the end, you'll have a fully functional development environment and understand how to contribute effectively to the JVS ticketing system.

---

## 🎯 **What You'll Accomplish**

By following this guide, you'll:
- ✅ Set up a complete development environment
- ✅ Understand the system architecture and tech stack
- ✅ Know how to navigate the codebase effectively
- ✅ Be able to run, test, and deploy changes
- ✅ Understand the development workflow and best practices

---

## 📋 **Prerequisites**

### **Required Software**
- **Node.js 18+** - [Download here](https://nodejs.org/)
- **Git** - [Download here](https://git-scm.com/)
- **VS Code** (recommended) - [Download here](https://code.visualstudio.com/)
- **Database Tool** - [TablePlus](https://tableplus.com/) or [DBeaver](https://dbeaver.io/) (optional)

### **Required Accounts**
- **GitHub Account** - For code access
- **Vercel Account** - For deployments (ask team for access)
- **Stripe Account** - For payment testing (ask team for test keys)

### **Recommended VS Code Extensions**
```bash
# Install these extensions for the best development experience:
- ES7+ React/Redux/React-Native snippets
- TypeScript Importer
- Tailwind CSS IntelliSense
- Prisma
- GitLens
- Auto Rename Tag
- Bracket Pair Colorizer
- Error Lens
```

---

## 🚀 **Step 1: Environment Setup** (5 minutes)

### **1.1 Clone the Repository**
```bash
# Clone the main repository
git clone https://github.com/your-org/JewishVeganV2.git
cd JewishVeganV2/tessera-main

# Install dependencies
npm install
```

### **1.2 Environment Configuration**
```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your settings
code .env
```

### **1.3 Required Environment Variables**
Add these to your `.env` file:

```bash
# Database (ask team for development database URL)
DATABASE_URL="postgresql://user:pass@localhost:5432/tessera_dev"

# Stripe (ask team for test keys)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# NextAuth (generate a random secret)
NEXTAUTH_SECRET="your-random-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# Email (optional for development)
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT=587
EMAIL_USER="your-email@gmail.com"
EMAIL_PASS="your-app-password"

# Application URLs
APP_BASE_URL="http://localhost:3000"
```

### **1.4 Database Setup**
```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Seed with realistic development data
npm run seed:comprehensive
```

### **1.5 Start Development Server**
```bash
# Start the development server
npm run dev

# Open your browser to http://localhost:3000
# Admin panel: http://localhost:3000/admin
```

### **🔑 Default Admin Credentials**
- **Email**: `admin@jvs.org.uk`
- **Password**: `admin123`

---

## 🏗️ **Step 2: System Architecture Understanding** (10 minutes)

### **2.1 Tech Stack Overview**
```
Frontend:
├── Next.js 13+ (App Router + Pages Router hybrid)
├── React 18 + TypeScript 5
├── Tailwind CSS + HeadlessUI (replaced MUI)
├── React Hook Form + Zod (replaced Formik)
└── Redux Toolkit (state management)

Backend:
├── Next.js API Routes (serverless)
├── Prisma ORM + PostgreSQL
├── Stripe API (payments)
└── Nodemailer (email delivery)

Infrastructure:
├── Vercel (hosting & deployment)
├── Vercel Blob (file storage)
└── GitHub (version control)
```

### **2.2 Project Structure**
```
tessera-main/
├── 📁 src/
│   ├── 📁 components/          # React components
│   │   ├── 📁 admin/          # Admin-specific components
│   │   ├── 📁 booking/        # Public booking components
│   │   └── 📁 ui/             # Reusable UI components
│   ├── 📁 pages/              # Pages Router (API + legacy pages)
│   │   ├── 📁 api/            # API endpoints
│   │   └── 📁 admin/          # Admin pages
│   ├── 📁 app/                # App Router (modern pages)
│   ├── 📁 lib/                # Utilities and services
│   └── 📁 store/              # Redux store
├── 📁 prisma/                 # Database schema & migrations
├── 📁 scripts/                # Utility scripts
└── 📁 public/                 # Static assets
```

### **2.3 Key Architectural Decisions**
- **Hybrid Routing**: App Router for modern pages, Pages Router for APIs
- **Component Library**: Custom UI components built with Tailwind CSS
- **Type Safety**: Strict TypeScript throughout the application
- **Database**: Modern EventTicketType system with legacy category support
- **Authentication**: NextAuth.js with granular permissions

---

## 🧭 **Step 3: Codebase Navigation** (10 minutes)

### **3.1 Key Files to Understand**

#### **Database Schema**
```bash
# View the complete database schema
code prisma/schema.prisma

# Explore data with Prisma Studio
npx prisma studio
```

#### **Main Configuration Files**
```bash
# Next.js configuration
code next.config.js

# Tailwind CSS configuration  
code tailwind.config.js

# TypeScript configuration
code tsconfig.json

# Package dependencies
code package.json
```

#### **Core Components**
```bash
# Admin layout and navigation
code src/components/admin/layout/

# UI component library
code src/components/ui/

# Booking flow components
code src/components/booking/
```

#### **API Endpoints**
```bash
# Admin API endpoints
code src/pages/api/admin/

# Public API endpoints
code src/pages/api/public/

# Webhook handlers
code src/pages/api/webhook/
```

### **3.2 Understanding the Data Model**

#### **Core Entities**
- **Event** - Main event entity with venues, descriptions, slugs
- **EventTicketType** - Modern per-event ticket types (preferred)
- **Category** - Legacy global categories (deprecated but supported)
- **Order** - Customer orders with payment tracking
- **User** - Customer information
- **AdminUser** - Admin users with permissions
- **Venue** - Event locations

#### **Key Relationships**
```
Event → EventDate → Order → Ticket
Event → EventTicketType → OrderItem
Event → Venue
AdminUser → Permissions
Order → DiscountCode
```

### **3.3 Development Workflow**

#### **Making Changes**
1. **Create Feature Branch**: `git checkout -b feature/your-feature-name`
2. **Make Changes**: Edit code, following existing patterns
3. **Test Locally**: Ensure everything works in development
4. **Commit Changes**: `git commit -m "feat: description of changes"`
5. **Push Branch**: `git push origin feature/your-feature-name`
6. **Create PR**: Submit pull request for review

#### **Code Standards**
- **TypeScript**: Strict mode enabled, full type coverage required
- **ESLint**: Enforced code style, fix all warnings
- **Prettier**: Automatic formatting on save
- **Component Patterns**: Follow existing component structure
- **API Patterns**: Use existing API endpoint patterns

---

## 🧪 **Step 4: Testing Your Setup** (5 minutes)

### **4.1 Verify Development Environment**

#### **Frontend Tests**
```bash
# Test homepage loads
curl http://localhost:3000

# Test admin panel loads
open http://localhost:3000/admin

# Login with admin credentials and verify dashboard
```

#### **Database Tests**
```bash
# View seeded data
npx prisma studio

# Check that you have:
# - 6 sample events
# - 3 admin users  
# - 3 venues
# - 50 sample orders
# - 8 email templates
```

#### **API Tests**
```bash
# Test public events API
curl http://localhost:3000/api/public/events

# Should return JSON with event data and availability
```

### **4.2 Common Setup Issues**

#### **Database Connection Issues**
```bash
# If database connection fails:
1. Check DATABASE_URL in .env
2. Ensure PostgreSQL is running
3. Run: npx prisma migrate reset
4. Re-seed: npm run seed:comprehensive
```

#### **Missing Environment Variables**
```bash
# If you see "missing environment variable" errors:
1. Check .env file exists
2. Compare with .env.example
3. Ask team for missing values
4. Restart development server
```

#### **Build Errors**
```bash
# If TypeScript errors occur:
npx prisma generate  # Regenerate Prisma client
npm run lint         # Check for linting issues
npm run build        # Test production build
```

---

## 📚 **Step 5: Understanding Key Features** (10 minutes)

### **5.1 Event Management System**

#### **Modern EventTicketType System** (Preferred)
```typescript
// Each event has its own ticket types
EventTicketType {
  eventId: number
  name: string        // "Standard", "VIP", "Student"
  price: number      // In pence (1000 = £10.00)
  capacity?: number  // Optional limit
  sold: number       // Real-time counter
}
```

#### **Legacy Category System** (Deprecated)
```typescript
// Global categories shared across events
Category {
  label: string     // "Standard Entry"
  price: number     // In pounds (10.50)
  color: string     // Hex color
}
```

### **5.2 Admin Permission System**
```typescript
// Granular permissions for admin users
PermissionSection {
  EventManagement     // Create/edit events
  OrderManagement     // Process orders
  UserManagement      // Manage admin users
  EmailManagement     // Email templates
  VenueManagement     // Manage venues
  // ... and more
}
```

### **5.3 Email Template System**
```html
<!-- Token-based email templates -->
<p>Dear {{user.firstName}} {{user.lastName}},</p>
<p>Your booking for {{event.title}} is confirmed!</p>
<p>{{event.bespoke.message}}</p> <!-- Event-specific message -->
```

### **5.4 Payment Processing**
```typescript
// Stripe integration with webhook processing
1. Customer selects tickets
2. Stripe payment intent created
3. Payment processed securely
4. Webhook confirms payment
5. Order status updated
6. Confirmation email sent
```

---

## 🛠️ **Step 6: Development Commands** (Reference)

### **Database Commands**
```bash
# Generate Prisma client after schema changes
npx prisma generate

# Create new migration
npx prisma migrate dev --name migration-name

# Reset database (destructive!)
npx prisma migrate reset

# View data in browser
npx prisma studio

# Seed database with development data
npm run seed:comprehensive     # Full reset + comprehensive seed
npm run seed:modern           # Modern seed (preserve data)
npm run seed:emails-only      # Email templates only
```

### **Development Commands**
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server locally
npm start

# Run linting
npm run lint

# Fix linting issues
npm run lint --fix
```

### **Deployment Commands**
```bash
# Deploy to preview environment
npx vercel

# Deploy to production
npx vercel --prod

# Deploy with cache invalidation
npx vercel --prod --force
```

---

## 📖 **Step 7: Essential Documentation**

### **Core Documentation** (Read These First)
1. **[README.md](README.md)** - Project overview and quick start
2. **[ARCHITECTURE.md](ARCHITECTURE.md)** - System architecture deep dive
3. **[FEATURES.md](FEATURES.md)** - Complete feature documentation

### **Development Documentation**
4. **[ADMIN_GUIDE.md](ADMIN_GUIDE.md)** - Admin user manual
5. **[API_README.md](API_README.md)** - Public API reference
6. **[EMAIL_MANAGEMENT_README.md](EMAIL_MANAGEMENT_README.md)** - Email system
7. **[scripts/SEEDING-README.md](scripts/SEEDING-README.md)** - Database seeding

### **Specialized Documentation**
8. **[STRIPE_SETUP.md](STRIPE_SETUP.md)** - Payment integration
9. **[EVENT_TICKET_TYPES_IMPLEMENTATION.md](EVENT_TICKET_TYPES_IMPLEMENTATION.md)** - Modern ticket system
10. **[TODO.md](TODO.md)** - Current project status

---

## 🎯 **Step 8: Your First Contribution**

### **8.1 Good First Issues**
Start with these types of tasks:
- **Documentation Updates**: Fix typos, improve clarity
- **UI Improvements**: Small styling or UX enhancements  
- **Bug Fixes**: Fix minor issues in existing functionality
- **Test Coverage**: Add tests for existing features

### **8.2 Development Workflow**
1. **Pick an Issue**: Choose from GitHub issues or ask team
2. **Create Branch**: `git checkout -b fix/issue-description`
3. **Make Changes**: Follow existing code patterns
4. **Test Thoroughly**: Test in development environment
5. **Submit PR**: Include description of changes and testing done

### **8.3 Code Review Process**
- **All changes** require code review before merging
- **Tests required** for new features
- **Documentation updates** needed for new features
- **Performance impact** considered for all changes

---

## 🤝 **Getting Help**

### **Team Communication**
- **Questions**: Ask in team chat or create GitHub issue
- **Code Reviews**: Tag team members for review
- **Pair Programming**: Schedule sessions for complex features
- **Documentation**: Update docs when you learn something new

### **Common Questions**

#### **"How do I add a new admin page?"**
1. Create page in `src/pages/admin/`
2. Add to admin navigation in `src/components/admin/layout/`
3. Ensure proper permissions are checked
4. Follow existing admin page patterns

#### **"How do I add a new API endpoint?"**
1. Create file in `src/pages/api/`
2. Add authentication if needed
3. Use Prisma for database operations
4. Follow existing API patterns
5. Add to API documentation

#### **"How do I modify the database schema?"**
1. Edit `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name change-description`
3. Update TypeScript types if needed
4. Test with seeded data

#### **"How do I add a new email template?"**
1. Go to admin panel → Email → Templates
2. Create new template with tokens
3. Test with sample data
4. Update email trigger service if needed

### **Troubleshooting Resources**
- **[GitHub Issues](https://github.com/your-repo/issues)** - Known issues and solutions
- **[Documentation](DOCUMENTATION_ANALYSIS.md)** - Complete documentation index
- **Team Chat** - Real-time help from team members
- **Code Comments** - Inline documentation in complex areas

---

## 🎉 **Welcome to the Team!**

### **You're Now Ready To:**
- ✅ **Develop locally** with full development environment
- ✅ **Navigate the codebase** confidently
- ✅ **Understand the architecture** and key decisions
- ✅ **Make your first contribution** following best practices
- ✅ **Get help** when you need it

### **Next Steps:**
1. **Explore the admin panel** - Login and try all the features
2. **Review recent PRs** - See how other developers make changes
3. **Pick your first issue** - Start with something small and manageable
4. **Ask questions** - The team is here to help you succeed!

### **Remember:**
- **No question is too small** - Ask for help when you need it
- **Documentation is code** - Update docs when you learn something
- **Test everything** - Better to catch issues early
- **Follow patterns** - Consistency makes the codebase maintainable

---

## 📊 **Onboarding Checklist**

### **Environment Setup** ✅
- [ ] Node.js 18+ installed
- [ ] Repository cloned and dependencies installed
- [ ] Environment variables configured
- [ ] Database setup and seeded
- [ ] Development server running
- [ ] Admin panel accessible

### **Understanding** ✅  
- [ ] Tech stack overview understood
- [ ] Project structure familiar
- [ ] Key architectural decisions clear
- [ ] Data model relationships understood
- [ ] Development workflow known

### **Documentation** ✅
- [ ] README.md read
- [ ] ARCHITECTURE.md reviewed
- [ ] FEATURES.md browsed
- [ ] Development commands memorized
- [ ] API documentation referenced

### **First Contribution** ✅
- [ ] First issue identified
- [ ] Feature branch created
- [ ] Changes implemented and tested
- [ ] Pull request submitted
- [ ] Code review completed

---

**🎯 Estimated Time to Complete: 30 minutes**

**Welcome to the JVS Tessera development team! We're excited to have you contribute to this amazing ticketing system. 🚀**

---

*Last Updated: March 2025*  
*Questions? Contact the development team or create a GitHub issue.*











