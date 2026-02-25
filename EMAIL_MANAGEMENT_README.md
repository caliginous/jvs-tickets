# 📧 Email Management System

A comprehensive email management system for the Tessera admin panel, allowing administrators to manage email transport settings, create HTML templates, and send test emails.

## 🚀 Features

### ✨ **Email Settings Management**
- **Transport Mode Selection**: Choose between Custom SMTP or Email Provider
- **SMTP Configuration**: Host, port, security, username, password
- **Provider Configuration**: Support for SendGrid, Mailgun, Postmark, AWS SES
- **Common Settings**: Sender email/name, BCC, application base URL
- **Real-time Validation**: Zod schema validation with inline error messages

### 📝 **Template Management**
- **Multi-language Support**: Subject lines in multiple locales (EN, DE, HE)
- **HTML Templates**: Base template with `{{content}}` placeholder + body content
- **Token System**: Dynamic content replacement for user, event, booking, and common data
- **Template Preview**: Live preview with sample payload data
- **CRUD Operations**: Create, read, update, delete, duplicate, export templates

### 🧪 **Testing & Logging**
- **Test Email Sending**: Send test emails with custom payloads
- **Email Logging**: Track all sent emails with status and metadata
- **Test History**: Maintain history of test email attempts

## 🗄️ Database Schema

### **EmailSettings Table**
```sql
- id (UUID, Primary Key)
- transportMode (smtp|provider)
- smtpHost, smtpPort, smtpSecure, smtpUser, smtpPassword
- providerName, providerUser, providerPassword
- senderEmail, senderName, bccEmail, appBaseUrl
- createdAt, updatedAt, updatedBy
```

### **EmailTemplate Table**
```sql
- id (UUID, Primary Key)
- name, mailType, subjects (JSON)
- baseHtml, bodyHtml, samplePayload (JSON)
- isActive, createdAt, updatedAt, createdBy, updatedBy
```

### **EmailLog Table**
```sql
- id (UUID, Primary Key)
- templateId, recipientEmail, subject, htmlContent
- messageId, status, errorMessage
- mailType, locale, payload (JSON)
- sentAt, deliveredAt
```

### **EmailTest Table**
```sql
- id (UUID, Primary Key)
- templateId, testEmail, testPayload (JSON), locale
- success, messageId, errorMessage
- testedAt, testedBy
```

## 🛠️ Setup Instructions

### **1. Database Migration**
```bash
# Generate Prisma client
npx prisma generate

# Run the migration script
node scripts/migrate-email-tables.js
```

### **2. Environment Variables**
Add these to your `.env` file:
```env
# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_SENDER=noreply@jvs.org.uk
EMAIL_SENDER_NAME=Tessera
EMAIL_BCC=admin@jvs.org.uk
APP_BASE_URL=https://tessera.jvs.org.uk
```

### **3. Access the System**
Navigate to `/admin/email` in your admin panel. You'll see two tabs:
- **Settings**: Configure email transport and common settings
- **Templates**: Manage email templates

## 📱 User Interface

### **Settings Tab**
- **Transport Mode Selection**: Radio buttons for SMTP vs Provider
- **Dynamic Fields**: Show relevant fields based on selected mode
- **Validation**: Real-time form validation with error messages
- **Save Button**: Disabled until changes are made

### **Templates Tab**
- **Template List**: Table with search and filtering
- **Actions**: Edit, Duplicate, Export, Delete
- **New Template**: Button to create new templates

### **Template Editor**
- **Two-Column Layout**: Form on left, token sidebar on right
- **Locale Switcher**: Switch between languages for subject lines
- **HTML Editor**: Textarea for base and body HTML
- **Sample Payload**: JSON editor for testing tokens

### **Preview Modal**
- **Two Tabs**: Rendered HTML and Source code
- **Token Replacement**: Live preview with sample data
- **Send Test**: Button to send test email

## 🔧 API Endpoints

### **Settings**
- `GET /api/admin/email/settings` - Retrieve current settings
- `PUT /api/admin/email/settings` - Update settings

