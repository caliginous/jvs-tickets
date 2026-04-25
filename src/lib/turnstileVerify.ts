/**
 * Cloudflare Turnstile server-side verification.
 * When both NEXT_PUBLIC_TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY are set, callers must pass a valid token.
 */

export function getTurnstileConfig(): { enabled: boolean; siteKey: string; secret: string } {
    const siteKey = (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "").trim();
    const secret = (process.env.TURNSTILE_SECRET_KEY || "").trim();
    if (!siteKey && !secret) {
        return { enabled: false, siteKey: "", secret: "" };
    }
    if (!siteKey || !secret) {
        return { enabled: false, siteKey, secret };
    }
    return { enabled: true, siteKey, secret };
}

export async function verifyTurnstileToken(token: string | undefined, secret: string): Promise<boolean> {
    if (!secret || !token) {
        return false;
    }
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, response: token }),
    });
    const result = await response.json();
    return result.success === true;
}
