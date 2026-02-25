import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.status(200).json({ ok: true });
    } catch (e: any) {
        console.error('health check failed', e?.message);
        res.status(500).json({ ok: false, error: e?.message });
    }
}