### **Templates**
- `GET /api/admin/email/templates` - List templates (with search/filter)
- `POST /api/admin/email/templates` - Create new template
- `GET /api/admin/email/templates/[id]` - Get specific template
- `PUT /api/admin/email/templates/[id]` - Update template
- `DELETE /api/admin/email/templates/[id]` - Delete template

### **Preview & Testing**
- `POST /api/admin/email/templates/preview` - Generate template preview
- `POST /api/admin/email/test` - Send test email

## 🎨 Token System

### **Available Tokens**
```html
<!-- User Data -->
{{user.firstName}} {{user.lastName}} {{user.email}} {{user.fullName}}

<!-- Event Data -->
{{event.title}} {{event.date}} {{event.time}} {{event.venue}} {{event.url}}

<!-- Booking Data -->
{{booking.id}} {{booking.seats}} {{booking.total}} {{booking.status}} {{booking.createdAt}}

<!-- Common Data -->
{{common.greeting}} {{common.appName}} {{common.supportEmail}} {{common.baseUrl}}
```

### **Template Structure**
```html
<!-- Base Template (required) -->
<!DOCTYPE html>
<html>
<body>
    {{content}}  <!-- This placeholder is required -->
</body>
</html>

<!-- Body Template -->
<h1>Hello {{user.firstName}}</h1>
<p>Welcome to {{event.title}}</p>
```

## 🔒 Security Features

- **Admin Authentication**: All endpoints require admin privileges
- **Input Validation**: Zod schema validation for all inputs
- **SQL Injection Protection**: Prisma ORM with parameterized queries
- **XSS Protection**: HTML content is properly escaped in previews

## 🚀 Future Enhancements

### **Planned Features**
- [ ] **Email Encryption**: Encrypt sensitive credentials in database
- [ ] **Email Scheduling**: Send emails at specific times
- [ ] **Bulk Email**: Send to multiple recipients
- [ ] **Email Analytics**: Track open rates, click rates
- [ ] **Template Versioning**: Version control for templates
- [ ] **Email Queue**: Background processing for large volumes

### **Integration Points**
- [ ] **Event Booking**: Automatic confirmation emails
- [ ] **User Registration**: Welcome emails
- [ ] **Password Reset**: Security emails
- [ ] **Notification System**: Event updates and reminders

## 🐛 Troubleshooting

### **Common Issues**

1. **"Template not found" Error**
   - Ensure the template ID exists in the database
   - Check if the template is marked as active

2. **"Validation failed" Error**
   - Verify all required fields are filled
   - Check email format and URL validity
   - Ensure SMTP/Provider configuration is complete

3. **Preview Not Working**
   - Verify the base template contains `{{content}}`
   - Check that sample payload is valid JSON
   - Ensure all referenced tokens exist in the payload

### **Debug Mode**
Enable debug logging by setting:
```env
DEBUG=email:*
```

## 📚 API Documentation

### **Request/Response Examples**

#### **Create Template**
```typescript
POST /api/admin/email/templates
{
  "name": "Welcome Email",
  "mailType": "welcome",
  "subjects": {
    "en": "Welcome!",
    "de": "Willkommen!"
  },
  "baseHtml": "<html><body>{{content}}</body></html>",
  "bodyHtml": "<h1>Hello {{user.firstName}}</h1>",
  "samplePayload": { "user": { "firstName": "John" } }
}
```

#### **Update Settings**
```typescript
PUT /api/admin/email/settings
{
  "transportMode": "smtp",
  "smtpHost": "smtp.gmail.com",
  "smtpPort": 587,
  "smtpSecure": false,
  "smtpUser": "user@gmail.com",
  "smtpPassword": "app-password",
  "senderEmail": "noreply@jvs.org.uk",
  "senderName": "Tessera",
  "appBaseUrl": "https://tessera.jvs.org.uk"
}
```

## 🤝 Contributing

1. **Code Style**: Follow existing patterns and use TypeScript
2. **Testing**: Test all API endpoints and UI components
3. **Documentation**: Update this README for any changes
4. **Security**: Ensure all inputs are properly validated

## 📄 License

This email management system is part of the Tessera project and follows the same licensing terms.

---

**Need Help?** Contact the development team or create an issue in the project repository.
