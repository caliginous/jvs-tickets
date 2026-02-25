import { NextApiRequest, NextApiResponse } from "next";
import {
    revalidateBuild,
    serverAuthenticate
} from "../../../../constants/serverUtil";
import prisma from "../../../../lib/prisma";
import { PermissionSection, PermissionType } from "../../../../constants/interfaces";
import { generateEventSlug, ensureUniqueSlug } from "../../../../utils/slug";
import { toUTC } from "../../../../utils/datetime";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const user = await serverAuthenticate(req, res, {
        permission: PermissionSection.EventManagement,
        permissionType:
            req.method === "GET" ? PermissionType.Read : PermissionType.Write
    });
    if (!user) return;

    if (req.method === "GET") {
        const events = await prisma.event.findMany({
            include: {
                venue: true,
                dates: {
                    orderBy: {
                        date: 'asc'
                    },
                    include: {
                        orders: {
                            select: {
                                tickets: true
                            }
                        }
                    }
                },
                categories: {
                    include: {
                        category: true
                    }
                },
                customFields: true
            }
        });

        // Apply the same transformations as getServerSideProps
        const serializableEvents = events.map((event) => {
            return {
                ...event,
                ticketsBought: event.dates.map(date => date.orders).flat().reduce(
                    (a, order) =>
                        a + order.tickets.length,
                    0
                ),
                orders: [],
                dates: event.dates.map(({orders, ...date}) => ({
                    ...date,
                    date: date.date?.toISOString() ?? null,
                    ticketSaleStartDate: date.ticketSaleStartDate?.toISOString() ?? null,
                    ticketSaleEndDate: date.ticketSaleEndDate?.toISOString() ?? null
                }))
            };
        });

        res.status(200).json(serializableEvents);
        return;
    }

    if (req.method === "POST") {
        console.log("=== API: Creating new event ===");
        console.log("Request body:", req.body);
        
        const {
            title,
            subtitle,
            slug: providedSlug, // Rename to avoid conflict
            description,
            bespokeMessage,
            seatType,
            seatMapId,
            venueId,
            personalTicket,
            isActive,
            selectedCategories,
            categories, // Frontend also sends 'categories'
            dates, // Frontend sends 'dates' array
            eventDate, // Keep for backward compatibility
            eventDateTicketLimit,
            ticketSaleEndDate,
            startTime,
            endTime,
            timezone,
            customFields,
            status,
            ticketTypes // New field for ticket types
        } = req.body;
        
        console.log("Extracted values:");
        console.log("- title:", title);
        console.log("- description:", description);

        console.log("- selectedCategories:", selectedCategories);
        console.log("- categories:", categories);
        console.log("- dates:", dates);
        console.log("- eventDate:", eventDate);
        console.log("- eventDateTicketLimit:", eventDateTicketLimit);
        console.log("- venueId:", venueId, "type:", typeof venueId);
        console.log("- seatType:", seatType);
        console.log("- seatMapId:", seatMapId);
        console.log("- ticketTypes:", ticketTypes?.length || 0, "ticket types provided");
        
        // ENFORCE REQUIRED FIELDS
        if (!title || title.trim().length < 3) {
            return res.status(400).json({ error: 'Title is required and must be at least 3 characters' });
        }
        
        // Check for dates array first, then fallback to eventDate for backward compatibility
        const eventDateFromRequest = dates?.[0] || eventDate;
        if (!eventDateFromRequest) {
            return res.status(400).json({ error: 'Event date is required' });
        }
        
        // Use categories or selectedCategories, whichever is provided
        const categoriesToUse = categories || selectedCategories;
        
        // For free seating events, require either categories (legacy) OR ticket types (new system)
        if (seatType === 'free') {
            const hasCategories = categoriesToUse && categoriesToUse.length > 0;
            const hasTicketTypes = ticketTypes && ticketTypes.length > 0;
            
            if (!hasCategories && !hasTicketTypes) {
                return res.status(400).json({ 
                    error: 'At least one ticket type is required for free seating events' 
                });
            }
        }
        
        if (seatType === 'seatmap' && (!seatMapId || seatMapId <= 0)) {
            return res.status(400).json({ error: 'Seat map is required for seatmap type events' });
        }
        
        // Generate slug for the event
        console.log("Generating slug for event...");
        const eventSlug = providedSlug ? await ensureUniqueSlug(providedSlug) : await generateEventSlug(title);
        console.log("Generated slug:", eventSlug);

        // Start database transaction for atomic event creation
        console.log("Starting database transaction for event creation...");
        
        let eventId;
        let createdTicketTypes = [];
        let createdEvent;
        
        try {
            const result = await prisma.$transaction(async (tx) => {
                // Create the event first
                console.log("About to create event with data:", {
                    title: title,
                    description: description,
                    slug: eventSlug,
                    seatType: seatType,
                    seatMapId: seatMapId ? parseInt(seatMapId.toString()) : null,
                    venueId: venueId ? parseInt(venueId.toString()) : null,
                    personalTicket: personalTicket || false
                });
                
                const event = await tx.event.create({
                    data: {
                        title: title,
                        description: description,
                        bespokeMessage: bespokeMessage || null,
                        slug: eventSlug,
                        seatType: seatType,
                        seatMapId: seatMapId ? parseInt(seatMapId.toString()) : null,
                        venueId: venueId ? parseInt(venueId.toString()) : null,
                        personalTicket: personalTicket || false,
                        isActive: isActive ?? true
                    }
                });

                console.log("Event created with ID:", event.id);
                eventId = event.id;

                // Create categories if provided (legacy support)
                if (seatType === 'free' && categoriesToUse && categoriesToUse.length > 0) {
                    console.log("Creating categories:", categoriesToUse);
                    for (const category of categoriesToUse) {
                        const categoryRecord = await tx.categoriesOnEvents.create({
                            data: {
                                eventId: eventId,
                                categoryId: parseInt(category.toString()),
                                maxAmount: parseInt((eventDateTicketLimit || 10).toString())
                            }
                        });
                        console.log("Category created:", categoryRecord);
                    }
                }

                // Create event date (REQUIRED)
                const eventDateFromRequest = dates?.[0] || eventDate;
                if (!eventDateFromRequest) {
                    throw new Error('Event date is required');
                }
                
                console.log("Creating event date from request:", eventDateFromRequest);
                
                // Extract date information from the dates array or fallback to eventDate
                let eventDateToCreate;
                if (dates && dates[0]) {
                    // Use the dates array structure
                    const dateInfo = dates[0];
                    eventDateToCreate = {
                        date: new Date(dateInfo.date),
                        totalTicketLimit: parseInt((dateInfo.totalTicketLimit || eventDateTicketLimit || 10).toString()),
                        ticketSaleStartDate: dateInfo.ticketSaleStartDate ? new Date(dateInfo.ticketSaleStartDate) : null,
                        ticketSaleEndDate: dateInfo.ticketSaleEndDate ? new Date(dateInfo.ticketSaleEndDate) : null
                    };
                } else {
                    // Fallback to simple eventDate with time combination
                    console.log("Combining date and time:", {
                        eventDate: eventDateFromRequest,
                        startTime,
                        endTime,
                        timezone,
                        ticketSaleEndDate
                    });
                    
                    // Properly convert from London timezone to UTC using toUTC function
                    const eventDateObject = new Date(eventDateFromRequest);
                    const utcDate = toUTC(eventDateObject, startTime || '19:00', timezone || 'Europe/London');
                    console.log("Converting London time to UTC:", {
                        localDate: eventDateFromRequest,
                        localTime: startTime || '19:00', 
                        timezone: timezone || 'Europe/London',
                        resultUTC: utcDate.toISOString()
                    });
                    
                    eventDateToCreate = {
                        date: utcDate,
                        totalTicketLimit: parseInt((eventDateTicketLimit || 10).toString()),
                        ticketSaleEndDate: ticketSaleEndDate ? new Date(ticketSaleEndDate) : null
                    };
                    
                    console.log("Created date object:", eventDateToCreate.date.toISOString());
                }
                
                console.log("Event date data to create:", eventDateToCreate);

                const createdEventDate = await tx.eventDate.create({
                    data: {
                        ...eventDateToCreate,
                        event: {
                            connect: {
                                id: eventId
                            }
                        }
                    }
                });
                console.log("Event date created:", createdEventDate);

                // Create custom fields with validation
                if (customFields && customFields.length > 0) {
                    console.log("Validating custom fields...");
                    
                    // Validate custom fields
                    const { validateCustomFields, sanitizeCustomField } = await import('../../../../lib/validators/customFieldValidator');
                    const validation = validateCustomFields(customFields);
                    
                    if (!validation.isValid) {
                        console.error(`❌ Custom fields validation failed:`, validation.errors);
                        throw new Error(`Invalid custom fields: ${validation.errors.join(', ')}`);
                    }
                    
                    // Sanitize and create fields
                    const sanitizedFields = customFields.map(sanitizeCustomField);
                    console.log("Creating", sanitizedFields.length, "custom fields...");
                    
                    for (const field of sanitizedFields) {
                        await tx.customField.create({
                            data: {
                                label: field.label,
                                name: field.name,
                                isRequired: field.isRequired,
                                event: {
                                    connect: {
                                        id: eventId
                                    }
                                }
                            }
                        });
                    }
                    console.log("✅ Custom fields created successfully");
                }

                // Create ticket types if provided
                if (ticketTypes && ticketTypes.length > 0) {
                    console.log("Creating", ticketTypes.length, "ticket types...");
                    
                    for (let i = 0; i < ticketTypes.length; i++) {
                        const ticketType = ticketTypes[i];
                        console.log(`Creating ticket type ${i + 1}:`, ticketType);
                        
                        const createdTicketType = await tx.eventTicketType.create({
                            data: {
                                eventId: eventId,
                                name: ticketType.name,
                                description: ticketType.description || null,
                                price: parseInt(ticketType.price.toString()),
                                currency: ticketType.currency || 'GBP',
                                capacity: ticketType.capacity ? parseInt(ticketType.capacity.toString()) : null,
                                colorHex: ticketType.colorHex || null,
                                isActive: ticketType.isActive !== false, // Default to true
                                isPublic: ticketType.isPublic !== false, // Default to true
                                sortOrder: ticketType.sortOrder || i,
                                sold: 0
                            }
                        });
                        
                        createdTicketTypes.push(createdTicketType);
                        console.log(`Ticket type ${i + 1} created:`, createdTicketType);
                    }
                }

                return { event, ticketTypes: createdTicketTypes, eventDate: createdEventDate };
            });
            
            eventId = result.event.id;
            createdTicketTypes = result.ticketTypes;
            createdEvent = result.event;
            
            console.log("Transaction completed successfully. Event ID:", eventId, "Ticket types:", createdTicketTypes.length);
            
        } catch (error) {
            console.error("Transaction failed:", error);
            return res.status(500).json({ 
                error: 'Failed to create event with ticket types', 
                details: error instanceof Error ? error.message : 'Unknown error' 
            });
        }

        console.log(`🔄 Starting revalidation for new event ${eventId}...`);
        
        const revalidationPaths = [
            "/payment",
            "/" // Always revalidate homepage which lists events
        ];
        
        // Add event page revalidation if slug exists and event is active
        if (createdEvent?.slug && createdEvent.isActive) {
            revalidationPaths.push(`/events/${createdEvent.slug}`);
            console.log(`🔄 Added new event page revalidation: /events/${createdEvent.slug}`);
        }
        
        console.log(`🔄 Revalidation paths:`, revalidationPaths);
        try {
            await revalidateBuild(res, revalidationPaths);
            console.log(`✅ Revalidation completed for new event ${eventId}`);
        } catch (revalidateError) {
            console.error(`❌ Revalidation failed for new event ${eventId}:`, revalidateError);
            // Don't fail the request, but log the error clearly
            // The page will still be regenerated on next ISR cycle
        }
        
        // Track event creation for analytics
        console.log(`[analytics/admin_action] ${JSON.stringify({
            action_type: 'create_event',
            resource: 'event',
            resource_id: eventId.toString(),
            resource_title: title,
            ticket_types_created: createdTicketTypes.length,
            venue_id: venueId,
            admin_user: user.email
        })}`);
        
        // Return enhanced response with event and ticket types
        return res.status(200).json({ 
            id: eventId,
            event: createdEvent,
            ticketTypes: createdTicketTypes,
            message: `Event created successfully with ${createdTicketTypes.length} ticket types`
        });
    }

    res.status(405).end("Method not allowed");
}

