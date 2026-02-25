import type { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from "next-auth/jwt";
import { serverAuthenticate } from '../../../../constants/serverUtil';
import prisma from '../../../../lib/prisma';
import { PermissionSection, PermissionType } from '../../../../constants/interfaces';
import { json2csvAsync } from 'json-2-csv';

function toInt(value: string | string[] | undefined, fallback: number): number {
    const n = Array.isArray(value) ? parseInt(value[0] as string, 10) : parseInt((value ?? '') as string, 10);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function setProperty(object: any, path: string, value: any) {
    const pList = path.split(".");
    const len = pList.length;
    for(let i = 0; i < len-1; i++) {
        const elem = pList[i];
        if( !object[elem] ) object[elem] = {}
        object = object[elem];
    }
    object[pList[len-1]] = value;
    return object;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Add unique request ID for tracking
    const rid = Math.random().toString(36).slice(2);

    try {
        const user = await serverAuthenticate(req, res, {
            permission: PermissionSection.Orders,
            permissionType: PermissionType.Read
        }, false); // Don't send response automatically

        // Explicit permission check; fail with 403 rather than throw
        if (!user) {
            console.log('orders request forbidden', rid, { user: null });
            return res.status(403).json({ error: 'Forbidden' });
        }

        const page = toInt(req.query.page, 0);
        const amount = Math.min(Math.max(toInt(req.query.amount, 25), 1), 100);
        const skip = page * amount;

        // Build where clause safely
        const where: any = {};

        // Handle filters with validation
        const { shipping, eventId, event, eventDateId, payment, customerFirstName, customerLastName, sorting, exportFile, status, search, today, recent }: any = req.query;

        console.log('orders request', rid, { page, amount, shipping, eventId, event, eventDateId, payment, customerFirstName, customerLastName, sorting, exportFile, status, search, today, recent });

        if (shipping) {
            where.shipping = { contains: `"type":"${shipping}"` };
        }
        if (eventId) {
            const eid = toInt(eventId, -1);
            if (eid > 0) where.eventDate = { ...where.eventDate, eventId: eid };
        }
        if (eventDateId) {
            const edid = toInt(eventDateId, -1);
            if (edid > 0) where.eventDateId = edid;
        }
        if (event) {
            where.eventDate = { ...where.eventDate, event: { title: { contains: event } } };
        }
        if (payment) {
            // Validate payment type
            const validPaymentTypes = ['credit_card', 'stripe_iban', 'sofort', 'invoice', 'paypal'];
            if (!validPaymentTypes.includes(payment)) {
                return res.status(400).json({ error: 'Invalid payment type filter' });
            }
            where.paymentType = payment;
        }

        if (status) {
            // Validate status type
            const validStatuses = ['PENDING', 'PAID', 'CANCELLED', 'REFUNDED'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({ error: 'Invalid status filter' });
            }
            where.status = status;
        }
        if (customerFirstName) {
            where.user = { ...where.user, firstName: { contains: customerFirstName } };
        }
        if (customerLastName) {
            where.user = { ...where.user, lastName: { contains: customerLastName } };
        }

        // Enhanced search functionality
        if (search) {
            const searchTerm = search.toString().trim();
            if (searchTerm) {
                // Parse search query for advanced syntax
                const searchParts = searchTerm.split(' ');
                const orConditions: any[] = [];
                
                for (const part of searchParts) {
                    if (part.includes(':')) {
                        // Handle field-specific searches (e.g., "status:PAID", "email:test@example.com")
                        const [field, value] = part.split(':', 2);
                        switch (field.toLowerCase()) {
                            case 'status':
                                orConditions.push({ status: value.toUpperCase() });
                                break;
                            case 'email':
                                orConditions.push({ user: { email: { contains: value, mode: 'insensitive' } } });
                                break;
                            case 'phone':
                                orConditions.push({ user: { phone: { contains: value } } });
                                break;
                            case 'event':
                                orConditions.push({ 
                                    eventDate: { 
                                        event: { 
                                            title: { contains: value, mode: 'insensitive' } 
                                        } 
                                    } 
                                });
                                break;
                        }
                    } else {
                        // General search across multiple fields
                        const generalOrConditions = [
                            { id: { contains: part, mode: 'insensitive' } },
                            { user: { firstName: { contains: part, mode: 'insensitive' } } },
                            { user: { lastName: { contains: part, mode: 'insensitive' } } },
                            { user: { email: { contains: part, mode: 'insensitive' } } },
                            { user: { phone: { contains: part } } },
                            { 
                                eventDate: { 
                                    event: { 
                                        title: { contains: part, mode: 'insensitive' } 
                                    } 
                                } 
                            }
                        ];
                        orConditions.push(...generalOrConditions);
                    }
                }
                
                if (orConditions.length > 0) {
                    where.OR = orConditions;
                }
            }
        }

        // Handle quick filters
        if (today === 'true') {
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const todayEnd = new Date();
            todayEnd.setHours(23, 59, 59, 999);
            
            where.date = {
                gte: todayStart,
                lte: todayEnd
            };
        }

        if (recent) {
            const days = parseInt(recent.replace('d', '')) || 7;
            const recentDate = new Date();
            recentDate.setDate(recentDate.getDate() - days);
            
            where.date = {
                gte: recentDate
            };
        }

        // Handle sorting safely
        let orderBy: any = { date: "desc" }; // Default sorting
        if (sorting) {
            try {
                const decodedSorting = decodeURIComponent(sorting);
                const sortFields = decodedSorting.split(",");
                if (sortFields.length > 0) {
                    const sortField = sortFields[0]; // Take first sort field
                    const split = sortField.split(":");
                    if (split.length === 2) {
                        const field = split[0];
                        const direction = split[1].toLowerCase();
                        if (direction === 'asc' || direction === 'desc') {
                            orderBy = { [field]: direction };
                        }
                    }
                }
            } catch (e) {
                // Invalid sorting, use default
                console.warn('Invalid sorting parameter:', sorting);
            }
        }

        // Fetch orders and count
        const [orders, total] = await Promise.all([
            prisma.order.findMany({
                where,
                orderBy,
                skip,
                take: amount,
                include: {
                    eventDate: {
                        select: {
                            id: true,
                            title: true,
                            date: true,
                            event: {
                                select: {
                                    id: true,
                                    title: true,
                                    slug: true,
                                    customFields: true
                                }
                            }
                        }
                    },
                    user: true,
                    tickets: {
                        include: {
                            eventTicketType: true
                        }
                    }
                }
            }),
            prisma.order.count({ where })
        ]);

        // Handle CSV export
        if (exportFile && exportFile === "csv") {
            res.setHeader("Content-Type", "text/csv");
            
            // Transform orders to flatten custom fields into separate columns
            const { getAllCustomFieldColumns, formatCustomFieldsForDisplay } = await import('../../../../utils/customFieldsFormatter');
            
            // Get all unique custom field columns across all orders
            const customFieldColumns = getAllCustomFieldColumns(
                orders,
                orders[0]?.eventDate?.event?.customFields
            );
            
            // Transform orders for CSV with flattened custom fields
            const transformedOrders = orders.map(order => {
                const baseOrder = {
                    id: order.id,
                    date: order.date,
                    status: order.status,
                    paymentType: order.paymentType,
                    eventTitle: order.eventDate?.event?.title || 'N/A',
                    eventDate: order.eventDate?.date || 'N/A',
                    customerFirstName: order.user?.firstName || '',
                    customerLastName: order.user?.lastName || '',
                    customerEmail: order.user?.email || '',
                    customerPhone: order.user?.phone || '',
                    customerAddress: order.user?.address || '',
                    customerZip: order.user?.zip || '',
                    customerCity: order.user?.city || '',
                    customerCountry: order.user?.countryCode || '',
                    ticketCount: order.tickets?.length || 0,
                    finalTotal: order.finalTotal ? (order.finalTotal / 100).toFixed(2) : '0.00',
                    originalTotal: order.originalTotal ? (order.originalTotal / 100).toFixed(2) : '0.00'
                };
                
                // Add custom fields as separate columns
                if (order.customFields) {
                    try {
                        const formatted = formatCustomFieldsForDisplay(
                            order.customFields,
                            order.eventDate?.event?.customFields
                        );
                        formatted.forEach(field => {
                            baseOrder[field.label] = field.value;
                        });
                    } catch (error) {
                        console.error('Error parsing custom fields for CSV:', error);
                    }
                }
                
                return baseOrder;
            });
            
            const csv = await json2csvAsync(transformedOrders, {
                prependHeader: true,
                emptyFieldValue: ""
            });
            return res.status(200).send(csv);
        }

        return res.status(200).json({ ok: true, page, amount, total, orders });
    } catch (err: any) {
        console.error('orders request failed', rid, { message: err?.message, stack: err?.stack });
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
