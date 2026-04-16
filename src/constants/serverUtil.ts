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
import { randomBytes } from "crypto";
import { logger } from "../lib/logger";
import { checkCapacityForOrder } from "../lib/services/ticketing/availability";

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
    // bcrypt cost 12 is a reasonable 2026 default for admin accounts.
    return await bycrypt.hash(password, 12);
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
    try {
        const token = await getToken({ req: context.req });

        if (!token || !token.email) {
            return {
                redirect: {
                    destination: '/admin/login',
                    permanent: false,
                },
            };
        }

        if (!(await checkPermissions(token.email, permission))) {
            return {
                props: {
                    permissionDenied: true,
                    authStep: 'permission_denied'
                }
            };
        }

        const result = resultFunction ? (await resultFunction(token)) ?? {} : {};
        if (!result.props) result.props = {};

        result.props.permissionDenied = false;
        result.props.session = token;
        result.props.authStep = 'success';

        return result;
    } catch (error) {
        console.error('[ADMIN] Error in getAdminServerSideProps');
        return {
            redirect: {
                destination: '/admin/login',
                permanent: false,
            },
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
    const apiKey =
        req.headers.authorization?.startsWith("Bearer") ?? null
            ? req.headers.authorization.replace("Bearer ", "")
            : null;
    let user;
    if (apiKey !== null) {
        user = await getUserByApiKey(apiKey);
    } else {
        try {
            const secret = process.env.NEXTAUTH_SECRET;
            if (!secret) {
                if (process.env.NODE_ENV === "production") {
                    if (sendResponse) res.status(500).end("Server misconfigured");
                    return null;
                }
                // Dev fallback only — never used in production because of the guard above.
                const token = await getToken({ req, secret: "dev-only-do-not-use-in-production" });
                if (token && token.email) user = { email: token.email };
            } else {
                const token = await getToken({ req, secret });
                if (token && token.email) {
                    user = { email: token.email };
                }
            }
        } catch (error) {
            // Do not log token details or error messages that might echo secrets.
            console.error("[serverAuthenticate] JWT verification failed");
        }
    }
    if (!user) {
        if (sendResponse) res.status(401).end("Unauthenticated");
        return null;
    }
    if (!(await checkPermissions(user.email, permission))) {
        if (sendResponse) res.status(403).end("Permission denied");
        return null;
    }
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
            !pagePath.startsWith("/booking/") && 
            !pagePath.startsWith("/events/")) {
            logger.revalidate(`Skipping revalidation for unknown path: ${page} (pagePath: ${pagePath})`);
            return;
        }

        // /events/[slug] uses getServerSideProps only (see pages/events/[slug].tsx).
        // res.revalidate() expects ISR/static pages and fails with "Invalid response 200".
        const normalizedPath = pagePath.startsWith("/") ? pagePath : `/${pagePath}`;
        if (/^\/events\/.+/.test(normalizedPath)) {
            logger.revalidate(
                `Skipping on-demand revalidate for SSR page /events/[slug] (use MAIN_SITE_REVALIDATE_* for marketing site): ${page}`
            );
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
    const eventPaths = eventDates.map(eventDate => `/booking/${eventDate.id}`);

    await revalidateBuild(res, eventPaths.concat(additionalPages));
};

export type MainSiteEventRevalidateAction =
    | "event_created"
    | "event_updated"
    | "event_deleted";

/**
 * Notify the main marketing site (e.g. jvs.org.uk App Router) to revalidate ISR event pages.
 * Set MAIN_SITE_REVALIDATE_URL and MAIN_SITE_REVALIDATE_SECRET (same secret as that site's REVALIDATION_SECRET).
 */
export async function requestMainSiteEventRevalidation(payload: {
    action: MainSiteEventRevalidateAction;
    eventId: number;
    slug?: string | null;
}): Promise<void> {
    const url = process.env.MAIN_SITE_REVALIDATE_URL?.trim();
    const secret = process.env.MAIN_SITE_REVALIDATE_SECRET?.trim();
    if (!url || !secret) {
        logger.revalidate(
            "Main site event revalidation skipped (MAIN_SITE_REVALIDATE_URL or MAIN_SITE_REVALIDATE_SECRET not set)"
        );
        return;
    }
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                secret,
                action: payload.action,
                eventId: payload.eventId,
                ...(payload.slug ? { slug: payload.slug } : {}),
            }),
        });
        const text = await response.text();
        if (!response.ok) {
            logger.error(
                `Main site revalidation failed: ${response.status} ${text.slice(0, 500)}`
            );
        } else {
            logger.revalidate(
                `Main site revalidation OK (${payload.action} event ${payload.eventId})`
            );
        }
    } catch (e) {
        logger.error("Main site revalidation request error:", e);
    }
}

