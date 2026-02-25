import { NextApiRequest, NextApiResponse } from "next";
import {
    serverAuthenticate
} from "../../../../constants/serverUtil";
import { PermissionSection, PermissionType } from "../../../../constants/interfaces";
import { getOption, setOption } from "../../../../lib/options";
import prisma from "../../../../lib/prisma";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const user = await serverAuthenticate(req, res, {
        permission: PermissionSection.Options,
        permissionType: PermissionType.Read
    });
    if (!user) return;

    if (req.method === "GET") {
        const { key } = req.query;
        if (!key) {
            res.status(400).end("Please provide an option key!");
            return;
        }
        
        try {
            // Use the standard getOption function which handles parsing correctly
            const value = await getOption(key as any);
            res.status(200).json({ value: value });
        } catch (error) {
            console.error('Error getting option:', error);
            res.status(500).json({ error: 'Failed to get option' });
        }
        return;
    }

    if (req.method === "POST") {
        const { key, value } = req.body;
        if (!key) {
            res.status(400).end("Please provide an option key!");
            return;
        }
        await setOption(key, value, res);
        res.status(200).end("Updated");
        return;
    }

    res.status(400).end("Method not allowed");
}
