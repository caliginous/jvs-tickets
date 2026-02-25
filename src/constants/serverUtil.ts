import path from "path";
import fs from "fs";
import bycrypt from "bcryptjs";
import { getToken } from "next-auth/jwt";
import { NextApiRequest, NextApiResponse } from "next";
import prisma from "../lib/prisma";
import { Permission, PermissionSection, PermissionType } from "./interfaces";
import i18nConfig from "../../i18n";
import { Ticket, Tickets } from "../store/reducers/orderReducer";
import { eventDateIsBookable } from "./util";
import { SeatMap } from "../components/seatselection/seatmap/SeatSelectionMap";
import { randomBytes } from "crypto";
import { logger } from "../lib/logger";

export function getStaticAssetFile(file, options = null) {
    let basePath = process.cwd();
    
    // In production (Vercel), the assets are in the .next/assets directory
    if (process.env.NODE_ENV === "production") {
        basePath = path.join(basePath, ".next/assets");
    } else {
        basePath = path.join(basePath, "src/assets");
    }

    const filePath = path.join(basePath, file);
    
    try {
        return fs.readFileSync(filePath, options);
    } catch (error) {
        // If the file doesn't exist in the expected location, try alternative paths
        if (error.code === 'ENOENT') {
            // Try the source directory as fallback
            const srcPath = path.join(process.cwd(), "src/assets", file);
            try {
                return fs.readFileSync(srcPath, options);
            } catch (srcError) {
                // If still not found, try the public directory
                const publicPath = path.join(process.cwd(), "public/assets", file);
                try {
                    return fs.readFileSync(publicPath, options);
                } catch (publicError) {
                    logger.error(`[getStaticAssetFile] Failed to read template file: ${file}`);
                    logger.debug(`[getStaticAssetFile] Tried paths:`, [filePath, srcPath, publicPath]);
                    throw new Error(`Template file not found: ${file}`);
                }
            }
        }
        throw error;
    }
}

export const hashPassword = async (password: string) => {
    return await bycrypt.hash(password, 10);
};

const checkPermissions = async (
    email: string,
    permission?: Permission
): Promise<boolean> => {
    if (
        permission === undefined ||
        permission.permission === PermissionSection.None
    )
        return true;
    
    try {
        const user = await prisma.adminUser.findUnique({
            where: {
                email: email
            }
        });
        
        // Add null check for user
        if (!user) {
            logger.permissions(`User not found for email: ${email}`);
            return false;
        }
        
        const permissions =
            permission.permissionType === PermissionType.Write
                ? user.writeRights
                : user.readRights;
        
        if (!permissions) {
            logger.permissions(`No permissions found for user: ${email}`);
            return false;
        }
        
        const parsedPermissions = JSON.parse(permissions);
        const hasPermission = parsedPermissions.includes(permission.permission);
        
        logger.permissions(`User: ${email}, Permission: ${permission.permission}, Type: ${permission.permissionType}, Result: ${hasPermission}`);
        
        return hasPermission;
    } catch (error) {
        logger.error(`[PERMISSIONS] Error checking permissions for ${email}:`, error);
        return false;
    }
};

export const getAdminServerSideProps = async (
    context,
    resultFunction?,
    permission?: Permission
) => {
    console.log('[ADMIN] getAdminServerSideProps called for path:', context.req.url);

    try {
        console.log('[ADMIN] Getting token...');
        const token = await getToken({ req: context.req });
        console.log('[ADMIN] Token result:', token ? 'Token found' : 'No token');
        if (token) {
            console.log('[ADMIN] Token details:', {
                email: token.email,
                name: token.name,
                hasEmail: !!token.email,
                hasName: !!token.name
            });
        }
        console.log('[ADMIN] Request headers cookie:', context.req.headers.cookie ? 'Present' : 'Missing');

        if (!token) {
            console.log('[ADMIN] No token found, setting permissionDenied: true');
            return {
                props: {
                    permissionDenied: true,
                    authStep: 'no_token'
                }
            };
        }

        if (!token.email) {
            console.log('[ADMIN] Token found but no email:', token);
            return {
                props: {
                    permissionDenied: true,
                    authStep: 'no_email'
                }
            };
        }

        console.log(`[ADMIN] Checking permissions for user: ${token.email}`);

        if (!(await checkPermissions(token.email, permission))) {
            console.log(`[ADMIN] Permission denied for user: ${token.email}`);
            return {
                props: {
                    permissionDenied: true,
                    authStep: 'permission_denied'
                }
            };
        }

        console.log('[ADMIN] Permissions granted, executing result function...');
        const result = resultFunction ? (await resultFunction(token)) ?? {} : {};
        if (!result.props) result.props = {};

        // Explicitly set permissionDenied to false when access is granted
        result.props.permissionDenied = false;
        result.props.session = token;
        result.props.authStep = 'success';

        console.log('[ADMIN] Authentication successful');
        return result;
    } catch (error) {
        console.error('[ADMIN] Error in getAdminServerSideProps:', error);
        // Instead of redirecting, set permissionDenied and return props
        return {
            props: {
                permissionDenied: true,
                error: error.message,
                authStep: 'error'
            }
        };
    }
};

