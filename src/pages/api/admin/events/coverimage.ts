import { NextApiRequest, NextApiResponse } from "next";
import {
    revalidateBuild,
    requestMainSiteEventRevalidation,
    serverAuthenticate
} from "../../../../constants/serverUtil";
import prisma from "../../../../lib/prisma";
import { PermissionSection, PermissionType } from "../../../../constants/interfaces";
import { IncomingForm } from 'formidable';
import fs from "fs";
import { put, del } from '@vercel/blob';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB

/**
 * Inspect magic bytes to determine image type. Returns { mime, ext } if the buffer is
 * a supported image type; returns null otherwise. Never trusts client-supplied
 * MIME or file extension.
 */
function detectImageType(buf: Buffer): { mime: string; ext: string } | null {
    if (buf.length < 12) return null;
    // JPEG: FF D8 FF
    if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
        return { mime: "image/jpeg", ext: "jpg" };
    }
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
        buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
        buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
    ) {
        return { mime: "image/png", ext: "png" };
    }
    // GIF: 47 49 46 38 37/39 61
    if (
        buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38 &&
        (buf[4] === 0x37 || buf[4] === 0x39) && buf[5] === 0x61
    ) {
        return { mime: "image/gif", ext: "gif" };
    }
    // WebP: RIFF....WEBP
    if (
        buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
        buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
    ) {
        return { mime: "image/webp", ext: "webp" };
    }
    return null;
}

function isVercelBlobUrl(url: string): boolean {
    try {
        const host = new URL(url).hostname;
        return host.endsWith(".blob.vercel-storage.com");
    } catch {
        return false;
    }
}

