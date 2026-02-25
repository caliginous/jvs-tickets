import { NextApiRequest, NextApiResponse } from 'next';
import { serverAuthenticate } from '../../../../constants/serverUtil';
import { PermissionSection, PermissionType } from '../../../../constants/interfaces';
import prisma from '../../../../lib/prisma';

interface ImportMapping {
    // User fields (all optional except email for flexibility)
    firstName?: string;
    lastName?: string;
    email: string;
    phone?: string;
    address?: string;
    city?: string;
    zip?: string;
    country?: string;
    
    // Event fields
    eventTitle: string;
    eventDate: string;
    
    // Order fields
    ticketType?: string;
    price?: string;
    paymentDate?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const sessionUser = await serverAuthenticate(req, res, {
            permission: PermissionSection.EventManagement,
            permissionType: PermissionType.Write
        });
        
        if (!sessionUser) return;

        const { csvData, mapping } = req.body as { csvData: any[], mapping: ImportMapping };

        if (!csvData || !mapping) {
            return res.status(400).json({ error: 'CSV data and mapping are required' });
        }

        console.log(`🚀 Starting import of ${csvData.length} rows...`);

        const stats = {
            eventsCreated: 0,
            usersCreated: 0,
            usersUpdated: 0,
            ordersCreated: 0,
            ordersSkipped: 0,
            ticketsCreated: 0,
            errors: [] as any[]
        };

        // Group rows by event first (outside transaction)
        const eventGroups = new Map<string, any[]>();
        
        for (const row of csvData) {
            const eventKey = row[mapping.eventTitle] || 'Unknown Event';
            if (!eventGroups.has(eventKey)) {
                eventGroups.set(eventKey, []);
            }
            eventGroups.get(eventKey)!.push(row);
        }

        console.log(`📊 Found ${eventGroups.size} unique events`);

