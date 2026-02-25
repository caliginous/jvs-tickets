import { NextApiRequest, NextApiResponse } from "next";
import {
    revalidateBuild,
    serverAuthenticate
} from "../../../../constants/serverUtil";
import prisma from "../../../../lib/prisma";
import { PermissionSection, PermissionType } from "../../../../constants/interfaces";
import { IncomingForm } from 'formidable';
import fs from "fs";
import { v4 as uuid } from 'uuid';

const UPLOAD_FOLDER = "coverImages";

const deleteExisting = async (event) => {
    if (!event.coverImage) return;
    if (!fs.existsSync("public" + event.coverImage)) return;
    await fs.promises.unlink("public" + event.coverImage);
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
    
    console.log(`📸 Cover image API called with:`, {
        method: req.method,
        eventId,
        eventIdType: typeof eventId,
        queryParams: req.query
    });
    
    if (!eventId) {
        console.error(`📸 Missing eventId in request`);
        res.status(400).json({ error: "Event ID is required" });
        return;
    }
    
    const eventIdInt = parseInt(eventId as string);
    if (isNaN(eventIdInt)) {
        console.error(`📸 Invalid eventId: ${eventId}`);
        res.status(400).json({ error: "Invalid event ID" });
        return;
    }
    
    console.log(`📸 Looking for event with ID: ${eventIdInt}`);
    
    const event = await prisma.event.findUnique({
        where: {
            id: eventIdInt
        }
    });

    if (!event) {
        console.error(`📸 Event not found with ID: ${eventIdInt}`);
        res.status(404).end("Event not found");
        return;
    }
    
    console.log(`📸 Found event: ${event.title} (ID: ${event.id})`)

    if (req.method === "DELETE") {
        await deleteExisting(event);
        await prisma.event.update({
            where: {
                id: eventIdInt
            },
            data: {
                coverImage: null
            }
        });
        await revalidateBuild(res, "");
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
        console.log(`📸 Starting cover image upload for event ${eventIdInt}`);
        
        try {
            await deleteExisting(event);
            console.log(`📸 Deleted existing cover image if present`);
            
            const data: {fields, files} = await new Promise((resolve, reject) => {
                const form = new IncomingForm();
                form.parse(req, (err, fields, files) => {
                    if (err) {
                        console.error(`📸 Form parsing error:`, err);
                        return reject(err);
                    }
                    console.log(`📸 Form parsed successfully. Files:`, Object.keys(files));
                    resolve({ fields, files });
                });
            });

            const imageFile = data.files.coverImage;
            if (!imageFile) {
                console.error(`📸 No coverImage file found in upload`);
                res.status(400).json({ error: "No cover image file provided" });
                return;
            }

            console.log(`📸 Processing image file:`, {
                originalFilename: imageFile.originalFilename,
                mimetype: imageFile.mimetype,
                size: imageFile.size
            });

            let extension = imageFile.originalFilename.split(".");
            extension = extension[extension.length - 1];
            const imageFilename = uuid() + "." + extension;

            // Read uploaded file and store as data URL (serverless-friendly)
            const image = await fs.promises.readFile(imageFile.filepath);
            const dataUrl = `data:${imageFile.mimetype};base64,${Buffer.from(image as any).toString("base64")}`;
            
            console.log(`📸 Created data URL, length: ${dataUrl.length}`);
            
            await prisma.event.update({
                where: { id: eventIdInt },
                data: { coverImage: dataUrl }
            });
            
            console.log(`📸 Updated event ${eventIdInt} with cover image`);
            
            await fs.promises.unlink(imageFile.filepath);
            console.log(`📸 Cleaned up temp file`);
            
            await revalidateBuild(res, "");
            console.log(`📸 Cover image upload completed successfully for event ${eventIdInt}`);
            
            res.status(200).end("Cover image stored successfully!");
            return;
        } catch (error) {
            console.error(`📸 Cover image upload failed for event ${eventIdInt}:`, error);
            res.status(500).json({ 
                error: "Failed to upload cover image", 
                details: error.message 
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
