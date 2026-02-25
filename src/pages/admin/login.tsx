import LoginForm from "../../components/admin/LoginForm";
import { getCsrfToken, getSession, signIn } from "next-auth/react";
import { useRouter } from "next/router";
import { useState } from "react";
import prisma from "../../lib/prisma";
import { showToast } from "../../ui";
import { ManageUserDialog } from "../../components/admin/dialogs/ManageUserDialog";
import { Button } from "../../ui";

export default function Login({ noUser }) {
    const router = useRouter();
    const [addUserOpen, setAddUserOpen] = useState(false);

    const handleLogIn = async (email, password) => {
        try {
            console.log('[LOGIN] Calling signIn with provider "login"...');
            console.log('[LOGIN] Email:', email);
            console.log('[LOGIN] NEXTAUTH_PATH:', process.env.NEXT_PUBLIC_NEXTAUTH_PATH);
            
            const result = await signIn("login", {
                redirect: false,
                email: email,
                password: password
            });
            
            console.log('[LOGIN] signIn result:', result);
            
            if (result?.error) {
                console.error('[LOGIN] Error from signIn:', result.error);
                throw new Error("Username/Password wrong");
            }
            
            if (!result?.ok) {
                console.error('[LOGIN] signIn not ok:', result);
                throw new Error("Login failed");
            }
            
            console.log('[LOGIN] Login successful, redirecting...');
            
            // Track admin login
            if (typeof window !== 'undefined') {
                import('../../lib/analytics').then(({ trackLogin }) => {
                    trackLogin('admin');
                }).catch(console.warn);
            }
            
            await router.push("/admin");
        } catch (e) {
            console.error('[LOGIN] Exception:', e);
            showToast.error("Error while logging in: " + (e.response?.data ?? e.message));
        }
    };

    const refreshProps = async () => {
        await router.replace(router.asPath);
    };

    return (
        <div className="md:flex">
            {noUser && (
                <ManageUserDialog
                    onChange={refreshProps}
                    open={addUserOpen}
                    onClose={() => setAddUserOpen(false)}
                />
            )}
            <div className="max-w-sm mx-auto">
                <div className="max-w-[480px] mx-auto flex min-h-screen flex-col justify-center">
                    <div className="mb-5 space-y-2">
                        <h1 className="text-3xl font-bold">
                            Sign in to your ticket shop dashboard
                        </h1>
                        <p className="text-gray-600">
                            Enter your details below.
                        </p>
                    </div>
                    <LoginForm onSubmit={handleLogIn} />
                    {noUser && (
                        <div className="pt-1 pb-1">
                            <p className="text-gray-900">
                                There is no admin user registered yet! You can
                                register your root user (this is only available
                                one time).
                            </p>
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => setAddUserOpen(true)}
                            >
                                Register
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export async function getServerSideProps(context) {
    const session = await getSession(context);

    if (session !== null) {
        return {
            redirect: {
                destination: "/admin",
                permanent: false
            }
        };
    }

    const noUser = (await prisma.adminUser.findMany()).length === 0;

    const csrf = await getCsrfToken(context);
    return {
        props: {
            ...(csrf && { csrfToken: csrf }),
            noUser: noUser
        }
    };
}
