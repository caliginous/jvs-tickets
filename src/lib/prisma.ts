import { PrismaClient } from "@prisma/client";

let prisma: PrismaClient;

if (process.env.NODE_ENV === "production") {
    // Optimize for serverless environments with connection pool settings
    prisma = new PrismaClient({
        log: ['error', 'warn'],
        datasources: {
            db: {
                url: process.env.DATABASE_URL + "?connection_limit=20&pool_timeout=20",
            },
        },
    });
} else {
    if (!global.prisma) {
        global.prisma = new PrismaClient({
            log: ['query', 'info', 'warn', 'error'],
            datasources: {
                db: {
                    url: process.env.DATABASE_URL + "?connection_limit=10&pool_timeout=20",
                },
            },
        });
    }
    prisma = global.prisma;
}

export default prisma;
