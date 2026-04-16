import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "../../../../lib/prisma";
import { getUserByApiKey } from "../../../../constants/serverUtil";
import { compare } from "bcryptjs";

const isDev = process.env.NODE_ENV !== "production";

// Fail fast in production if the JWT secret is missing — never fall back to a
// hard-coded value.
const nextauthSecret = process.env.NEXTAUTH_SECRET;
if (!nextauthSecret) {
    if (isDev) {
        console.warn(
            "[NextAuth] NEXTAUTH_SECRET is not set; using a development-only fallback."
        );
    } else {
        throw new Error(
            "NEXTAUTH_SECRET must be set in production. Refusing to start with an insecure default."
        );
    }
}

export default NextAuth({
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60
    },
    secret: nextauthSecret || "dev-only-do-not-use-in-production",
    debug: isDev,
    pages: {
        signIn: '/admin/login'
    },
    callbacks: {
        async session({ session, token }) {
            if (token) {
                session.user = {
                    name: token.name,
                    email: token.email
                };
            }
            return session;
        },
        async jwt({ token, user }) {
            if (user) {
                token.name = user.name;
                token.email = user.email;
            }
            return token;
        }
    },
    providers: [
        CredentialsProvider({
            name: "email",
            id: "login",
            credentials: {
                email: { label: "E-Mail", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                try {
                    const user = await prisma.adminUser.findUnique({
                        where: { email: credentials.email }
                    });

                    if (!user) {
                        return null;
                    }

                    const checkPassword = await compare(
                        credentials.password,
                        user.password
                    );

                    if (!checkPassword) {
                        return null;
                    }

                    return {
                        id: user.id.toString(),
                        name: user.userName,
                        email: user.email
                    };
                } catch (error) {
                    console.error('[NextAuth] Authentication error');
                    return null;
                }
            }
        }),
        CredentialsProvider({
            name: "api",
            id: "apiKey",
            credentials: {
                key: { label: "Api-Key", type: "text" }
            },
            async authorize(credentials, req) {
                const user = await getUserByApiKey(
                    credentials.key ?? req.headers["api-key"]
                );
                if (!user) return null;
                return {
                    id: user.id.toString(),
                    name: user.userName,
                    email: user.email
                };
            }
        })
    ]
});
