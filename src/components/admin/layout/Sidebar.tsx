import { useEffect } from "react";
import { useRouter } from "next/router";
import { Scrollbar } from "../../util/Scrollbar";
import {
    HomeIcon,
    UserGroupIcon,
    BookOpenIcon,
    CalendarIcon,
    CogIcon,
    GlobeAltIcon,
    QrcodeIcon,
    TagIcon,
    ChartBarIcon,
    MailIcon
} from "@heroicons/react/solid";
import NavSection from "./NavSection";

const DRAWER_WIDTH = 280;

export const sidebarConfig = [
    {
        title: "Dashboard",
        path: "/admin",
        icon: <HomeIcon />
    },
    {
        title: "User",
        path: "/admin/users",
        icon: <UserGroupIcon />
    },
    {
        title: "Orders",
        path: "/admin/orders",
        icon: <BookOpenIcon />
    },
    {
        title: "Reports",
        path: "/admin/reports",
        icon: <ChartBarIcon />
    },

    {
        title: "Event Management",
        icon: <CalendarIcon />,
        children: [
            {
                title: "Events",
                path: "/admin/events"
            },
            {
                title: "Venues",
                path: "/admin/events/venues"
            },
            {
                title: "Discount Codes",
                path: "/admin/events/discount-codes"
            },
            {
                title: "Slug Management",
                path: "/admin/events/slugs"
            }
        ]
    },
    {
        title: "Email",
        icon: <MailIcon />,
        path: "/admin/email"
    },
    {
        title: "Options",
        icon: <CogIcon />,
        path: "/admin/options"
    },
    {
        title: "Translations",
        icon: <GlobeAltIcon />,
        path: "/admin/localization"
    },
    {
        title: "Ticket Scan",
        icon: <QrcodeIcon />,
        path: "/admin/ticket-scan"
    }
];

export const Sidebar = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    const router = useRouter();

    useEffect(() => {
        if (isOpen) {
            onClose();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router.pathname]);

    const renderContent = (
        <div className="h-full flex flex-col">
            <NavSection navConfig={sidebarConfig} />
        </div>
    );

    return (
        <div className="lg:flex-shrink-0 lg:w-80">
            {/* Mobile Drawer */}
            <div className="lg:hidden">
                {isOpen && (
                    <div className="fixed inset-0 z-50 lg:hidden">
                        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
                        <div className="fixed left-0 top-0 h-full w-80 bg-white shadow-xl">
                            {renderContent}
                        </div>
                    </div>
                )}
            </div>

            {/* Desktop Sidebar */}
            <div className="hidden lg:block">
                <div className="fixed left-0 top-0 h-full w-80 bg-white border-r border-gray-200">
                    {renderContent}
                </div>
            </div>
        </div>
    );
};
