export const NEWSLETTER_OPT_IN_FIELD = "_jvsNewsletterOptIn";
export const EVENTS_OPT_IN_FIELD = "_jvsEventsOptIn";

export interface EmailOptIns {
    subscribeNewsletter: boolean;
    subscribeEvents: boolean;
}

export function serializeOrderCustomFields(
    customFields: Record<string, string> | null | undefined,
    optIns: Partial<EmailOptIns> | null | undefined
): string | null {
    const values = {
        ...(customFields || {}),
        [NEWSLETTER_OPT_IN_FIELD]: optIns?.subscribeNewsletter === true ? "true" : "false",
        [EVENTS_OPT_IN_FIELD]: optIns?.subscribeEvents === true ? "true" : "false",
    };

    return JSON.stringify(values);
}

export function parseEmailOptIns(customFields: string | null | undefined): EmailOptIns {
    if (!customFields) {
        return { subscribeNewsletter: false, subscribeEvents: false };
    }

    try {
        const values = JSON.parse(customFields) as Record<string, unknown>;
        return {
            subscribeNewsletter: values[NEWSLETTER_OPT_IN_FIELD] === "true",
            subscribeEvents: values[EVENTS_OPT_IN_FIELD] === "true",
        };
    } catch {
        return { subscribeNewsletter: false, subscribeEvents: false };
    }
}