export const getUserByApiKey = async (apiKey) => {
    const [user, token] = apiKey.split(":"); //schema: username:token
    const result = await prisma.adminApiKeys.findMany({
        where: {
            user: {
                userName: user
            }
        },
        include: {
            user: true
        }
    });
    for (let entry of result) {
        if (await bycrypt.compare(token, entry.key)) return entry.user;
    }
    return null;
};

export const serverAuthenticate = async (
    req: NextApiRequest,
    res: NextApiResponse,
    permission?: Permission,
    sendResponse: boolean = true
) => {
    console.log('serverAuthenticate called:', {
        hasAuthHeader: !!req.headers.authorization,
        hasCookie: !!req.headers.cookie,
        permission: permission
    });

    const apiKey =
        req.headers.authorization?.startsWith("Bearer") ?? null
            ? req.headers.authorization.replace("Bearer ", "")
            : null;
    let user;
    if (apiKey !== null) {
        console.log('Using API key authentication');
        user = await getUserByApiKey(apiKey);
    } else {
        console.log('Using JWT token authentication');
        try {
            const token = await getToken({ 
                req, 
                secret: process.env.NEXTAUTH_SECRET || "fallback-secret-for-development-only"
            });
            console.log('JWT token result:', token ? 'Found token' : 'No token', token ? { email: token.email, hasEmail: !!token.email } : '');
            if (token && token.email) {
                user = { email: token.email };
            }
        } catch (error) {
            console.error('JWT token parsing error:', error.message);
        }
    }
    if (!user) {
        console.log('No user found, authentication failed');
        if (sendResponse) res.status(401).end("Unauthenticated");
        return null;
    }
    console.log('User found:', user.email, 'checking permissions...');
    if (!(await checkPermissions(user.email, permission))) {
        console.log('Permission check failed for user:', user.email);
        if (sendResponse) res.status(401).end("Permission denied");
        return null;
    }
    console.log('Authentication successful for user:', user.email);
    return user;
};

export const generateSecret = () => {
    const bytes = randomBytes(48);
    return bytes.toString('base64');
}

export const formatPrice = (
    price: number,
    currency: string = "GBP",
    locale: string = "en-GB"
): string => {
    return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currency
    }).format(price);
};

