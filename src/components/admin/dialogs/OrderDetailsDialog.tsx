import { Dialog, Button } from "../../../ui";
import React, { useState } from "react";
import { OrderDeliveryInformationDetails, OrderPaymentInformationDetails } from "../OrderInformationDetails";
import { getEventTitle } from "../../../constants/util";
import { ConfirmDialog } from "./ConfirmDialog";
import { showToast } from "../../../ui";
import axios from "axios";
import { SaveButton } from "../SaveButton";
import { formatAmount } from "../../../lib/amountUtils";

export const OrderDetailsDialog = ({
    order,
    onClose,
    onMarkAsPayed,
    onMarkAsShipped,
    onDelete,
    categories
}) => {
    const [detailsTab, setDetailsTab] = useState("overview");
    const [deleteOpen, setDeleteOpen] = useState(false);

    if (order === null) return null;

    const handleDetailsTabChange = (event, newValue) => {
        setDetailsTab(newValue);
    };

    const handleClose = () => {
        setDetailsTab("overview");
        if (onClose) onClose();
    };

    const handleDeleteOrder = async () => {
        try {
            await axios.delete("/api/admin/order/" + order.id);
            setDeleteOpen(false);
            onClose();
            onDelete();
        } catch (e) {
            showToast.error("Error deleting order: " + (e?.response?.data));
        }
    }

    const downloadInvoice = async () => {
        const response = await axios.get("/api/admin/order/" + order.id + "/invoice");
        const blob = await (await fetch(response.data)).blob()
        window.open(URL.createObjectURL(blob));
    }

    return (
        <>
            <Dialog open={true} onClose={handleClose} size="xl">
                <Dialog.Header>
                    <h3 className="text-lg font-semibold">Order Details</h3>
                </Dialog.Header>
                <Dialog.Body>
                    <div className="mb-6">
                        <div className="flex justify-center border-b border-gray-200">
                            {["overview", "payment", "delivery"].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setDetailsTab(tab)}
                                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                                        detailsTab === tab
                                            ? "border-blue-500 text-blue-600"
                                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                    }`}
                                >
                                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    {detailsTab === "overview" && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <p className="text-gray-700">
                                    Event: {getEventTitle(order.eventDate)}
                                    <br />
                                    Event Date: {new Date(order.eventDate.date).toLocaleString()}
                                    <br />
                                    OrderID: {order.id}
                                    <br />
                                    Date: {new Date(order.date).toLocaleString()}
                                </p>
                                
                                {/* Order Amount Section */}
                                <div className="border-t border-gray-200 my-3" />
                                <div className="bg-blue-50 p-4 rounded-lg">
                                    <p className="text-lg font-semibold text-blue-900">
                                        Order Total: {formatAmount(order.finalTotal || order.originalTotal || 0, order.id)}
                                    </p>
                                    <p className="text-sm text-blue-700 mt-1">
                                        Final amount after discounts and fees
                                    </p>
                                </div>
                                <div className="border-t border-gray-200 my-3" />
                                <p className="text-gray-700">
                                    {order.user.firstName} {order.user.lastName}
                                    <br />
                                    {order.user.email}
                                    <br />
                                    {order.user.address}
                                    <br />
                                    {order.user.zip} {order.user.city}
                                    <br />
                                    {order.user.countryCode}{" "}
                                    {order.user.regionCode}<br />
                                    <br />
                                    {order.customFields && (() => {
                                        try {
                                            const { formatCustomFieldsForDisplay } = require('../../../utils/customFieldsFormatter');
                                            const formatted = formatCustomFieldsForDisplay(order.customFields, order.eventDate?.event?.customFields);
                                            return formatted.length > 0 ? (
                                                <div className="mt-2 space-y-1">
                                                    {formatted.map((field, idx) => (
                                                        <div key={idx} className="text-sm">
                                                            <span className="font-medium">{field.label}:</span> {field.value}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : null;
                                        } catch (error) {
                                            return null;
                                        }
                                    })()}
                                </p>
                            </div>
                            <div className="flex space-x-3">
                                <SaveButton action={downloadInvoice}>
                                    Download Invoice
                                </SaveButton>
                                <Button variant="danger" onClick={() => setDeleteOpen(true)}>
                                    Delete
                                </Button>
                            </div>
                        </div>
                    )}
                    
                    {detailsTab === "payment" && (
                        <div className="space-y-4">
                            <OrderPaymentInformationDetails
                                order={order}
                                onMarkAsPayed={onMarkAsPayed}
                            />
                        </div>
                    )}
                    
                    {detailsTab === "delivery" && (
                        <div className="space-y-4">
                            <OrderDeliveryInformationDetails
                                order={order}
                                onMarkAsShipped={onMarkAsShipped}
                                categories={categories}
                            />
                        </div>
                    )}
                </Dialog.Body>
            </Dialog>
            <ConfirmDialog
                open={deleteOpen}
                onClose={() => setDeleteOpen(false)}
                onConfirm={handleDeleteOrder}
                text={"Confirm delete this order?"}
            />
        </>
    );
};
