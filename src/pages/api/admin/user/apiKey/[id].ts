import { NextApiRequest, NextApiResponse } from "next";
import { serverAuthenticate } from "../../../../../constants/serverUtil";
import { PermissionSection, PermissionType } from "../../../../../constants/interfaces";
import prisma from "../../../../../lib/prisma";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const user = await serverAuthenticate(req, res, {
        permission: PermissionSection.UserManagement,
        permissionType: PermissionType.Write
    });
    if (!user) return;
    const { id } = req.query;
    const apiKey = await prisma.adminApiKeys.findUnique({
        where: {
            id: parseInt(id as string)
        },
        include: {
            user: true
        }
    });

    if (!apiKey || user.email !== apiKey.user.email) {
        res.status(404).end("API key not found");
        return;
    }

    if (req.method === "DELETE") {
        await prisma.adminApiKeys.delete({
            where: {
                id: parseInt(id as string)
            }
        });
        res.status(200).end("Deleted");
        return;
    }

    res.status(400).end("Method unsupported");
}
