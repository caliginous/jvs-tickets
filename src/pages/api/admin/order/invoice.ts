import { NextApiRequest, NextApiResponse } from "next";
import { getStaticAssetFile, serverAuthenticate } from "../../../../constants/serverUtil";
import { PermissionSection, PermissionType } from "../../../../constants/interfaces";
import prisma from "../../../../lib/prisma";
import { generateInvoice } from "../../../../lib/invoice";
import { getOptionData } from "../../../../lib/options";
import { Options } from "../../../../constants/Constants";
import PDFMerger from "pdf-merger-js";

/**
 * Bulk invoice PDF endpoint.
 *
 * Previously this called `prisma.order.findMany()` with no `take` / `where`,
 * generating an invoice for every order in the entire database and merging them
 * all in memory — a guaranteed OOM + timeout at any real scale.
 *
 * The admin UI (`src/pages/admin/orders.tsx`) passes its current filter object
 * through to this endpoint unchanged, so the hard requirement here is to keep the
 * response shape (data:application/pdf;base64 string) compatible. We preserve that
 * and only add:
 *
 *   1) a MAX_BATCH cap on the number of orders merged,
 *   2) a filter allowlist so we don't blindly pass arbitrary query params into
 *      Prisma's `where` (which would allow field probing / enumeration),
 *   3) a minimum-filter check when running in production.
 */
const MAX_BATCH = 100;

function parseDate(v: unknown): Date | null {
    if (typeof v !== "string" || !v) return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
}

function parseIntArray(v: unknown): string[] {
    if (typeof v !== "string" || !v) return [];
    return v
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const user = await serverAuthenticate(req, res, {
        permission: PermissionSection.Orders,
        permissionType:
            req.method === "GET" ? PermissionType.Read : PermissionType.Write,
    });
    if (!user) return;

    if (req.method !== "GET") {
        return res.status(405).end("Method not allowed");
    }

    try {
        // Build a whitelisted Prisma `where` from query params.
        const where: Record<string, unknown> = {};

        if (typeof req.query.status === "string" && req.query.status) {
            where.status = req.query.status;
        }
        if (typeof req.query.paymentType === "string" && req.query.paymentType) {
            where.paymentType = req.query.paymentType;
        }
        const ids = parseIntArray(req.query.ids);
        if (ids.length > 0) {
            where.id = { in: ids.slice(0, MAX_BATCH) };
        }
        const from = parseDate(req.query.from);
        const to = parseDate(req.query.to);
        const day = parseDate(req.query.date);
        if (day) {
            const start = new Date(day);
            start.setHours(0, 0, 0, 0);
            const end = new Date(day);
            end.setHours(23, 59, 59, 999);
            where.date = { gte: start, lte: end };
        } else if (from || to) {
            where.date = {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
            };
        }
        if (typeof req.query.eventDateId === "string" && req.query.eventDateId) {
            const n = parseInt(req.query.eventDateId, 10);
            if (!isNaN(n)) where.eventDateId = n;
        }

        // Require at least one scoping filter so an accidental clickthrough cannot
        // pull every order in the DB.
        const hasFilter = Object.keys(where).length > 0;
        if (!hasFilter) {
            return res
                .status(400)
                .json({ error: "At least one filter is required (status, date, ids, eventDateId...)" });
        }

        const orders = await prisma.order.findMany({
            where: where as any,
            orderBy: { date: "asc" },
            take: MAX_BATCH,
            select: { id: true },
        });

        if (orders.length === 0) {
            return res.status(404).json({ error: "No orders match filter" });
        }

        const template = (
            await getOptionData(
                Options.TemplateInvoice,
                getStaticAssetFile("invoice/template.html", "utf-8")
            )
        ).data;

        const merger = new PDFMerger();
        for (const order of orders) {
            const invoiceData = await generateInvoice(order.id, template, "GBP");
            const buf = invoiceData instanceof Buffer ? invoiceData : Buffer.from(invoiceData);
            await merger.add(buf);
        }
        const mergedPdf = await merger.saveAsBuffer();
        const dataUrl = "data:application/pdf;base64," + mergedPdf.toString("base64");
        return res.status(200).send(dataUrl);
    } catch (error) {
        console.error("[admin/order/invoice] error:", error);
        return res.status(500).json({ error: "Failed to generate invoices" });
    }
}
