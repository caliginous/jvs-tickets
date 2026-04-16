import { PrismaClient } from "@prisma/client";

/**
 * Safely merge connection parameters into the DATABASE_URL. Concatenating
 * "?connection_limit=..." onto a URL that already has query params (e.g. Neon's
 * `?sslmode=require`) produces a malformed URL — this helper uses `URL.searchParams`
 * so existing params are preserved.
 */
function buildDatabaseUrl(baseUrl: string, overrides: Record<string, string>): string {
    try {
        const url = new URL(baseUrl);
        for (const [key, value] of Object.entries(overrides)) {
            if (!url.searchParams.has(key)) {
                url.searchParams.set(key, value);
            }
        }
        return url.toString();
    } catch {
        // If DATABASE_URL isn't a parseable URL (unlikely), fall back to the raw value.
        return baseUrl;
    }
}

declare global {
    // eslint-disable-next-line no-var
    var prisma: PrismaClient | undefined;
}

const databaseUrl = buildDatabaseUrl(process.env.DATABASE_URL ?? "", {
    connection_limit: process.env.NODE_ENV === "production" ? "20" : "10",
    pool_timeout: "20",
});

function createClient(): PrismaClient {
    return new PrismaClient({
        log: process.env.NODE_ENV === "production" ? ["error", "warn"] : ["error", "warn"],
        datasources: {
            db: { url: databaseUrl },
        },
    });
}

/**
 * Singleton Prisma client. Cached on `globalThis` so hot-reloaded dev servers do not
 * leak connections, and so every module in the app shares one pool on Vercel.
 */
const prisma: PrismaClient = global.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
    global.prisma = prisma;
}

export default prisma;
