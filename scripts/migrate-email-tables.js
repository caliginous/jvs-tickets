#!/usr/bin/env node

/**
 * Migration script to set up email management database tables
 * Run with: node scripts/migrate-email-tables.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function migrateEmailTables() {
    console.log('🚀 Starting email management system migration...');
    
    try {
        // Check if tables already exist by trying to query them
        console.log('📋 Checking existing email tables...');
        
        try {
            await prisma.emailSettings.findFirst();
            console.log('✅ EmailSettings table already exists');
        } catch (error) {
            console.log('❌ EmailSettings table does not exist, creating...');
            // The table will be created by Prisma when we run the migration
        }
        
        try {
            await prisma.emailTemplate.findFirst();
            console.log('✅ EmailTemplate table already exists');
        } catch (error) {
            console.log('❌ EmailTemplate table does not exist, creating...');
        }
        
        try {
            await prisma.emailLog.findFirst();
            console.log('✅ EmailLog table already exists');
        } catch (error) {
            console.log('❌ EmailLog table does not exist, creating...');
        }
        
        try {
            await prisma.emailTest.findFirst();
            console.log('✅ EmailTest table already exists');
        } catch (error) {
            console.log('❌ EmailTest table does not exist, creating...');
        }
        
        // Create some sample templates if none exist
        const existingTemplates = await prisma.emailTemplate.findMany();
        
        if (existingTemplates.length === 0) {
            console.log('📧 Creating sample email templates...');
            
            const sampleTemplates = [
                {
                    name: "Booking Confirmation",
                    mailType: "booking_confirmation",
                    subjects: {
                        en: "Your booking is confirmed!",
                        de: "Ihre Buchung ist bestätigt!",
                        he: "ההזמנה שלך אושרה!"
                    },
                    baseHtml: `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{subject}}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
        <h1 style="color: #2c3e50; margin-bottom: 20px;">{{subject}}</h1>
        {{content}}
        <hr style="border: none; border-top: 1px solid #dee2e6; margin: 20px 0;">
        <p style="font-size: 12px; color: #6c757d; text-align: center;">
            This email was sent from {{common.appName}}
        </p>
    </div>
</body>
</html>`,
                    bodyHtml: `<p>Hello {{user.firstName}},</p>

<p>Thank you for your booking for {{event.title}} on {{event.date}}.</p>

<p>Your booking details:</p>
<ul>
    <li>Booking ID: {{booking.id}}</li>
    <li>Number of seats: {{booking.seats}}</li>
    <li>Total amount: {{booking.total}}</li>
</ul>

<p>We look forward to seeing you!</p>

<p>Best regards,<br>
The {{event.title}} Team</p>`,
                    samplePayload: {
                        user: {
                            firstName: "John",
                            lastName: "Doe",
                            email: "john@example.com"
                        },
                        event: {
                            title: "Sample Event",
                            date: "15 September 2024",
                            time: "7:00 PM",
                            venue: "JVS Community Centre"
                        },
                        booking: {
                            id: "BK-2024-001",
                            seats: 2,
                            total: "£40.00",
                            status: "Confirmed"
                        },
                        common: {
                            greeting: "Good morning",
                            appName: "Tessera"
                        }
                    }
                },
                {
                    name: "Welcome Email",
                    mailType: "welcome",
                    subjects: {
                        en: "Welcome to Tessera!",
                        de: "Willkommen bei Tessera!",
                        he: "ברוכים הבאים לטיסרה!"
                    },
                    baseHtml: `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{subject}}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
        <h1 style="color: #2c3e50; margin-bottom: 20px;">{{subject}}</h1>
        {{content}}
        <hr style="border: none; border-top: 1px solid #dee2e6; margin: 20px 0;">
        <p style="font-size: 12px; color: #6c757d; text-align: center;">
            This email was sent from {{common.appName}}
        </p>
    </div>
</body>
</html>`,
                    bodyHtml: `<p>Hello {{user.firstName}},</p>

<p>Welcome to Tessera! We're excited to have you on board.</p>

<p>Here's what you can do with your new account:</p>
<ul>
    <li>Browse and book events</li>
    <li>Manage your bookings</li>
    <li>Receive updates about events</li>
</ul>

<p>If you have any questions, feel free to contact our support team.</p>

<p>Best regards,<br>
The Tessera Team</p>`,
                    samplePayload: {
                        user: {
                            firstName: "Jane",
                            lastName: "Smith",
                            email: "jane@example.com"
                        },
                        common: {
                            appName: "Tessera"
                        }
                    }
                }
            ];
            
            for (const template of sampleTemplates) {
                await prisma.emailTemplate.create({
                    data: template
                });
                console.log(`✅ Created template: ${template.name}`);
            }
        } else {
            console.log(`📧 Found ${existingTemplates.length} existing templates`);
        }
        
        // Create default email settings if none exist
        const existingSettings = await prisma.emailSettings.findFirst();
        
        if (!existingSettings) {
            console.log('⚙️ Creating default email settings...');
            
            await prisma.emailSettings.create({
                data: {
                    transportMode: "smtp",
                    smtpHost: process.env.EMAIL_HOST || "smtp.gmail.com",
                    smtpPort: parseInt(process.env.EMAIL_PORT || "587"),
                    smtpSecure: process.env.EMAIL_SECURE === "true",
                    smtpUser: process.env.EMAIL_USER || "",
                    smtpPassword: process.env.EMAIL_PASS || "",
                    senderEmail: process.env.EMAIL_SENDER || "noreply@jvs.org.uk",
                    senderName: process.env.EMAIL_SENDER_NAME || "Tessera",
                    bccEmail: process.env.EMAIL_BCC || "",
                    appBaseUrl: process.env.APP_BASE_URL || "https://tessera.jvs.org.uk"
                }
            });
            
            console.log('✅ Created default email settings');
        } else {
            console.log('⚙️ Email settings already exist');
        }
        
        console.log('🎉 Email management system migration completed successfully!');
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the migration
migrateEmailTables().catch(console.error);
