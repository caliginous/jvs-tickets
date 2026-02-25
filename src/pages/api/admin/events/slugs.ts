import { NextApiRequest, NextApiResponse } from "next";
import {
    serverAuthenticate
} from "../../../../constants/serverUtil";
import prisma from "../../../../lib/prisma";
import { PermissionSection, PermissionType } from "../../../../constants/interfaces";
import { generateEventSlug, isValidSlug } from "../../../../utils/slug";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const user = await serverAuthenticate(req, res, {
        permission: PermissionSection.EventManagement,
        permissionType: PermissionType.Write
    });
    if (!user) return;

    if (req.method === "POST") {
        const { action, eventId, slug } = req.body;

        try {
            switch (action) {
                case "generate-missing": {
                    // Generate slugs for all events that don't have one
                    console.log("🔧 Generating slugs for events without slugs...");

                    const eventsWithoutSlugs = await prisma.event.findMany({
                        where: { slug: null },
                        select: { id: true, title: true }
                    });

                    console.log(`📊 Found ${eventsWithoutSlugs.length} events without slugs`);

                    const results = [];
                    for (const event of eventsWithoutSlugs) {
                        try {
                            const newSlug = await generateEventSlug(event.title, event.id);
                            await prisma.event.update({
                                where: { id: event.id },
                                data: { slug: newSlug }
                            });
                            results.push({
                                eventId: event.id,
                                title: event.title,
                                slug: newSlug,
                                success: true
                            });
                        } catch (error) {
                            console.error(`❌ Failed to generate slug for event ${event.id}:`, error);
                            results.push({
                                eventId: event.id,
                                title: event.title,
                                success: false,
                                error: error.message
                            });
                        }
                    }

                    return res.status(200).json({
                        message: `Processed ${eventsWithoutSlugs.length} events`,
                        results,
                        successCount: results.filter(r => r.success).length,
                        errorCount: results.filter(r => !r.success).length
                    });
                }

                case "regenerate": {
                    if (!eventId) {
                        return res.status(400).json({ error: "eventId is required for regenerate action" });
                    }

                    console.log(`🔄 Regenerating slug for event ${eventId}`);

                    const event = await prisma.event.findUnique({
                        where: { id: parseInt(eventId.toString()) },
                        select: { id: true, title: true, slug: true }
                    });

                    if (!event) {
                        return res.status(404).json({ error: "Event not found" });
                    }

                    const newSlug = await generateEventSlug(event.title, event.id);
                    await prisma.event.update({
                        where: { id: event.id },
                        data: { slug: newSlug }
                    });

                    return res.status(200).json({
                        message: "Slug regenerated successfully",
                        eventId: event.id,
                        oldSlug: event.slug,
                        newSlug
                    });
                }

                case "update": {
                    if (!eventId || !slug) {
                        return res.status(400).json({ error: "eventId and slug are required for update action" });
                    }

                    if (!isValidSlug(slug)) {
                        return res.status(400).json({ error: "Invalid slug format. Slug must be lowercase letters, numbers, and hyphens only." });
                    }

                    console.log(`🔄 Updating slug for event ${eventId} to: ${slug}`);

                    // Check if slug is already taken by another event
                    const existingEvent = await prisma.event.findFirst({
                        where: {
                            slug,
                            id: { not: parseInt(eventId.toString()) }
                        }
                    });

                    if (existingEvent) {
                        return res.status(409).json({ error: "Slug already exists for another event" });
                    }

                    const event = await prisma.event.findUnique({
                        where: { id: parseInt(eventId.toString()) },
                        select: { id: true, title: true, slug: true }
                    });

                    if (!event) {
                        return res.status(404).json({ error: "Event not found" });
                    }

                    await prisma.event.update({
                        where: { id: event.id },
                        data: { slug }
                    });

                    return res.status(200).json({
                        message: "Slug updated successfully",
                        eventId: event.id,
                        oldSlug: event.slug,
                        newSlug: slug
                    });
                }

                default:
                    return res.status(400).json({ error: "Invalid action. Use 'generate-missing', 'regenerate', or 'update'" });
            }
        } catch (error) {
            console.error("❌ Error in slug management:", error);
            return res.status(500).json({
                error: "Failed to process slug operation",
                details: error.message
            });
        }
    }

    if (req.method === "GET") {
        try {
            // Get slug status for all events
            const events = await prisma.event.findMany({
                select: {
                    id: true,
                    title: true,
                    slug: true
                },
                orderBy: { id: 'desc' }
            });

            const stats = {
                total: events.length,
                withSlug: events.filter(e => e.slug).length,
                withoutSlug: events.filter(e => !e.slug).length,
                events: events.map(e => ({
                    id: e.id,
                    title: e.title,
                    slug: e.slug,
                    hasSlug: !!e.slug
                }))
            };

            return res.status(200).json(stats);
        } catch (error) {
            console.error("❌ Error getting slug stats:", error);
            return res.status(500).json({
                error: "Failed to get slug statistics",
                details: error.message
            });
        }
    }

    res.status(405).end("Method not allowed");
}













