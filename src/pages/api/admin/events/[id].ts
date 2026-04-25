import { NextApiRequest, NextApiResponse } from "next";
import {
    revalidateBuild,
    requestMainSiteEventRevalidation,
    serverAuthenticate
} from "../../../../constants/serverUtil";
import prisma from "../../../../lib/prisma";
import { PermissionSection, PermissionType } from "../../../../constants/interfaces";
import { generateEventSlug } from "../../../../utils/slug";
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

    const { id } = req.query;
    const event = await prisma.event.findUnique({
        where: {
            id: parseInt(id as string)
        },
        include: {
            dates: true,
            customFields: true,
            ticketTypes: true
        }
    });

    if (!event) {
        res.status(404).end("Event not found");
        return;
    }

    if (req.method === "GET") {
        res.status(200).json(event);
        return;
    }

    if (req.method === "DELETE") {
        const eventId = parseInt(id as string);

        try {
            // Use a transaction to ensure all deletions succeed or fail together
            await prisma.$transaction(async (tx) => {
                console.log(`🗑️ Starting deletion of event ${eventId}`);

                // Collect all event date ids for the event
                const eventDates = await tx.eventDate.findMany({
                    where: { eventId },
                    select: { id: true }
                });
                const eventDateIds = eventDates.map((d) => d.id);
                console.log(`🗑️ Found ${eventDateIds.length} event dates to delete`);

                if (eventDateIds.length > 0) {
                    // Find all orders for these event dates
                    const orders = await tx.order.findMany({
                        where: { eventDateId: { in: eventDateIds } },
                        select: { id: true }
                    });
                    const orderIds = orders.map((o) => o.id);
                    console.log(`🗑️ Found ${orderIds.length} orders to delete`);

                    if (orderIds.length > 0) {
                        // Delete order items first (they reference EventTicketType)
                        const deletedOrderItems = await tx.orderItem.deleteMany({ 
                            where: { orderId: { in: orderIds } } 
                        });
                        console.log(`🗑️ Deleted ${deletedOrderItems.count} order items`);

                        // Delete tickets and tasks tied to these orders
                        const deletedTickets = await tx.ticket.deleteMany({ 
                            where: { orderId: { in: orderIds } } 
                        });
                        console.log(`🗑️ Deleted ${deletedTickets.count} tickets`);

                        const deletedTasks = await tx.task.deleteMany({ 
                            where: { orderId: { in: orderIds } } 
                        });
                        console.log(`🗑️ Deleted ${deletedTasks.count} tasks`);

                        // Delete the orders
                        const deletedOrders = await tx.order.deleteMany({ 
                            where: { id: { in: orderIds } } 
                        });
                        console.log(`🗑️ Deleted ${deletedOrders.count} orders`);
                    }

                    // Delete the event dates
                    const deletedEventDates = await tx.eventDate.deleteMany({ 
                        where: { id: { in: eventDateIds } } 
                    });
                    console.log(`🗑️ Deleted ${deletedEventDates.count} event dates`);
                }

                // Delete event ticket types (now that OrderItems are gone)
                const deletedEventTicketTypes = await tx.eventTicketType.deleteMany({ 
                    where: { eventId } 
                });
                console.log(`🗑️ Deleted ${deletedEventTicketTypes.count} event ticket types`);

                // Delete custom fields for the event
                const deletedCustomFields = await tx.customField.deleteMany({ 
                    where: { eventId } 
                });
                console.log(`🗑️ Deleted ${deletedCustomFields.count} custom fields`);

                // Finally delete the event
                const deletedEvent = await tx.event.delete({ where: { id: eventId } });
                console.log(`🗑️ Deleted event:`, deletedEvent.title);
            });

            console.log(`✅ Event ${eventId} deleted successfully`);
            await revalidateBuild(res, []);
            await requestMainSiteEventRevalidation({
                action: "event_deleted",
                eventId,
                slug: event.slug ?? undefined,
            });
            res.status(200).end("Deleted");
            return;
        } catch (error) {
            console.error(`❌ Failed to delete event ${eventId}:`, error);
            res.status(500).json({ 
                error: "Failed to delete event", 
                details: error.message 
            });
            return;
        }
    }

    if (req.method === "PUT") {
        console.log("=== API: Updating event ===");
        console.log("Request body:", req.body);
        console.log("Event ID:", id);

        
        let { title, description, bespokeMessage, personalTicket, isActive, dates, customFields, venueId, timezone, slug: providedSlug, eventDate, startTime, endTime, eventDateTicketLimit, ticketSaleEndDate } = req.body;

        // Get original event data before update for revalidation purposes
        const originalEvent = await prisma.event.findUnique({
            where: { id: parseInt(id as string) },
            select: { slug: true }
        });

        // Wrap all updates in a transaction to ensure atomicity
        let updateData: any = {};
        try {
            await prisma.$transaction(async (tx) => {
                console.log(`🔄 Starting transaction for event ${id}`);

                // Handle slug generation/update
                let eventSlug = providedSlug;
                if (title && !eventSlug) {
                    // Generate slug if title is being updated and no slug provided
                    console.log(`🔄 Generating slug for updated event ${id} with title: ${title}`);
                    eventSlug = await generateEventSlug(title, parseInt(id as string));
                    console.log(`✅ Generated slug: ${eventSlug}`);
                }

                // Handle event date updates with proper timezone conversion
                if (eventDate && startTime && timezone) {
                    console.log("🕐 Updating event date/time using timezone:", {
                        eventDate,
                        startTime,
                        endTime,
                        timezone,
                        ticketSaleEndDate
                    });
                    
                    // Properly convert from London timezone to UTC using toUTC function
                    const eventDateObject = new Date(eventDate);
                    const utcDate = toUTC(eventDateObject, startTime, timezone);
                    console.log("🕐 Converted to UTC:", utcDate.toISOString());
                    
                    // Update the first event date for this event
                    const existingEventDate = await tx.eventDate.findFirst({
                        where: { eventId: parseInt(id as string) }
                    });
                    
                    if (existingEventDate) {
                        await tx.eventDate.update({
                            where: { id: existingEventDate.id },
                            data: {
                                date: utcDate,
                                totalTicketLimit: eventDateTicketLimit ? parseInt(eventDateTicketLimit.toString()) : null,
                                ticketSaleEndDate: ticketSaleEndDate ? new Date(ticketSaleEndDate) : null
                            }
                        });
                        console.log(`✅ Updated event date ${existingEventDate.id} with UTC time and ticket sale end date`);
                    }
                } else if (dates) {
                    console.log(`🔄 Updating dates for event ${id}:`, dates);
                    console.log(`📊 Dates type:`, typeof dates);
                    console.log(`📊 Dates length:`, Array.isArray(dates) ? dates.length : 'not an array');
                    console.log(`📊 Dates content:`, JSON.stringify(dates, null, 2));
                    
                    const eventDates = await tx.eventDate.findMany({
                        where: {
                            eventId: parseInt(id as string)
                        },
                        select: {
                            id: true,
                            orders: true
                        }
                    });
                    const eventDateIds = eventDates.map(eventDate => eventDate.id)
                    for(const date of dates) {
                        if (date.id && eventDateIds.includes(date.id)) {
                            console.log(`🔄 Updating existing event date ${date.id}:`, date);
                            
                            // Convert string values to proper types for Prisma
                            const updateData = {
                                ...date,
                                totalTicketLimit: date.totalTicketLimit ? parseInt(date.totalTicketLimit.toString()) : null,
                                ticketSaleStartDate: new Date(date.ticketSaleStartDate),
                                ticketSaleEndDate: new Date(date.ticketSaleEndDate),
                                date: new Date(date.date)
                            };
                            
                            // Remove the id field as it shouldn't be updated
                            delete updateData.id;
                            
                            await tx.eventDate.update({
                                where: {
                                    id: date.id
                                },
                                data: updateData
                            });
                            console.log(`✅ Event date ${date.id} updated successfully`);
                            continue;
                        }

                        console.log(`🔄 Creating new event date:`, date);
                        
                        // Convert string values to proper types for Prisma
                        const createData = {
                            ...date,
                            totalTicketLimit: date.totalTicketLimit ? parseInt(date.totalTicketLimit.toString()) : null,
                            ticketSaleStartDate: new Date(date.ticketSaleStartDate),
                            ticketSaleEndDate: new Date(date.ticketSaleEndDate),
                            date: new Date(date.date),
                            event: {
                                connect: {
                                    id: parseInt(id as string)
                                }
                            }
                        };
                        
                        // Remove the id field for new records
                        delete createData.id;
                        
                        const newEventDate = await tx.eventDate.create({
                            data: createData
                        });
                        console.log(`✅ New event date created:`, newEventDate);
                    }
                    const eventDatesDelete = eventDateIds.filter(id => !dates.some(date => date.id === id));
                    if (eventDatesDelete.length > 0) {
                        console.log(`🔄 Deleting event dates:`, eventDatesDelete);
                        if (eventDates.filter(date => eventDatesDelete.includes(date.id)).some(date => date.orders.length > 0)) {
                            console.log(`❌ Cannot delete dates with existing orders`);
                            return res.status(400).end("The Date you want to delete has already orders and therefor can't be deleted!")
                        }
                        await tx.eventDate.deleteMany({
                            where: {
                                id: {
                                    in: eventDatesDelete
                                }
                            }
                        });
                        console.log(`✅ Event dates deleted successfully`);
                    }
                }
                if (customFields) {
                    console.log(`🔄 Updating custom fields for event ${id}:`, customFields);
                    console.log(`📊 Custom fields type:`, typeof customFields);
                    console.log(`📊 Custom fields length:`, Array.isArray(customFields) ? customFields.length : 'not an array');
                    
                    // Filter out completely empty fields (legacy data cleanup)
                    // If both label and name are empty, treat as a field to be deleted
                    const nonEmptyFields = customFields.filter((field: any) => {
                        const hasLabel = field.label && field.label.trim().length > 0;
                        const hasName = field.name && field.name.trim().length > 0;
                        const isEmpty = !hasLabel && !hasName;
                        
                        if (isEmpty && field.id) {
                            console.log(`🗑️ Marking empty legacy field ${field.id} for deletion`);
                        }
                        
                        return !isEmpty;
                    });
                    
                    console.log(`📊 After filtering empty fields: ${nonEmptyFields.length} valid fields`);
                    
                    // Validate custom fields (only non-empty ones)
                    const { validateCustomFields, sanitizeCustomField, detectFieldNameChanges } = await import('../../../../lib/validators/customFieldValidator');
                    
                    if (nonEmptyFields.length > 0) {
                        const validation = validateCustomFields(nonEmptyFields);
                        
                        if (!validation.isValid) {
                            console.error(`❌ Custom fields validation failed:`, validation.errors);
                            throw new Error(`Invalid custom fields: ${validation.errors.join(', ')}`);
                        }
                    }
                    
                    // Check if any field names have changed (potential data orphaning)
                    if (nonEmptyFields.length > 0) {
                        const nameChanges = detectFieldNameChanges(event.customFields, nonEmptyFields);
                        if (nameChanges.length > 0) {
                            console.warn(`⚠️ Field name changes detected:`, nameChanges);
                            
                            // Check if event has any bookings/orders
                            const orderCount = await tx.order.count({
                                where: {
                                    eventDate: {
                                        eventId: parseInt(id as string)
                                    }
                                }
                            });
                            
                            if (orderCount > 0) {
                                const changedFieldNames = nameChanges.map(c => `"${c.oldName}" → "${c.newName}"`).join(', ');
                                console.error(`❌ Cannot change field names: Event has ${orderCount} existing bookings`);
                                throw new Error(
                                    `Cannot change custom field names for events with existing bookings. ` +
                                    `This event has ${orderCount} booking(s). ` +
                                    `Changing field names would orphan customer data. ` +
                                    `Attempted changes: ${changedFieldNames}. ` +
                                    `Please create a new field instead, or contact support for data migration.`
                                );
                            }
                            
                            console.log(`✅ Field name changes allowed (no existing bookings)`);
                        }
                    }
                    
                    // Sanitize all fields
                    const sanitizedFields = nonEmptyFields.map(sanitizeCustomField);
                    
                    // Use proper UPDATE/INSERT/DELETE pattern instead of delete-and-recreate
                    const existingIds = event.customFields.map(f => f.id);
                    const incomingIds = sanitizedFields.filter(f => f.id).map(f => f.id!);
                    
                    // Also mark empty legacy fields for deletion
                    const emptyFieldIds = customFields
                        .filter((field: any) => {
                            const hasLabel = field.label && field.label.trim().length > 0;
                            const hasName = field.name && field.name.trim().length > 0;
                            return !hasLabel && !hasName && field.id;
                        })
                        .map((field: any) => field.id);
                    
                    // DELETE: Fields that exist in DB but not in incoming data + empty legacy fields
                    const fieldsToDelete = existingIds.filter(id => !incomingIds.includes(id));
                    const allFieldsToDelete = Array.from(new Set([...fieldsToDelete, ...emptyFieldIds]));
                    
                    if (allFieldsToDelete.length > 0) {
                        console.log(`🗑️ Deleting ${allFieldsToDelete.length} custom fields (including ${emptyFieldIds.length} empty legacy fields):`, allFieldsToDelete);
                        await tx.customField.deleteMany({
                            where: {
                                id: { in: allFieldsToDelete },
                                eventId: parseInt(id as string)
                            }
                        });
                        console.log(`✅ Deleted ${allFieldsToDelete.length} custom fields`);
                    }
                    
                    // UPDATE: Fields with existing IDs
                    const fieldsToUpdate = sanitizedFields.filter(f => f.id);
                    for (const field of fieldsToUpdate) {
                        console.log(`🔄 Updating custom field ${field.id}:`, field);
                        await tx.customField.update({
                            where: { id: field.id },
                            data: {
                                label: field.label,
                                name: field.name,
                                isRequired: field.isRequired
                            }
                        });
                    }
                    console.log(`✅ Updated ${fieldsToUpdate.length} custom fields`);
                    
                    // INSERT: Fields without IDs (new fields)
                    const fieldsToCreate = sanitizedFields.filter(f => !f.id);
                    for (const field of fieldsToCreate) {
                        console.log(`➕ Creating new custom field:`, field);
                        await tx.customField.create({
                            data: {
                                label: field.label,
                                name: field.name,
                                isRequired: field.isRequired,
                                event: {
                                    connect: {
                                        id: parseInt(id as string)
                                    }
                                }
                            }
                        });
                    }
                    console.log(`✅ Created ${fieldsToCreate.length} new custom fields`);
                }

                updateData = {
                    ...(title && { title: title }),
                    ...(description !== undefined && { description: description }),
                    ...(bespokeMessage !== undefined && { bespokeMessage: bespokeMessage }),
                    ...(eventSlug && { slug: eventSlug }),
                    ...(personalTicket && { personalTicket }),
                    ...(isActive !== undefined && { isActive: isActive }),
                    ...(req.body.venueId !== undefined && {
                        venueId: req.body.venueId ? parseInt(req.body.venueId.toString()) : null
                    })
                };
                

                
                console.log(`📊 Venue ID from request:`, req.body.venueId);
                console.log(`📊 Venue ID type:`, typeof req.body.venueId);
                console.log(`📊 Venue ID parsed:`, req.body.venueId ? parseInt(req.body.venueId.toString()) : null);
                console.log(`🔄 Final update data:`, updateData);
                console.log(`🔄 Final update data JSON:`, JSON.stringify(updateData, null, 2));
                
                console.log(`🔄 Updating event ${id} with data:`, updateData);
                
                const updatedEvent = await tx.event.update({
                    where: {
                        id: parseInt(id as string)
                    },
                    data: updateData
                });
                
                console.log(`✅ Event updated successfully:`, updatedEvent);
                console.log(`✅ Event update data:`, JSON.stringify(updatedEvent, null, 2));
                
                console.log(`✅ Transaction completed successfully for event ${id}`);
            });
            
            console.log(`🔄 Starting revalidation for event ${id}...`);
            
            // Get the updated event to find its slug for revalidation
            const eventForRevalidation = await prisma.event.findUnique({
                where: { id: parseInt(id as string) },
                select: { slug: true, isActive: true }
            });
            
            const revalidationPaths = [
                `/booking/${id as string}`,
                "/information",
                "/" // Always revalidate homepage which lists events
            ];
            
            // Tessera /events/[slug] is SSR (getServerSideProps); res.revalidate() cannot invalidate it.
            // Marketing site ISR is triggered via MAIN_SITE_REVALIDATE_* (requestMainSiteEventRevalidation).

            console.log(`🔄 Revalidation paths:`, revalidationPaths);
            try {
                await revalidateBuild(res, revalidationPaths);
                console.log(`✅ Revalidation completed for event ${id}`);
            } catch (revalidateError) {
                console.error(`❌ Revalidation failed for event ${id}:`, revalidateError);
                // Don't fail the request, but log the error clearly
                // The page will still be regenerated on next ISR cycle
            }

            const numericId = parseInt(id as string, 10);
            await requestMainSiteEventRevalidation({
                action: "event_updated",
                eventId: numericId,
                slug: eventForRevalidation?.slug ?? undefined,
            });
            if (
                originalEvent?.slug &&
                originalEvent.slug !== eventForRevalidation?.slug
            ) {
                await requestMainSiteEventRevalidation({
                    action: "event_updated",
                    eventId: numericId,
                    slug: originalEvent.slug,
                });
            }

            const responseData = { 
                message: "Event updated successfully", 
                eventId: id,
                updatedData: updateData 
            };
            console.log(`📤 Sending response:`, JSON.stringify(responseData, null, 2));
            res.status(200).json(responseData);
            return;
        } catch (error) {
            console.error(`❌ Transaction failed for event ${id}:`, error);
            console.error(`❌ Error stack:`, error.stack);
            res.status(500).json({ 
                error: "Failed to update event", 
                details: error.message 
            });
            return;
        }
    }

    res.status(400).end("Method unsupported");
}
