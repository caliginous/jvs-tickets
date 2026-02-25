const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addMissingTemplates() {
    try {
        console.log('🔍 Checking for missing email templates...');
        
        // Check if booking_confirmation template exists
        const existingTemplate = await prisma.emailTemplate.findFirst({
            where: { mailType: 'booking_confirmation' }
        });
        
        if (existingTemplate) {
            console.log('✅ booking_confirmation template already exists');
            return;
        }
        
        console.log('📧 Creating booking_confirmation template...');
        
        const template = await prisma.emailTemplate.create({
            data: {
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
                },
                isActive: true
            }
        });
        
        console.log('✅ Created template:', template.id);
        
        // List all templates
        const allTemplates = await prisma.emailTemplate.findMany({
            select: { id: true, name: true, mailType: true }
        });
        
        console.log('📋 All templates in database:');
        allTemplates.forEach(t => console.log(`  - ${t.mailType}: ${t.name} (${t.id})`));
        
    } catch (error) {
        console.error('❌ Error adding template:', error);
    } finally {
        await prisma.$disconnect();
    }
}

addMissingTemplates();
