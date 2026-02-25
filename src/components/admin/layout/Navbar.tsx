import { MenuIcon } from "@heroicons/react/solid";
import { NotificationsPopover } from "./NotificationPopover";
import { AccountPopover } from "./AccountPopover";

const DRAWER_WIDTH = 280;
const APPBAR_MOBILE = 64;
const APPBAR_DESKTOP = 92;

export const Navbar = ({ onOpen }) => {
    return (
        <header className="fixed top-0 left-0 right-0 z-40 lg:left-80 lg:right-0 bg-white/70 backdrop-blur-md border-b border-gray-200">
            <div className="flex items-center justify-between px-4 py-2 min-h-16 lg:min-h-20 lg:px-5">
                <div className="lg:hidden">
                    <button
                        onClick={onOpen}
                        className="mr-1 p-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                    >
                        <MenuIcon className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-grow" />

                <div className="flex items-center space-x-1 sm:space-x-3">
                    <NotificationsPopover />
                    <AccountPopover />
                </div>
            </div>
        </header>
    );
};
