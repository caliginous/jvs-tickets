import { NextApiRequest, NextApiResponse } from "next";
import { sendNotifications } from "../../../../lib/notifications/notifications";
import { serverAuthenticate } from "../../../../constants/serverUtil";
import { PermissionSection, PermissionType } from "../../../../constants/interfaces";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== "POST") return res.status(405).end("Method not allowed");

    const actor = await serverAuthenticate(req, res, {
        permission: PermissionSection.UserManagement,
        permissionType: PermissionType.Write
    });
    if (!actor) return;

    let payload: unknown;
    try {
        payload = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    } catch {
        return res.status(400).end("Invalid JSON body");
    }

    if (!payload || typeof payload !== "object") {
        return res.status(400).end("Invalid payload");
    }

    try {
        await sendNotifications(payload as any);
        return res.status(200).end("Notifications sent");
    } catch (error) {
        console.error("[notifications/send] error:", error);
        return res.status(500).end("Failed to send notifications");
    }
}
