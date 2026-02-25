import { useRef, useState } from "react";
import { 
    BellIcon, 
    CheckCircleIcon, 
    ChatIcon, 
    BookOpenIcon, 
    CreditCardIcon, 
    ClockIcon 
} from "@heroicons/react/solid";
import { formatDistanceToNow } from "date-fns";
import Image from "next/image";
import { Button } from "../../../ui";

function renderContent(notification) {
    const title = (
        <div className="text-sm font-medium">
            {notification.title}
            <span className="text-gray-600 ml-1">
                {notification.description}
            </span>
        </div>
    );

    if (notification.type === "order_placed") {
        return {
            avatar: <BookOpenIcon className="w-5 h-5 text-blue-600" />,
            title
        };
    }
    if (notification.type === "order_shipped") {
        return {
            avatar: <CreditCardIcon className="w-5 h-5 text-green-600" />,
            title
        };
    }
    if (notification.type === "mail") {
        return {
                            avatar: <ChatIcon className="w-5 h-5 text-purple-600" />,
            title
        };
    }
    return {
        avatar: <Image alt={notification.title} src={notification.avatar} />,
        title
    };
}

function NotificationItem({ notification }) {
    const { avatar, title } = renderContent(notification);

    return (
        <div className={`flex items-start p-3 mt-1 rounded-lg transition-colors ${
            notification.isUnRead ? 'bg-blue-50' : 'hover:bg-gray-50'
        }`}>
            <div className="flex-shrink-0 mr-3">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    {avatar}
                </div>
            </div>
            <div className="flex-1 min-w-0">
                {title}
                <div className="flex items-center mt-1 text-xs text-gray-500">
                    <ClockIcon className="w-4 h-4 mr-1" />
                    {formatDistanceToNow(new Date(notification.createdAt))}
                </div>
            </div>
        </div>
    );
}

export const NotificationsPopover = () => {
    const anchorRef = useRef(null);
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const totalUnRead = notifications.filter(
        (item) => item.isUnRead === true
    ).length;

    const handleOpen = () => {
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
    };

    const handleMarkAllAsRead = () => {
        setNotifications(
            notifications.map((notification) => ({
                ...notification,
                isUnRead: false
            }))
        );
    };

    return (
        <div className="relative">
            <button
                ref={anchorRef}
                onClick={handleOpen}
                className={`p-2 rounded-md transition-colors ${
                    open 
                        ? 'bg-primary-100 text-primary-600' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
            >
                <div className="relative">
                    {notifications.length > 0 ? (
                                                    <BellIcon className="w-5 h-5" />
                    ) : (
                        <BellIcon className="w-5 h-5" />
                    )}
                    {totalUnRead > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                            {totalUnRead}
                        </span>
                    )}
                </div>
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div className="p-4 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <h3 className="text-base font-medium text-gray-900">
                                    Notifications
                                </h3>
                                <p className="text-sm text-gray-600">
                                    You have {totalUnRead} unread messages
                                </p>
                            </div>

                            {totalUnRead > 0 && (
                                <button
                                    onClick={handleMarkAllAsRead}
                                    className="p-1 text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-md transition-colors"
                                    title="Mark all as read"
                                >
                                    <CheckCircleIcon className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-4 text-center text-gray-500">
                                No notifications
                            </div>
                        ) : (
                            <>
                                <div className="px-4 py-2 bg-gray-50">
                                    <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                                        New
                                    </h4>
                                </div>
                                <div className="px-2">
                                    {notifications.slice(0, 2).map((notification) => (
                                        <NotificationItem
                                            key={notification.id}
                                            notification={notification}
                                        />
                                    ))}
                                </div>

                                {notifications.length > 2 && (
                                    <>
                                        <div className="px-4 py-2 bg-gray-50">
                                            <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                                                Before that
                                            </h4>
                                        </div>
                                        <div className="px-2">
                                            {notifications.slice(2, 5).map((notification) => (
                                                <NotificationItem
                                                    key={notification.id}
                                                    notification={notification}
                                                />
                                            ))}
                                        </div>
                                    </>
                                )}
                            </>
                        )}
                    </div>

                    <div className="p-3 border-t border-gray-200">
                        <Button variant="ghost" className="w-full">
                            View All
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};
