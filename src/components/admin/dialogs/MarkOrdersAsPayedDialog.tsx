import { Dialog, Button, Input } from "../../../ui";
import { useState } from "react";
import axios from "axios";
import { showToast } from "../../../ui";
import { validate as uuidValidate } from 'uuid';
import { hasPayedIcon } from "../OrderInformationDetails";
import { hasPayed } from "../../../constants/orderValidation";
import { formatPrice } from "../../../constants/util";

export const MarkOrdersAsPayedDialog = ({open, onClose, currency}) => {
    const [orderId, setOrderId] = useState("");
    const [autoMarkAsPaid, setAutoMarkAsPaid] = useState(false);
    const [order, setOrder] = useState(null);

    const getUrl = () => {
        const baseUrl = "/api/admin/order/paid?";
        if (uuidValidate(orderId)) {
            return baseUrl + "orderId=" + orderId
        }
        if (!orderId || orderId.trim() === "") {
            throw new Error("Order ID or Invoice Purpose cannot be empty");
        }
        return baseUrl + "invoicePurpose=" + orderId;
    };

    const handleMarkAsPaid = async () => {
        try {
            await axios.put(getUrl());
            showToast.success("Successfully marked as paid");
            setOrder(null);
        } catch (e) {
            showToast.error("Error: " + (e.response?.message ?? e.message));
        }
    };

    const handleAccept = async () => {
        if (autoMarkAsPaid) return await handleMarkAsPaid();

        try {
            const response = await axios.get(getUrl());
            setOrder(response.data[0]);
        } catch (e) {
            if (e.message) {
                showToast.error("Error: " + e.message);
            } else {
                showToast.error("Error: " + (e.response?.data?.message ?? e.response?.message ?? e.message ?? "Unknown error"));
            }
        }
    };

    return (
        <Dialog open={open} onClose={onClose} size="xl">
            <Dialog.Header>
                <h3 className="text-lg font-semibold text-center">Mark orders as paid!</h3>
            </Dialog.Header>
            <Dialog.Body>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                        <p className="text-sm text-gray-600">
                            Please enter the purpose of the received bank transfer or the order id below
                        </p>
                        <Input
                            label="Order ID/Invoice Purpose"
                            value={orderId}
                            onChange={(event) => setOrderId(event.target.value)}
                        />
                        <Button onClick={handleAccept} className="w-full">
                            {autoMarkAsPaid ? "Mark as paid" : "Search"}
                        </Button>
                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="auto-mark-paid"
                                checked={autoMarkAsPaid}
                                onChange={(event) => setAutoMarkAsPaid(event.target.checked)}
                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                            />
                            <label htmlFor="auto-mark-paid" className="text-sm text-gray-700">
                                Auto mark orders as paid
                            </label>
                        </div>
                        <div className="text-xs text-gray-500">
                            Activate this checkbox to automatically mark the provided order as paid, instead of searching first.
                        </div>
                    </div>
                    
                    {!autoMarkAsPaid && (
                        <div className="space-y-4">
                            {order ? (
                                <div className="space-y-3">
                                    <OrderDisplay
                                        order={order}
                                        currency={currency}
                                    />
                                    {hasPayed(order) ? (
                                        <div className="flex items-center space-x-2 text-amber-600">
                                            {hasPayedIcon(order)} 
                                            <span>This order is already paid</span>
                                        </div>
                                    ) : (
                                        <Button onClick={handleMarkAsPaid} className="w-full">
                                            Mark as paid
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <p className="text-gray-500">No order found</p>
                            )}
                        </div>
                    )}
                </div>
            </Dialog.Body>
        </Dialog>
    )
};

const OrderDisplay = ({order, currency}) => {
    // Use stored finalTotal instead of recalculating from categories
    const totalPrice = order.finalTotal ?? order.originalTotal ?? 0;

    return (
        <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm"><span className="font-medium">OrderID:</span> {order.id}</p>
            <p className="text-sm"><span className="font-medium">TicketAmount:</span> {order.tickets?.length ?? 0}</p>
            <p className="text-sm"><span className="font-medium">Total Price:</span> {formatPrice(totalPrice, currency)}</p>
            <p className="text-sm"><span className="font-medium">Date:</span> {new Date(order.date).toLocaleString()}</p>
        </div>
    )
};
