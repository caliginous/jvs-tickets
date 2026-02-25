# 👥 JVS Tessera - Admin User Guide

## 📋 **Overview**

This guide provides comprehensive instructions for administrators using the JVS Tessera ticketing system. Whether you're managing events, processing orders, or configuring system settings, this guide covers all administrative functions.

## 🔐 **Getting Started**

### **Accessing the Admin Panel**
- **URL**: [tickets.jvs.org.uk/admin](https://tickets.jvs.org.uk/admin)
- **Login**: Use your admin email and password
- **First Time**: Contact the system administrator for account creation

### **Admin Dashboard Overview**
After logging in, you'll see the main dashboard with:
- **Quick Stats**: Total events, orders, and revenue
- **Recent Activity**: Latest orders and system activity
- **Navigation Menu**: Access to all admin functions
- **User Profile**: Your account settings and logout

---

## 🎭 **Event Management**

### **Creating a New Event**

1. **Navigate to Events**
   ```
   Admin Panel → Events → Create New Event
   ```

2. **Basic Information**
   - **Title**: Event name (will auto-generate URL slug)
   - **Description**: Detailed event description (supports URLs)
   - **Venue**: Select from managed venues
   - **Seat Type**: Choose "Free Seating" or "Assigned Seating"

3. **Event Dates**
   - Click "Add Date" to create event instances
   - Set date, time, and ticket sale periods
   - Multiple dates supported for recurring events

4. **Ticket Types** (Recommended - Modern System)
   - Click "Add Ticket Type" 
   - Set name, price, capacity (optional)
   - Configure visibility and ordering
   - Use color coding for visual distinction

5. **Legacy Categories** (If Needed)
   - Select from existing global categories
   - Set maximum quantities per category
   - Used for backward compatibility

6. **Custom Fields** (Optional)
   - Add additional data collection fields
   - Set field labels and requirements
   - Useful for dietary requirements, accessibility needs

7. **Bespoke Message** (Optional)
   - Add custom message for email communications
   - Appears in booking confirmations and reminders
   - Up to 200 words of plain text

8. **Media & Images**
   - Upload event cover image
   - Images automatically optimized
   - Recommended size: 800x600 pixels

### **Managing Existing Events**

#### **Editing Events**
```
Admin Panel → Events → Click Event Title → Edit
```
- All event details can be modified
- Changes reflect immediately on public site
- Use "Update Main Website" to sync with external sites

#### **Event Status Management**
- **Active**: Event visible to public
- **Inactive**: Event hidden but data preserved
- Toggle status using the switch in event list

#### **Viewing Event Performance**
```
Admin Panel → Reports → Select Event
```
- Sales statistics and revenue
- Ticket type performance
- Customer demographics
- Export data to CSV

### **Venue Management**

#### **Creating Venues**
```
Admin Panel → Events → Venues → Add New Venue
```
- **Name**: Venue name (must be unique)
- **Address**: Full address including postcode
- **Description**: Additional venue information
- **Status**: Active/inactive for event selection

#### **Managing Venues**
- Edit venue details anytime
- View events associated with each venue
- Deactivate venues to remove from event selection
- Cannot delete venues with associated events

---

## 🎫 **Order Management**

### **Viewing Orders**

#### **Order List**
```
Admin Panel → Orders
```
- **Search**: By customer name, email, or order ID
- **Filter**: By event, date range, status, payment method
- **Sort**: By date, amount, status, or customer name
- **Export**: Download filtered results as CSV

#### **Order Details**
Click any order to view:
- **Customer Information**: Name, email, address, phone
- **Event Details**: Event, date, venue, tickets
- **Payment Information**: Method, amount, transaction ID
- **Order Status**: PENDING, PAID, CANCELLED, REFUNDED
- **Ticket Information**: Individual ticket details and QR codes

### **Processing Orders**

#### **Manual Order Creation**
```
Admin Panel → Orders → Create New Order
```
1. **Select Event**: Choose event and date
2. **Choose Tickets**: Select ticket types and quantities
3. **Customer Information**: Enter customer details
4. **Payment Method**: Choose payment type
5. **Apply Discounts**: Add discount codes if applicable
6. **Process Payment**: Complete order creation

#### **Order Modifications**
- **Edit Customer Details**: Update contact information
- **Add Notes**: Internal notes for order tracking
- **Change Status**: Update order status manually
- **Resend Emails**: Resend confirmation emails

### **Refund Processing**

#### **Full Refunds**
```
Order Details → Actions → Process Refund → Full Refund
```
1. Select "Full Refund"
2. Choose refund reason
3. Add optional notes
4. Confirm refund processing
5. Customer automatically notified via email

#### **Partial Refunds**
```
Order Details → Actions → Process Refund → Partial Refund
```
1. Select "Partial Refund"
2. Enter custom refund amount
3. Choose refund reason
4. Add notes explaining partial amount
5. Process refund

#### **Refund Status Tracking**
- **Processing**: Refund submitted to Stripe
- **Completed**: Refund processed successfully
- **Failed**: Refund processing failed (contact support)

### **Order Cancellation**

#### **Cancelling Orders**
```
Order Details → Actions → Cancel Order
```
1. Select cancellation reason
2. Choose refund option (full, partial, none)
3. Add cancellation notes
4. Confirm cancellation
5. Customer automatically notified

---

## 💰 **Discount Code Management**

### **Creating Discount Codes**

```
Admin Panel → Discount Codes → Create New Code
```

#### **Code Configuration**
- **Code**: Unique identifier (e.g., "WELCOME20", "STUDENT50")
- **Description**: Internal description for admin reference
- **Discount Type**: Percentage or Fixed Amount
- **Discount Value**: Percentage (20) or amount in pence (500 = £5)

#### **Usage Settings**
- **Valid From**: When discount becomes active
- **Valid Until**: When discount expires (optional)
- **Usage Limit**: Maximum number of uses (optional)
- **Minimum Order Value**: Required order total (optional)
- **Maximum Discount**: Cap on discount amount (optional)

#### **Event Restrictions** (Optional)
- **Applies to Events**: Limit to specific events
- **Applies to Categories**: Limit to specific ticket types
- Leave empty for all events/categories

### **Managing Discount Codes**

#### **Monitoring Usage**
- **Current Usage**: How many times code has been used
- **Remaining Uses**: Uses left before limit reached
- **Recent Orders**: Orders that used the code

#### **Code Status Management**
- **Active**: Code can be used by customers
- **Inactive**: Code disabled but preserved
- **Expired**: Code past expiration date

### **Current Active Codes** (Production)
- **WELCOME20**: 20% discount for new members
- **STUDENT50**: 50% discount for students  
- **EARLYBIRD**: £5 discount for early bookings

---

## 📧 **Email Management**

### **Email Settings Configuration**

```
Admin Panel → Email → Settings Tab
```

#### **Transport Configuration**
1. **SMTP Mode**
   - Host, port, security settings
   - Username and password
   - Test connection before saving

2. **Email Provider Mode**
   - Choose provider (SendGrid, Mailgun, etc.)
   - Enter API credentials
   - Configure sender settings

#### **Common Settings**
- **Sender Email**: From address for all emails
- **Sender Name**: Display name for sender
- **BCC Email**: Admin copy address
- **App Base URL**: For email link generation

### **Email Template Management**

```
Admin Panel → Email → Templates Tab
```

#### **Creating Templates**
1. **Basic Information**
   - Template name and mail type
   - Subject lines (multi-language support)
   - Active/inactive status

2. **HTML Content**
   - **Base HTML**: Complete HTML structure with `{{content}}` placeholder
   - **Body HTML**: Email content that replaces `{{content}}`
   - Use token sidebar for dynamic content

3. **Sample Payload**
   - JSON data for testing token replacement
   - Preview template with sample data
   - Test email delivery

#### **Available Tokens**
```html
<!-- User Information -->
{{user.firstName}} {{user.lastName}} {{user.email}}

<!-- Event Information -->  
{{event.title}} {{event.date}} {{event.location}} {{event.url}}
{{event.bespoke.message}} <!-- Custom event message -->

<!-- Booking Information -->
{{booking.id}} {{booking.tickets}} {{booking.total}} {{booking.status}}

<!-- Common Information -->
{{common.appName}} {{common.supportEmail}} {{common.appUrl}}
```

#### **Template Operations**
- **Edit**: Modify existing templates
- **Duplicate**: Copy template as starting point
- **Preview**: View rendered template with sample data
- **Test Send**: Send test email to verify delivery
- **Export**: Download template for backup

### **Email Template Types** (Production)
1. **Welcome** - New user registration
2. **Booking Confirmation** - Order confirmation with bespoke messages
3. **Payment Link** - Stripe payment processing
4. **Payment Failed** - Payment error notifications
5. **Refund Processed** - Refund confirmations
6. **Event Reminder** - Pre-event reminders
7. **Password Reset** - Account recovery
8. **Booking Cancellation** - Cancellation notifications

### **Email Testing & Monitoring**

#### **Test Email Sending**
```
Template Editor → Preview → Send Test Email
```
- Enter test email address
- Customize test payload if needed
- Send and verify delivery
- Check spam folder if not received

#### **Email Log Monitoring**
```
Admin Panel → Email → Logs (if available)
```
- View all sent emails
- Check delivery status
- Monitor failed deliveries
- Track template usage

---

## 👥 **User Management**

### **Admin User Creation**

```
Admin Panel → Users → Create New User
```

#### **User Information**
- **Username**: Unique identifier for login
- **Email**: User's email address (also used for login)
- **Password**: Secure password (user can change later)
- **Status**: Active/inactive user status

#### **Permission Assignment**
Select appropriate permissions for the user's role:

- **EventManagement**: Create, edit, delete events
- **OrderManagement**: View and process orders
- **UserManagement**: Manage other admin users (Super Admin only)
- **CategoryManagement**: Manage ticket categories
- **VenueManagement**: Create and manage venues
- **EmailManagement**: Manage email templates and settings
- **OptionsManagement**: System configuration
- **Translation**: Multi-language management
- **Orders**: View order details
- **EventSeatMaps**: Manage seating charts
- **Options**: System options access
- **EventCategories**: Category management
- **Translation**: Localization management

### **User Roles & Permissions**

#### **Super Administrator**
- All permissions enabled
- Can create and manage other admin users
- System configuration access
- Full system control

#### **Event Manager**
- EventManagement, VenueManagement
- OrderManagement, CategoryManagement
- Can create events and process orders
- No user management access

#### **Order Processor**
- OrderManagement, Orders
- Process refunds and cancellations
- Customer service functions
- No event creation access

#### **Content Manager**
- EventManagement, EmailManagement
- Translation, Options
- Manage content and communications
- No financial operations

### **Managing Existing Users**

#### **Editing User Permissions**
```
Admin Panel → Users → Edit User
```
- Modify permission assignments
- Update user information
- Change password (if needed)
- Activate/deactivate accounts

#### **User Activity Monitoring**
- Track user login activity
- Monitor permission usage
- Review user-created content
- Audit user actions (if logging enabled)

---

## ⚙️ **System Configuration**

### **General Options**

```
Admin Panel → Options
```

#### **Application Settings**
- **App Name**: Display name for the application
- **App URL**: Base URL for link generation
- **Support Email**: Contact email for customer support
- **Currency**: Default currency (GBP)
- **Invoice Numbering**: Starting invoice number

#### **Payment Settings**
- **Payment Currency**: Currency for all transactions
- **Stripe Configuration**: Payment processor settings
- **Invoice Settings**: Invoice generation options

### **Localization Management**

```
Admin Panel → Localization
```

#### **Language Settings**
- **Default Locale**: Primary language (en-GB)
- **Available Locales**: Supported languages
- **Translation Strings**: Manage UI text translations

#### **Managing Translations**
- **Add Translations**: Create new translation strings
- **Edit Existing**: Modify current translations
- **Import/Export**: Bulk translation management
- **Namespace Organization**: Group related translations

### **System Monitoring**

#### **Performance Monitoring**
- **Response Times**: API and page load times
- **Error Rates**: System error frequency
- **Uptime**: Service availability metrics
- **Database Performance**: Query performance stats

#### **Security Monitoring**
- **Login Attempts**: Failed login tracking
- **Permission Violations**: Unauthorized access attempts
- **Data Changes**: Audit trail for sensitive operations
- **Security Alerts**: Automated security notifications

---

## 📊 **Reports & Analytics**

### **Event Reports**

```
Admin Panel → Reports → Event Reports
```

#### **Sales Reports**
- **Revenue by Event**: Total sales per event
- **Ticket Type Performance**: Best-selling ticket types
- **Sales Trends**: Revenue over time
- **Capacity Utilization**: Sold vs. available tickets

#### **Customer Reports**
- **Customer Demographics**: Location, age, preferences
- **Repeat Customers**: Customer loyalty metrics
- **Booking Patterns**: When customers book
- **Customer Feedback**: Ratings and comments

### **Financial Reports**

#### **Revenue Reports**
- **Total Revenue**: Overall sales performance
- **Payment Method Analysis**: Preferred payment types
- **Refund Analysis**: Refund rates and reasons
- **Discount Usage**: Discount code effectiveness

#### **Order Reports**
- **Order Volume**: Number of orders over time
- **Average Order Value**: Revenue per order
- **Conversion Rates**: Booking completion rates
- **Cancellation Analysis**: Cancellation patterns

### **Export & Analysis**

#### **Data Export**
- **CSV Export**: Download data for external analysis
- **Date Range Selection**: Custom reporting periods
- **Filter Options**: Event, status, payment type filters
- **Scheduled Reports**: Automated report generation

#### **External Integration**
- **API Access**: Programmatic data access
- **Third-party Tools**: Integration with analytics platforms
- **Custom Dashboards**: Build custom reporting views
- **Real-time Data**: Live performance monitoring

---

## 🛠️ **Troubleshooting**

### **Common Issues**

#### **Login Problems**
- **Forgot Password**: Use password reset function
- **Account Locked**: Contact system administrator
- **Permission Denied**: Check user permissions
- **Session Expired**: Log in again

#### **Event Management Issues**
- **Event Not Visible**: Check active status
- **Ticket Types Not Showing**: Verify public visibility
- **Venue Not Available**: Check venue active status
- **Image Upload Fails**: Check file size and format

#### **Order Processing Issues**
- **Payment Failed**: Check Stripe configuration
- **Email Not Sent**: Verify email settings
- **Refund Failed**: Check payment method and amount
- **Discount Not Applied**: Verify code validity and restrictions

#### **System Performance Issues**
- **Slow Loading**: Check internet connection and server status
- **Database Errors**: Contact system administrator
- **Email Delivery Issues**: Check SMTP configuration
- **Image Display Problems**: Check image URLs and permissions

### **Getting Help**

#### **Documentation Resources**
- **Feature Guide**: Complete feature documentation
- **API Documentation**: Technical API reference
- **Setup Guides**: Installation and configuration
- **Architecture Guide**: System design and structure

#### **Support Contacts**
- **Technical Support**: Contact development team
- **User Support**: Internal admin support
- **Emergency Contact**: For critical system issues
- **Feature Requests**: Submit enhancement requests

### **Best Practices**

#### **Security Best Practices**
- **Strong Passwords**: Use complex, unique passwords
- **Regular Updates**: Keep system updated
- **Permission Management**: Grant minimal necessary permissions
- **Backup Procedures**: Regular data backups

#### **Data Management**
- **Regular Cleanup**: Archive old orders and events
- **Data Validation**: Verify data accuracy regularly
- **Backup Verification**: Test backup restoration
- **Performance Monitoring**: Monitor system performance

#### **User Experience**
- **Consistent Branding**: Maintain JVS brand standards
- **Clear Communication**: Use clear, helpful messaging
- **Accessibility**: Ensure system accessibility
- **Mobile Optimization**: Verify mobile functionality

---

## 📚 **Additional Resources**

### **Documentation Links**
- **[System Architecture](ARCHITECTURE.md)** - Technical system overview
- **[Feature Documentation](FEATURES.md)** - Complete feature guide
- **[API Reference](API_README.md)** - Public API documentation
- **[Setup Guide](scripts/JVS-QUICK-SETUP.md)** - Development setup

### **Training Materials**
- **Video Tutorials**: Screen recordings of common tasks
- **Step-by-step Guides**: Detailed procedure documentation
- **FAQ**: Frequently asked questions and answers
- **Best Practices**: Recommended procedures and workflows

### **System Status**
- **Uptime Monitoring**: Real-time system status
- **Performance Metrics**: System performance data
- **Maintenance Schedule**: Planned maintenance windows
- **Update Notifications**: System update announcements

---

*This admin guide reflects the current production system as of March 2025. For the most up-to-date information and additional support, contact the JVS development team.*