        // Process each event separately (not one giant transaction)
        for (const [eventTitle, rows] of Array.from(eventGroups.entries())) {
                try {
                    // Get event date from first row
                    const firstRow = rows[0];
                    const eventDateStr = firstRow[mapping.eventDate];
                    const eventDate = new Date(eventDateStr);

                // Check if event already exists by title and date
                let event = await prisma.event.findFirst({
                        where: {
                            title: eventTitle,
                            dates: {
                                some: {
                                    date: eventDate
                                }
                            }
                        },
                        include: {
                            dates: true
                        }
                    });

                if (!event) {
                    // Create new event
                    event = await prisma.event.create({
                            data: {
                                title: eventTitle,
                                seatType: 'free',
                                isActive: false, // Historic events are inactive
                                description: `Imported from CiviCRM on ${new Date().toISOString()}`,
                                personalTicket: false,
                                dates: {
                                    create: {
                                        date: eventDate,
                                        title: eventTitle
                                    }
                                }
                            },
                            include: {
                                dates: true
                            }
                        });

                    stats.eventsCreated++;
                    console.log(`✅ Created event: ${eventTitle}`);
                }

                const eventDateId = event.dates[0].id;

                // Get unique ticket types from this event's rows
                const ticketTypes = new Set(rows.map(r => (mapping.ticketType ? r[mapping.ticketType] : null) || 'Standard'));
                
                // Create EventTicketTypes for this event
                for (const ttName of Array.from(ticketTypes)) {
                    if (ttName && ttName.trim()) {
                        const existing = await prisma.eventTicketType.findFirst({
                                where: {
                                    eventId: event.id,
                                    name: ttName
                                }
                        });

                        if (!existing) {
                            // Get price from a row with this ticket type
                            const sampleRow = rows.find(r => ((mapping.ticketType ? r[mapping.ticketType] : null) || 'Standard') === ttName);
                            const priceStr = (mapping.price && sampleRow ? sampleRow[mapping.price] : null) || '£ 0.00';
                            const price = parseFloat(priceStr.replace(/[£,\s]/g, '').trim() || '0') * 100; // Convert to pence

                            await prisma.eventTicketType.create({
                                    data: {
                                        eventId: event.id,
                                        name: ttName,
                                        price: Math.round(price),
                                        currency: 'GBP',
                                        isActive: true,
                                        isPublic: true,
                                        sortOrder: 0,
                                        publicSortOrder: 0
                                }
                            });
                        }
                    }
                }

                // Process each participant/order
                for (const row of rows) {
                    try {
                        const emailRaw = row[mapping.email];
                        if (!emailRaw) continue;
                        
                        const email = emailRaw.toLowerCase().trim();
                        if (!email || !email.includes('@')) continue;

                        // Create or find user
                        let user = await prisma.user.findUnique({
                                where: { email }
                            });

                        if (!user) {
                            user = await prisma.user.create({
                                    data: {
                                        firstName: (mapping.firstName ? row[mapping.firstName] : null) || 'Unknown',
                                        lastName: (mapping.lastName ? row[mapping.lastName] : null) || 'Unknown',
                                        email,
                                        phone: (mapping.phone ? row[mapping.phone] : null) || '',
                                        address: (mapping.address ? row[mapping.address] : null) || '',
                                        city: (mapping.city ? row[mapping.city] : null) || '',
                                        zip: (mapping.zip ? row[mapping.zip] : null) || '',
                                        countryCode: (mapping.country ? row[mapping.country] : null) || 'GB',
                                        regionCode: ''
                                    }
                            });
                            stats.usersCreated++;
                        } else {
                            // Update user with latest info if fields are missing
                            const updateData: any = {};
                            if (!user.phone && mapping.phone && row[mapping.phone]) {
                                updateData.phone = row[mapping.phone];
                            }
                            if (!user.address && mapping.address && row[mapping.address]) {
                                updateData.address = row[mapping.address];
                            }
                            if (Object.keys(updateData).length > 0) {
                                await prisma.user.update({
                                        where: { id: user.id },
                                        data: updateData
                                });
                                stats.usersUpdated++;
                            }
                        }

                        // Create order with deduplication
                        const priceStr = (mapping.price ? row[mapping.price] : null) || '£ 0.00';
                        const orderTotal = Math.round(parseFloat(priceStr.replace(/[£,\s]/g, '').trim() || '0') * 100);

                        const paymentDateStr = mapping.paymentDate ? row[mapping.paymentDate] : null;
                        const orderDate = paymentDateStr ? new Date(paymentDateStr) : eventDate;

                        // Generate deterministic idempotency key for deduplication
                        // Format: civicrm-import-{email}-{eventId}-{eventDate}
                        const idempotencyKey = `civicrm-import-${email}-${event.id}-${eventDate.toISOString().split('T')[0]}`;

                        // Check if order already exists
                        const existingOrder = await prisma.order.findUnique({
                                where: { idempotencyKey }
                        });

                        if (existingOrder) {
                            console.log(`⏭️  Order already exists for ${email} at ${eventTitle}, skipping`);
                            stats.ordersSkipped++;
                            continue; // Skip this row, order already imported
                        }

                        const order = await prisma.order.create({
                                data: {
                                    userId: user.id,
                                    eventDateId,
                                    paymentType: orderTotal === 0 ? 'Free' : 'Historical',
                                    status: 'CONFIRMED',
                                    shipping: JSON.stringify({ type: 'historical', source: 'CiviCRM Import' }),
                                    locale: 'en-GB',
                                    idempotencyKey,
                                    cancellationSecret: Math.random().toString(36).substr(2, 15),
                                    finalTotal: orderTotal,
                                    originalTotal: orderTotal,
                                    date: orderDate
                                }
                        });

                        stats.ordersCreated++;

                        // Create ticket
                        const ticketTypeName = (mapping.ticketType ? row[mapping.ticketType] : null) || 'Standard';
                        const ticketType = await prisma.eventTicketType.findFirst({
                                where: {
                                    eventId: event.id,
                                    name: ticketTypeName
                                }
                        });

                        if (ticketType) {
                            await prisma.ticket.create({
                                    data: {
                                        orderId: order.id,
                                        eventTicketTypeId: ticketType.id,
                                        amount: 1,
                                        secret: Math.random().toString(36).substring(2, 15)
                                    }
                            });
                            
                            // Update sold count
                            await prisma.eventTicketType.update({
                                where: { id: ticketType.id },
                                data: { sold: { increment: 1 } }
                            });
                            
                            stats.ticketsCreated++;
                        }

                    } catch (rowError) {
                        console.error('Error processing row:', rowError);
                        stats.errors.push({
                            row: row[mapping.email],
                            error: rowError.message
                        });
                    }
                }

            } catch (eventError) {
                console.error('Error processing event:', eventError);
                stats.errors.push({
                    event: eventTitle,
                    error: eventError.message
                });
            }
        }

        console.log('✅ Import completed:', stats);

        return res.status(200).json({
            success: true,
            stats
        });

    } catch (error) {
        console.error('❌ Import failed:', error);
        return res.status(500).json({ 
            error: 'Import failed',
            details: error.message 
        });
    }
}
