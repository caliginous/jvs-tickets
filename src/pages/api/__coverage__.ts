import { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    // Only allow in development
    if (process.env.NODE_ENV !== "development") {
        res.status(404).end("Not Found");
        return;
    }
    
    if (req.method !== "GET") {
        res.setHeader("Allow", "GET");
        res.status(405).end("Method Not Allowed");
        return;
    }
    
    res.status(200).json({
        coverage: global.__coverage__ || null
    });
}
