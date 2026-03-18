import React, { useEffect, useState } from "react";
import { Navbar } from "./Navbar";
import { Sidebar, sidebarConfig } from "./Sidebar";
import Head from "next/head";
import { useRouter } from "next/router";

const APP_BAR_MOBILE = 64;
const APP_BAR_DESKTOP = 92;

export const AdminLayout = ({
    permissionDenied,
    authStep,
    children
}: {
    permissionDenied?: boolean;
    authStep?: string;
    children: JSX.Element | JSX.Element[];
}) => {
    const [open, setOpen] = useState<boolean>(false);
    const [pageName, setPageName] = useState<string>("");
    const router = useRouter();

    useEffect(() => {
        const urls = sidebarConfig
            .map((sidebar) => [
                { title: sidebar.title, path: sidebar.path },
                sidebar.children
            ])
            .concat(additionalPages)
            .flat(2)
            .filter((x) => x !== undefined);
        const title = urls.find((url) => url.path === router.pathname)?.title;
        setPageName(title);
    }, [router.pathname]);

    // Permission denied state (only for users who are authenticated but lack specific permissions)
    if (permissionDenied === true) {
        return (
            <div className="flex min-h-full overflow-hidden max-h-full">
                <Head>
                    <title>Access Denied - Ticketshop Admin</title>
                    <link rel="icon" type="image/x-icon" href="/favicon.ico" />
                </Head>
                <div className="flex items-center justify-center min-h-screen w-full">
                    <div className="text-center">
                        <h4 className="text-lg font-medium text-gray-900 mb-2">
                            You don&apos;t have permission to access this area!
                        </h4>
                        <p className="text-gray-600">
                            Please contact an administrator if you believe this is an error.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Permission granted - show full layout
    return (
        <div className="flex min-h-full overflow-hidden max-h-full">
            <Head>
                <title>Ticketshop Admin - {pageName}</title>
                <link rel="icon" type="image/x-icon" href="/favicon.ico" />
            </Head>
            <Navbar onOpen={() => setOpen(true)} />
            <Sidebar isOpen={open} onClose={() => setOpen(false)} />
            <main className="flex-grow overflow-auto min-h-full pt-24 pb-10 px-2 lg:pt-28">
                {children}
            </main>
        </div>
    );
};

const additionalPages = [
    {
        title: "Settings",
        path: "/admin/user/settings"
    }
];
