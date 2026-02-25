import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "../../../../lib/prisma";
import { getUserByApiKey } from "../../../../constants/serverUtil";
import { compare } from "bcryptjs";

export default NextAuth({
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60
    },
    secret: process.env.NEXTAUTH_SECRET || "fallback-secret-for-development-only",
    debug: true, // Enable debug logging in production to diagnose auth issues
    pages: {
        signIn: '/admin/login'
    },
    callbacks: {
        async session({ session, token }) {
            // Ensure user object is properly passed to client
            if (token) {
                session.user = {
                    name: token.name,
                    email: token.email
                };
            }
            return session;
        },
        async jwt({ token, user }) {
            // Ensure user data is stored in token
            if (user) {
                token.name = user.name;
                token.email = user.email;
            }
            
            // Add debug logging for JWT issues
            if (process.env.NODE_ENV === 'development') {
                console.log('JWT callback:', { hasUser: !!user, tokenEmail: token.email });
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
            async authorize(credentials, req) {
                try {
                    console.log('[NextAuth] Authorize called for email:', credentials.email);
                    
                    const user = await prisma.adminUser.findUnique({
                        where: {
                            email: credentials.email
                        }
                    });

                    if (!user) {
                        console.log('[NextAuth] ❌ User not found:', credentials.email);
                        return null;
                    }

                    console.log('[NextAuth] ✅ User found:', user.email, 'ID:', user.id);

                    const checkPassword = await compare(
                        credentials.password,
                        user.password
                    );
                    
                    if (!checkPassword) {
                        console.log('[NextAuth] ❌ Password mismatch for user:', credentials.email);
                        return null;
                    }

                    console.log('[NextAuth] ✅ Password verified for:', credentials.email);

                    const result = {
                        id: user.id.toString(),
                        name: user.userName,
                        email: user.email
                    };
                    
                    console.log('[NextAuth] ✅ Returning user object:', result);
                    return result;
                } catch (error) {
                    console.error('[NextAuth] ❌ Authentication error:', error);
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
                }
            }
        })
    ]
});
