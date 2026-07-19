import prisma from "../prisma";
import { parseEmailOptIns } from "../newsletterOptIn";

const CONFIRMED_ORDER_STATUSES = new Set(["PAID", "CONFIRMED"]);

export async function subscribeConfirmedOrderToMailingLists(orderId: string): Promise<void> {
    const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { user: true },
    });

    if (!order || !CONFIRMED_ORDER_STATUSES.has(order.status)) {
        return;
    }

    const optIns = parseEmailOptIns(order.customFields);
    if (!optIns.subscribeNewsletter && !optIns.subscribeEvents) {
        return;
    }

    const secret = process.env.MAIN_SITE_REVALIDATE_SECRET?.trim();
    const url = (
        process.env.MAIN_SITE_NEWSLETTER_URL ||
        "https://www.jvs.org.uk/api/newsletter/ticket-purchase"
    ).trim();

    if (!secret) {
        console.error(
            `[newsletter] Subscription skipped for order ${orderId}: MAIN_SITE_REVALIDATE_SECRET is not configured`
        );
        return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${secret}`,
            },
            body: JSON.stringify({
                email: order.user.email,
                subscribeNewsletter: optIns.subscribeNewsletter,
                subscribeEvents: optIns.subscribeEvents,
                orderId: order.id,
                eventDateId: order.eventDateId,
            }),
            signal: controller.signal,
        });

        if (!response.ok) {
            const responseText = await response.text().catch(() => "");
            console.error(
                `[newsletter] Subscription failed for order ${orderId}: ${response.status} ${responseText.slice(0, 200)}`
            );
            return;
        }

        console.log(`[newsletter] Subscription request completed for order ${orderId}`);
    } catch (error) {
        console.error(`[newsletter] Subscription request failed for order ${orderId}:`, error);
    } finally {
        clearTimeout(timer);
    }
}