/** Remove a stored cover asset (Vercel Blob or legacy file under /public). */
async function deleteCoverImageAsset(coverImage: string | null | undefined): Promise<void> {
    if (!coverImage) return;

    if (isVercelBlobUrl(coverImage)) {
        try {
            await del(coverImage);
            console.log(`[coverimage] Deleted blob: ${coverImage}`);
        } catch (error: any) {
            console.warn(`[coverimage] Could not delete blob (may not exist): ${error?.message ?? error}`);
        }
        return;
    }

    const localPath = coverImage.startsWith("/") ? `public${coverImage}` : `public/${coverImage}`;
    if (!fs.existsSync(localPath)) return;
    await fs.promises.unlink(localPath);
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const user = await serverAuthenticate(req, res, {
        permission: PermissionSection.EventManagement,
        permissionType: PermissionType.Write
    });
    if (!user) return;

    const { eventId } = req.query;

    console.log(`[coverimage] API called with:`, {
        method: req.method,
        eventId,
        eventIdType: typeof eventId,
        queryParams: req.query
    });

    if (!eventId) {
        console.error(`[coverimage] Missing eventId in request`);
        res.status(400).json({ error: "Event ID is required" });
        return;
    }

    const eventIdInt = parseInt(eventId as string);
    if (isNaN(eventIdInt)) {
        console.error(`[coverimage] Invalid eventId: ${eventId}`);
        res.status(400).json({ error: "Invalid event ID" });
        return;
    }

    console.log(`[coverimage] Looking for event with ID: ${eventIdInt}`);

    const event = await prisma.event.findUnique({
        where: {
            id: eventIdInt
        }
    });

    if (!event) {
        console.error(`[coverimage] Event not found with ID: ${eventIdInt}`);
        res.status(404).end("Event not found");
        return;
    }

    console.log(`[coverimage] Found event: ${event.title} (ID: ${event.id})`);

    if (req.method === "DELETE") {
        await deleteCoverImageAsset(event.coverImage);
        await prisma.event.update({
            where: {
                id: eventIdInt
            },
            data: {
                coverImage: null
            }
        });
        await revalidateBuild(res, "");
        await requestMainSiteEventRevalidation({
            action: "event_updated",
            eventId: eventIdInt,
            slug: event.slug,
        });
        res.status(200).end("Deleted");
        return;
    }

    if (req.method === "PUT") {
        const { coverImageSize } = req.query;
        await prisma.event.update({
            where: {
                id: eventIdInt
            },
            data: {
                coverImageSize: coverImageSize === "null" ? null : parseInt(coverImageSize as string)
            }
        });
        await revalidateBuild(res, "");
        res.status(200).end("Cover Image size stored!");

        return;
    }

    if (req.method === "POST") {
        console.log(`[coverimage] Starting cover image upload for event ${eventIdInt}`);

        try {
            // Upload and persist the new URL before deleting the old asset. Deleting first
            // leaves /api/events returning the previous URL while the blob is gone -> broken images.
            const previousCoverUrl = event.coverImage;

            const data: { fields: any; files: any } = await new Promise((resolve, reject) => {
                const form = new IncomingForm();
                form.parse(req, (err, fields, files) => {
                    if (err) {
                        console.error(`[coverimage] Form parsing error:`, err);
                        return reject(err);
                    }
                    console.log(`[coverimage] Form parsed successfully. Files:`, Object.keys(files));
                    resolve({ fields, files });
                });
            });

            const imageFile = data.files.coverImage;
            if (!imageFile) {
                console.error(`[coverimage] No coverImage file found in upload`);
                res.status(400).json({ error: "No cover image file provided" });
                return;
            }

            // Size cap first — don't load pathological uploads into memory.
            if (typeof imageFile.size === "number" && imageFile.size > MAX_IMAGE_BYTES) {
                await fs.promises.unlink(imageFile.filepath).catch(() => {});
                res.status(413).json({ error: "Image too large (max 8 MB)" });
                return;
            }

            const image = await fs.promises.readFile(imageFile.filepath);
            if (image.length > MAX_IMAGE_BYTES) {
                await fs.promises.unlink(imageFile.filepath).catch(() => {});
                res.status(413).json({ error: "Image too large (max 8 MB)" });
                return;
            }

            // Trust magic bytes only, never the client-supplied MIME or filename extension.
            const detected = detectImageType(image);
            if (!detected) {
                await fs.promises.unlink(imageFile.filepath).catch(() => {});
                res.status(400).json({ error: "Unsupported image format. Use JPEG, PNG, GIF, or WebP." });
                return;
            }

            console.log(`[coverimage] Processing image: detected=${detected.mime} size=${image.length}`);

            const filename = `events/cover-images/${eventIdInt}-${event.slug || 'event'}-${Date.now().toString(16)}.${detected.ext}`;

            const blob = await put(filename, image, {
                access: 'public',
                contentType: detected.mime,
            });

            console.log(`[coverimage] Uploaded to blob storage: ${blob.url}`);

            await prisma.event.update({
                where: { id: eventIdInt },
                data: { coverImage: blob.url }
            });

            console.log(`[coverimage] Updated event ${eventIdInt} with cover image URL`);

            if (previousCoverUrl && previousCoverUrl !== blob.url) {
                await deleteCoverImageAsset(previousCoverUrl);
            }

            await fs.promises.unlink(imageFile.filepath);
            console.log(`[coverimage] Cleaned up temp file`);

            await revalidateBuild(res, "");
            await requestMainSiteEventRevalidation({
                action: "event_updated",
                eventId: eventIdInt,
                slug: event.slug,
            });
            console.log(`[coverimage] Cover image upload completed successfully for event ${eventIdInt}`);

            res.status(200).json({
                success: true,
                url: blob.url,
                message: "Cover image stored successfully!"
            });
            return;
        } catch (error: any) {
            console.error(`[coverimage] Cover image upload failed for event ${eventIdInt}:`, error);
            res.status(500).json({
                error: "Failed to upload cover image",
                details: error?.message ?? String(error)
            });
            return;
        }
    }

    res.status(400).end("Method unsupported");
}

export const config = {
    api: {
        bodyParser: false,
    }
};