/**
 * Ticket selection for order validation
 */
export interface TicketSelection {
    eventTicketTypeId: number;
    quantity: number;
}

/**
 * Validation result for order validation
 */
export interface ValidationResult {
    success: boolean;
    error?: string;
    userMessage?: string;
}

/**
 * Validate an order before processing
 * 
 * This function checks:
 * 1. Event date exists
 * 2. Event is bookable (within sale window)
 * 3. Requested ticket types exist and are active
 * 4. Sufficient capacity is available
 */
export const validateOrderNew = async (
    items: TicketSelection[],
    eventDateId: number,
    checkEventBookable: boolean = true
): Promise<ValidationResult> => {
    logger.debug('validateOrderNew called with:', {
        itemsCount: items.length,
        eventDateId,
        checkEventBookable
    });

    // 1. Check event date exists
    const eventDate = await prisma.eventDate.findUnique({
        where: { id: eventDateId }
    });

    if (!eventDate) {
        logger.error(`[validateOrderNew] EventDate ${eventDateId} not found`);
        return {
            success: false,
            error: 'Event date not found',
            userMessage: 'This event is no longer available'
        };
    }

    // 2. Check event is bookable (sale window)
    if (checkEventBookable && !eventDateIsBookable(eventDate)) {
        return {
            success: false,
            error: 'Event not in sale window',
            userMessage: 'Ticket sales are not currently open for this event'
        };
    }

    // 3. Validate ticket types exist and are active
    const requestedTypeIds = Array.from(new Set(items.map(t => t.eventTicketTypeId)));
    const validTypes = await prisma.eventTicketType.findMany({
        where: {
            id: { in: requestedTypeIds },
            eventId: eventDate.eventId,
            isActive: true
        }
    });

    const validTypeIds = new Set(validTypes.map(tt => tt.id));
    const invalidTypes = requestedTypeIds.filter(id => !validTypeIds.has(id));

    if (invalidTypes.length > 0) {
        logger.error(`[validateOrderNew] Invalid ticket types: ${invalidTypes.join(', ')}`);
        return {
            success: false,
            error: `Invalid ticket types: ${invalidTypes.join(', ')}`,
            userMessage: 'Some selected ticket types are no longer available'
        };
    }

    // 4. Check capacity using centralized availability
    const capacityCheck = await checkCapacityForOrder(eventDateId, items);
    if (!capacityCheck.success) {
        const errorMessage = 'error' in capacityCheck ? capacityCheck.error : 'Capacity check failed';
        logger.error(`[validateOrderNew] Capacity check failed: ${errorMessage}`);
        return {
            success: false,
            error: errorMessage,
            userMessage: errorMessage
        };
    }

    logger.debug('validateOrderNew passed');
    return { success: true };
};

/**
 * Legacy validateOrder function - REMOVED
 * @deprecated This function is no longer available. Use validateOrderNew instead.
 * 
 * This function was removed because:
 * 1. It accepted a Redux Ticket[] format that doesn't match the modern EventTicketType system
 * 2. It returned tickets in a format incompatible with Prisma's Ticket model
 * 3. All callers should use validateOrderNew which works with TicketSelection[]
 */
export const validateOrder = async (_tickets: Tickets, _eventDateId: number, _reservationId: string | null, _checkEventBookable: boolean = true, _bypassSeatValidation: boolean = false): Promise<[boolean, Tickets]> => {
    throw new Error(
        'validateOrder is deprecated and has been removed. ' +
        'Use validateOrderNew with TicketSelection[] format instead. ' +
        'See /api/admin/orders/create-with-ticket-types for the correct implementation.'
    );
}

// getCategoryTicketAmount was removed - use computeAvailability from availability service instead
