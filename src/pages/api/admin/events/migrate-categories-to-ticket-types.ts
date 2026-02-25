import { NextApiRequest, NextApiResponse } from 'next';
import { serverAuthenticate } from '../../../../constants/serverUtil';
import { PermissionSection, PermissionType } from '../../../../constants/interfaces';
import prisma from '../../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        // Get list of events that need migration
        try {
            const sessionUser = await serverAuthenticate(req, res, {
                permission: PermissionSection.EventManagement,
                permissionType: PermissionType.Read
            });
            
            if (!sessionUser) return;

            const events = await prisma.event.findMany({
                where: {
                    categories: {
                        some: {}
                    }
                },
                include: {
                    categories: {
                        include: {
                            category: true
                        }
                    },
                    ticketTypes: true,
                    dates: {
                        include: {
                            orders: {
                                include: {
                                    tickets: true
                                }
                            }
                        }
                    }
                }
            });

            // Filter to only events that need migration
            const needsMigration = events
                .filter(e => e.categories.length > 0 && e.ticketTypes.length === 0)
                .map(e => ({
                    id: e.id,
                    title: e.title,
                    categories: e.categories.map(c => ({
                        id: c.category.id,
                        name: c.category.label,
                        price: c.category.price,
                        maxAmount: c.maxAmount
                    })),
                    totalOrders: e.dates.reduce((sum, d) => sum + d.orders.length, 0),
                    totalTickets: e.dates.reduce((sum, d) => 
                        sum + d.orders.reduce((osum, o) => 
                            osum + o.tickets.filter(t => t.categoryId !== null).length, 0
                        ), 0
                    )
                }));

            return res.status(200).json({
                eventsNeedingMigration: needsMigration.length,
                events: needsMigration
            });

        } catch (error) {
            console.error('Error fetching migration candidates:', error);
            return res.status(500).json({ error: 'Failed to fetch events' });
        }
    }

    if (req.method === 'POST') {
        // Perform migration for specific event
        try {
            const sessionUser = await serverAuthenticate(req, res, {
                permission: PermissionSection.EventManagement,
                permissionType: PermissionType.Write
            });
            
            if (!sessionUser) return;

            const { eventId } = req.body;

            if (!eventId) {
                return res.status(400).json({ error: 'Event ID is required' });
            }

            console.log(`🔄 Starting category → EventTicketType migration for event ${eventId}`);

            const result = await prisma.$transaction(async (tx) => {
                // Get event with categories
                const event = await tx.event.findUnique({
                    where: { id: parseInt(eventId) },
                    include: {
                        categories: {
                            include: {
                                category: true
                            }
                        },
                        ticketTypes: true,
                        dates: {
                            include: {
                                orders: {
                                    include: {
                                        tickets: true
                                    }
                                }
                            }
                        }
                    }
                });

                if (!event) {
                    throw new Error('Event not found');
                }

                if (event.ticketTypes.length > 0) {
                    throw new Error('Event already has EventTicketTypes - migration not needed');
                }

                if (event.categories.length === 0) {
                    throw new Error('Event has no categories to migrate');
                }

                console.log(`📋 Event: ${event.title}`);
                console.log(`📋 Categories to migrate: ${event.categories.length}`);

                // Create EventTicketType for each category
                const createdTicketTypes = [];
                for (const catOnEvent of event.categories) {
                    const category = catOnEvent.category;
                    
                    // Convert category price to pence (categories store in pounds)
                    const priceInPence = Math.round(category.price * 100);
                    
                    const ticketType = await tx.eventTicketType.create({
                        data: {
                            eventId: event.id,
                            name: category.label,
                            description: `Migrated from category: ${category.label}`,
                            price: priceInPence,
                            currency: 'GBP',
                            capacity: catOnEvent.maxAmount || null,
                            sold: 0, // Will be updated when we migrate tickets
                            isActive: true,
                            sortOrder: createdTicketTypes.length,
                            colorHex: category.color || null,
                            isPublic: true,
                            publicSortOrder: createdTicketTypes.length
                        }
                    });

                    createdTicketTypes.push({
                        ticketType,
                        categoryId: category.id
                    });

                    console.log(`✅ Created EventTicketType: ${ticketType.name} (£${category.price} → ${priceInPence} pence)`);
                }

                // Migrate existing tickets to use EventTicketTypes
                let ticketsMigrated = 0;
                for (const date of event.dates) {
                    for (const order of date.orders) {
                        for (const ticket of order.tickets) {
                            if (ticket.categoryId !== null) {
                                // Find corresponding EventTicketType
                                const mapping = createdTicketTypes.find(ct => ct.categoryId === ticket.categoryId);
                                
                                if (mapping) {
                                    await tx.ticket.update({
                                        where: { id: ticket.id },
                                        data: {
                                            eventTicketTypeId: mapping.ticketType.id,
                                            // Keep categoryId for reference but add eventTicketTypeId
                                        }
                                    });
                                    ticketsMigrated++;
                                }
                            }
                        }
                    }
                }

                console.log(`✅ Migrated ${ticketsMigrated} tickets to EventTicketTypes`);

                // Update sold counts on EventTicketTypes
                for (const mapping of createdTicketTypes) {
                    const soldCount = await tx.ticket.count({
                        where: {
                            eventTicketTypeId: mapping.ticketType.id
                        }
                    });

                    await tx.eventTicketType.update({
                        where: { id: mapping.ticketType.id },
                        data: { sold: soldCount }
                    });
                }

                return {
                    eventId: event.id,
                    eventTitle: event.title,
                    ticketTypesCreated: createdTicketTypes.length,
                    ticketsMigrated: ticketsMigrated,
                    ticketTypes: createdTicketTypes.map(ct => ({
                        id: ct.ticketType.id,
                        name: ct.ticketType.name,
                        price: ct.ticketType.price,
                        fromCategory: ct.categoryId
                    }))
                };
            });

            console.log(`🎉 Migration completed successfully for event ${eventId}`);

            return res.status(200).json({
                success: true,
                message: `Successfully migrated ${result.ticketTypesCreated} categories to EventTicketTypes`,
                result
            });

        } catch (error) {
            console.error('❌ Migration failed:', error);
            return res.status(500).json({ 
                error: error.message || 'Migration failed',
                details: error.stack
            });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