export const revalidateBuild = async (res: NextApiResponse, page: string | string[], addLocale: boolean = true) => {
    logger.revalidate(`revalidateBuild called with:`, { page, addLocale, type: typeof page });
    
    if (Array.isArray(page)) {
        logger.revalidate(`Processing array of pages:`, page);
        await Promise.all(page.map(async (a) => await revalidateBuild(res, a)));
        return;
    }
    
    if (addLocale) {
                    logger.revalidate(`Adding locale prefixes for page:`, page);
        const pages = i18nConfig.locales
            .map(locale => (locale === i18nConfig.defaultLocale ? "" : "/" + locale) + page)
            .map(value => value !== "/" ? value.replace(/\/+$/, '') : "/");
        logger.revalidate(`Generated locale pages:`, pages);
        await Promise.all(pages.map(async (a) => await revalidateBuild(res, a, false)))
        return;
    }

    try {
        logger.revalidate(`Attempting to revalidate: ${page}`);
        
        // Skip revalidation for paths that are known to cause issues
        if (page === "/de/events" || page === "/de/payment" || page === "/de/information") {
            logger.revalidate(`Skipping revalidation for problematic path: ${page}`);
            return;
        }
        
        // Handle homepage revalidation (root path)
        if (page === "" || page === "/") {
            // Revalidate homepage for all locales
            logger.revalidate(`Revalidating homepage for all locales`);
            try {
                await res.revalidate("/");
                // Also try locale-specific homepages if they exist
                for (const locale of i18nConfig.locales) {
                    if (locale !== i18nConfig.defaultLocale) {
                        try {
                            await res.revalidate(`/${locale}`);
                        } catch (e) {
                            // Some locales might not have homepage, that's ok
                            logger.revalidate(`Skipped revalidation for /${locale}`);
                        }
                    }
                }
                logger.revalidate(`Successfully revalidated homepage`);
            } catch (e) {
                logger.error(`❌ Failed to revalidate homepage:`, e);
                throw e; // Re-throw so caller knows it failed
            }
            return;
        }
        
        // Skip revalidation for root path with locale prefix as it can cause issues
        if (page === "/de" || page === "/en") {
            logger.revalidate(`Skipping revalidation for root locale path: ${page}`);
            return;
        }
        
        // Skip revalidation for paths that start with locale but don't have a valid page
        if (page.startsWith("/de/") || page.startsWith("/en/")) {
            const pagePath = page.substring(3); // Remove locale prefix
            if (pagePath === "" || pagePath === "/") {
                logger.revalidate(`Skipping revalidation for locale root path: ${page}`);
                return;
            }
        }
        
        // Only revalidate paths that we know exist
        const validPaths = ["/events", "/payment", "/information", "/checkout", "/refund"];
        const pagePath = page.replace(/^\/[a-z]{2}\//, ""); // Remove locale prefix if present
        
        if (!validPaths.includes(pagePath) && 
            !pagePath.startsWith("/seatselection/") && 
            !pagePath.startsWith("/events/")) {
            logger.revalidate(`Skipping revalidation for unknown path: ${page} (pagePath: ${pagePath})`);
            return;
        }
        
        logger.revalidate(`Path ${page} is valid, proceeding with revalidation`);
        await res.revalidate(page);
        logger.revalidate(`Successfully revalidated: ${page}`);
    } catch (e) {
        logger.error(`❌ Failed to revalidate ${page}:`, e);
        // Don't throw the error, but log it clearly for debugging
    }
};

export const revalidateEventPages = async (res, additionalPages: string[]) => {
    const eventDates = await prisma.eventDate.findMany();
    const eventPaths = eventDates.map(eventDate => `/seatselection/${eventDate.id}`);

    await revalidateBuild(res, eventPaths.concat(additionalPages));
};

export const validateOrder = async (tickets: Tickets, eventDateId, reservationId, checkEventBookable: boolean = true, bypassSeatValidation: boolean = false): Promise<[boolean, Tickets]> => {
    logger.debug('validateOrder called with:', {
        ticketsCount: tickets.length,
        eventDateId,
        reservationId,
        checkEventBookable,
        bypassSeatValidation
    });
    
    const eventDate = await prisma.eventDate.findUnique({
        where: {
            id: eventDateId
        },
        select: {
            event: {
                select: {
                    seatType: true,
                    categories: {
                        select: {
                            categoryId: true,
                            maxAmount: true
                        }
                    }
                }
            },
            date: true,
            ticketSaleEndDate: true,
            ticketSaleStartDate: true
        }
    });
    
    // Check if eventDate exists
    if (!eventDate) {
        return [false, tickets];
    }
    
    if (checkEventBookable && !eventDateIsBookable(eventDate)) return [false, tickets];
    
    // Skip seat validation for Stripe flow if bypassSeatValidation is true
    if (!bypassSeatValidation) {
        logger.debug('Running full validation (bypassSeatValidation = false)');
        const seatIds = tickets.filter(ticket => ticket.seatId);
        if (eventDate.event.seatType === "seatMap" && seatIds.length !== tickets.length)
            return [false, tickets.filter(ticket => !ticket.seatId)]; // all tickets of event with seat reservation need a seatId
        if (seatIds.map(ticket => ticket.seatId).some((e, i, arr) => arr.indexOf(e) !== i))
            return [false, tickets.filter((value, index, self) => self.indexOf(value) === index)]; //duplicated seat ids in order

        // check seats not already occupied
        const ticketsOccupied = await isTicketOccupied(eventDateId, tickets, reservationId);
        if (Object.values(ticketsOccupied).length > 0 && Object.values(ticketsOccupied).some(v => v))
            return [false, Object.entries(ticketsOccupied).filter(a => a[1]).map(a => tickets.find(ticket => ticket.seatId === parseInt(a[0])))];

        // Category validation for non-Stripe flows
        const maxTicketAmounts = eventDate.event.categories.reduce((dict, category) => {
            dict[category.categoryId] = category.maxAmount;
            return dict;
        }, {});

        let currentAmounts = await getCategoryTicketAmount(eventDateId, tickets, reservationId);
        let invalidTickets = [];
        for (let ticket of tickets) {
            if (typeof currentAmounts[ticket.categoryId] === "undefined")
                currentAmounts[ticket.categoryId] = 0;
            currentAmounts[ticket.categoryId] += ticket.amount;
            if (isNaN(maxTicketAmounts[ticket.categoryId]) || !maxTicketAmounts[ticket.categoryId] || maxTicketAmounts[ticket.categoryId] === 0)
                continue; // category for this event isn't limited
            if (currentAmounts[ticket.categoryId] > maxTicketAmounts[ticket.categoryId])
                invalidTickets.push(ticket);
        }
        if (eventDate.event.seatType === "free" && invalidTickets.length > 0)
            return [false, invalidTickets];
    } else {
        logger.debug('Skipping validation (bypassSeatValidation = true)');
    }

    logger.debug('Validation passed, returning [true, []]');
    return [true, []];
}

export const getCategoryTicketAmount = async (eventDateId: number, tickets?: Tickets, reservationId?: string): Promise<Record<number, number>> => {
    const categoryIdFilter = tickets !== undefined ? {categoryId: {in: tickets?.map(ticket => ticket.categoryId).filter((value, index, self) => self.indexOf(value) === index)}} : {};
    const reservationIdFilter = reservationId !== undefined ? {reservationId: {not: reservationId}} : {};

    let databaseAmounts = await prisma.ticket.groupBy({
        by: ["categoryId"],
        where: {
            order: {
                eventDateId: eventDateId
            },
            ...categoryIdFilter
        },
        _count: true
    });
    databaseAmounts.push(...(await prisma.seatReservation.groupBy({
        by: ["categoryId"],
        where: {
            eventDateId: eventDateId,
            ...categoryIdFilter,
            ...reservationIdFilter,
            expiresAt: {
                gt: new Date()
            },
        },
        _count: true
    })));

    return databaseAmounts.reduce((dict, element) => {
        if (!dict[element.categoryId]) dict[element.categoryId] = 0;
        dict[element.categoryId] = dict[element.categoryId] + element._count;
        return dict;
    }, {});
}

export const isTicketOccupied = async (eventDateId: number, tickets: Tickets | Ticket, reservationId?: string): Promise<Record<number, boolean>> => {
    if (!Array.isArray(tickets))
        tickets = [tickets];

    if (tickets.length === 0) return {};

    const reservations = await prisma.seatReservation.findMany({
        where: {
            eventDateId: eventDateId,
            expiresAt: {
                gt: new Date()
            },
            ...(reservationId && ({reservationId: {not: reservationId}}))
        }
    });
    const ticketsDb = await prisma.ticket.findMany({
        where: {
            order: {
                eventDateId: eventDateId
            }
        }
    });

    return tickets.reduce((group, ticket) => {
        group[ticket.seatId] = ticketsDb.some(t => t.seatId === ticket.seatId) ||
            reservations.some(reservation => reservation.seatId === ticket.seatId);
        return group;
    }, {});
}

export const getSeatMap = async (eventDateId, withOccupiedMarked, reservationId?): Promise<SeatMap> => {
    const event = await prisma.eventDate.findUnique({
        where: {
            id: eventDateId
        },
        select: {
            event: {
                select: {
                    seatMap: {
                        select: {
                            definition: true
                        }
                    },
                    seatType: true,
                    categories: {
                        select: {
                            category: {
                                select: {
                                    id: true,
                                    price: true
                                }
                            }
                        }
                    }
                }
            }
        }
    });
    if (event.event.seatType !== "seatmap") throw new Error("Event not seatmap!");

    let seatMap: SeatMap = JSON.parse(event.event.seatMap.definition);
    if (withOccupiedMarked) {
        // Create a price lookup map from categories
        const priceMap = event.event.categories.reduce((map, cat) => {
            map[cat.category.id] = cat.category.price;
            return map;
        }, {});
        
        const occupies = await isTicketOccupied(eventDateId, seatMap.flat(2).map(seat => ({
            seatId: seat.id, 
            amount: seat.amount, 
            categoryId: seat.category,
            price: priceMap[seat.category] || 0 // Add price from category lookup
        })), reservationId);
        seatMap = seatMap.map((row) =>
            row.map((seat) => {
                return {
                    ...seat,
                    occupied: occupies[seat.id]
                };
            })
        );
    }
    return seatMap;
}
