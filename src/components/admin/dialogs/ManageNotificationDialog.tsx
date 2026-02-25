import { Dialog, Button, Select } from "../../../ui";
import { useEffect, useState } from "react";
import { CategorySelection } from "../CategorySelection";
import {
    NotificationDataFields,
    NotificationHandler,
    Notifications
} from "../../../lib/notifications/NotificationTypes";
import axios from "axios";
import { showToast } from "../../../ui";
import { GenericDataCollector } from "../../GenericDataCollector";
import { ChevronDownIcon } from "@heroicons/react/solid";

const encodeServices = (services) => {
    const encodedServices = Object.keys(Notifications).reduce((obj, val) => {
        if (val in obj) return obj;
        obj[val] = [];
        return obj;
    }, {});
    for (let service of services) {
        encodedServices[service[0]].push(service[1]);
    }
    return encodedServices;
};

const decodeServices = (services) => {
    return Object.entries(services).map((val: [string, Array<string>]) => val[1].map(a => [val[0], a])).flat(1);
};

export const ManageNotificationDialog = ({open, notification, onClose, onChange}) => {
    const [type, setType] = useState("");
    const [currentServices, setCurrentServices] = useState(Object.keys(Notifications).reduce((obj, val) => {
        if (val in obj) return obj;
        obj[val] = [];
        return obj;
    }, {}));
    const [data, setData] = useState({});

    useEffect(() => {
        if (!notification) return;
        const services = JSON.parse(notification?.data).services;
        setCurrentServices(encodeServices(services));
        setType(notification?.type);
        setData(JSON.parse(notification?.data).data);
    }, [notification]);

    const handleSave = async () => {
        try {
            const body = {type, data: {services: decodeServices(currentServices), data: data}};
            if (notification)
                await axios.put("/api/admin/notifications/" + notification.id, body);
            else
                await axios.post("/api/admin/notifications", body);

            onChange();
            onClose();
        } catch (e) {
            showToast.error("Error: " + (e?.response?.data ?? e.message));
        }
    };

    return (
        <Dialog open={open} onClose={onClose} size="lg">
            <Dialog.Header>
                <h3 className="text-lg font-semibold">
                    {notification ? "Edit" : "Add"} Notification
                </h3>
            </Dialog.Header>
            <Dialog.Body>
                <div className="space-y-4 py-2">
                    <Select
                        label="Notification Type"
                        value={type}
                        onChange={(value) => setType(value)}
                        options={Object.entries(NotificationHandler).map((entry, index) => ({
                            value: entry[1],
                            label: entry[0]
                        }))}
                        placeholder="Select notification type"
                    />
                    {type !== "" && NotificationDataFields[type] && Object.entries(NotificationDataFields[type]).length > 0 && (
                        <div className="border border-gray-200 rounded-lg">
                            <details className="group">
                                <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50">
                                    <span className="text-sm font-medium text-gray-700" id="manage-notification-details">
                                        Details
                                    </span>
                                    <ChevronDownIcon className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" />
                                </summary>
                                <div className="p-4 border-t border-gray-200">
                                    <GenericDataCollector
                                        currentData={data}
                                        data={NotificationDataFields[type]}
                                        onChange={(name, newValue) => {
                                            const newObject = Object.assign({}, data);
                                            newObject[name] = newValue;
                                            setData(newObject);
                                        }}
                                    />
                                </div>
                            </details>
                        </div>
                    )}
                    <CategorySelection onChange={setCurrentServices} currentValues={currentServices} selectionValues={Notifications} />
                    <Button 
                        variant="solid" 
                        id="save-notification" 
                        onClick={handleSave} 
                        disabled={!Object.values(currentServices).some((val: Array<string>) => val.length > 0)}
                    >
                        Save
                    </Button>
                </div>
            </Dialog.Body>
        </Dialog>
    )
};
