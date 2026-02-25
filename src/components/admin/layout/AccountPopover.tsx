import { useRef, useState } from "react";
import { UserCircleIcon } from "@heroicons/react/solid";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "../../../ui";

export const AccountPopover = () => {
    const anchorRef = useRef(null);
    const [open, setOpen] = useState(false);
    const { data: session, status } = useSession();

    const handleOpen = () => {
        setOpen(true);
    };
    const handleClose = () => {
        setOpen(false);
    };

    // Don't render if session is still loading
    if (status === "loading") {
        return (
            <button className="p-0 w-11 h-11 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
            </button>
        );
    }

    // Don't render if no session
    if (!session || !session.user) {
        return null;
    }

    return (
        <div className="relative">
            <button
                ref={anchorRef}
                onClick={handleOpen}
                className={`p-0 w-11 h-11 rounded-full transition-colors ${
                    open ? 'ring-2 ring-primary-500 ring-offset-2' : 'hover:bg-gray-100'
                }`}
                id={"account-button"}
            >
                <div className="w-11 h-11 bg-gray-100 rounded-full flex items-center justify-center">
                    <UserCircleIcon className="w-6 h-6 text-gray-600" />
                </div>
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div className="py-3 px-4">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                            {session.user.name || 'User'}
                        </h3>
                        <p className="text-sm text-gray-600 truncate">
                            {session.user.email || 'No email'}
                        </p>
                        <Link href={"/admin/user/settings"} passHref>
                            <Button variant="outline" className="w-full mt-3">
                                Settings
                            </Button>
                        </Link>
                    </div>

                    <div className="border-t border-gray-200" />

                    <div className="p-3">
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => signOut()}
                            id={"logout-button"}
                        >
                            Logout
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};
