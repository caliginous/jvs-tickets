import React, { useState } from "react";
import axios from "axios";
import dynamic from "next/dynamic";
import { showToast } from "../../ui";
import { formatAmount, formatTicketPrice } from "../../lib/amountUtils";
import { ShippingFactory } from "../../store/factories/shipping/ShippingFactory";
import { CheckIcon, XIcon, BookOpenIcon, QrcodeIcon, DocumentTextIcon } from "@heroicons/react/solid";
import { hasPayed, hasShipped } from "../../constants/orderValidation";
import { SaveButton } from "./SaveButton";
import { Button } from "../../ui";

const ReactJson = dynamic(() => import("react-json-view"), { ssr: false });

const JsonViewer = ({ paymentResult, paymentIntent }: { paymentResult: any; paymentIntent: any }) => {
    // Render a stable placeholder on SSR to match the shape during hydration
    if (typeof window === "undefined") {
        return <div style={{minHeight: 24}} />;
    }

    return (
        <ReactJson
            src={{ paymentResult, paymentIntent }}
            name={"details"}
            collapsed
        />
    );
};

export const hasPayedIcon = (order: any) => {
    // Check if order is cancelled first
    if (order.status === "CANCELLED") {
        return (
            <div className="flex items-center space-x-2">
                <XIcon className="w-5 h-5 text-red-600" />
                <span className="text-xs text-red-600">Cancelled</span>
            </div>
        );
    }
    
    // Check if order is refunded
    if (order.status === "REFUNDED") {
        return (
            <div className="flex items-center space-x-2">
                <XIcon className="w-5 h-5 text-red-600" />
                <span className="text-xs text-red-600">Refunded</span>
            </div>
        );
    }
    
    if (order.status === "PARTIALLY_REFUNDED") {
        return (
            <div className="flex items-center space-x-2">
                <XIcon className="w-5 h-5 text-orange-600" />
                <span className="text-xs text-orange-600">Partially Refunded</span>
            </div>
        );
    }
    
    // For orders with status PAID, show as paid regardless of hasPayed function
    if (order.status === "PAID") {
        return (
            <CheckIcon className="w-5 h-5 text-green-600" />
        );
    }
    
    return hasPayed(order) ? (
        <CheckIcon className="w-5 h-5 text-green-600" />
    ) : (
        <XIcon className="w-5 h-5 text-red-600" />
    );
};

export const OrderPaymentInformationDetails = ({ order, onMarkAsPayed }: { order: any; onMarkAsPayed: () => void }) => {
    const handleMarkAsPayed = async () => {
        try {
            await axios.put("/api/admin/order/paid", { orderId: order.id }, { withCredentials: true });
            showToast.success("Marked as paid");
            onMarkAsPayed();
        } catch (e: any) {
            showToast.error("Error: " + (e?.response?.data ?? e.message));
        }
    };

    const handleResendEmail = async () => {
        try {
            await axios.post("/api/admin/order/resend", { orderId: order.id, invoice: true }, { withCredentials: true });
            showToast.success("Confirmation email sent!");
        } catch (e: any) {
            showToast.error("Error: " + (e?.response?.data ?? e.message));
        }
    };

    return (
        <div className="space-y-4">
            {/* Order Amount Section */}
            <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-lg font-semibold text-blue-900">
                    Order Total: {formatAmount(order.finalTotal || order.originalTotal || 0, order.id)}
                </p>
                <p className="text-sm text-blue-700 mt-1">
                    Final amount after discounts and fees
                </p>
            </div>
            
            <div className="text-gray-700">
                <p>Payment Type: {order.paymentType}</p>
                <p className="flex items-center space-x-2">
                    <span>Paid:</span>
                    {hasPayedIcon(order)}
                </p>
                
                {/* Show refund information if order is refunded */}
                {(order.status === "REFUNDED" || order.status === "PARTIALLY_REFUNDED") && order.paymentResult && (
                    <div className="mt-2 p-3 bg-gray-50 rounded-md">
                        <p className="font-medium text-gray-800">
                            {order.status === "REFUNDED" ? "Order Refunded" : "Order Partially Refunded"}
                        </p>
                        {(() => {
                            try {
                                const paymentData = JSON.parse(order.paymentResult);
                                const refund = paymentData.refund;
                                if (refund) {
                                    return (
                                        <div className="text-sm text-gray-600 mt-1">
                                            <p>Refund Amount: {refund.amount}</p>
                                            <p>Refund Reason: {refund.reason}</p>
                                            <p>Refund Date: {new Date(refund.timestamp).toLocaleDateString('en-GB')}</p>
                                            {refund.stripeRefundId && (
                                                <p>Stripe Refund ID: {refund.stripeRefundId}</p>
                                            )}
                                        </div>
                                    );
                                }
                            } catch (e) {
                                // Ignore parsing errors
                            }
                            return null;
                        })()}
                    </div>
                )}
            </div>
            
            {order.paymentType === "invoice" && !hasPayed(order) && (
                <SaveButton action={handleMarkAsPayed}>
                    Mark as paid
                </SaveButton>
            )}
            
            <SaveButton action={handleResendEmail}>
                Resend Confirmation E-Mail
            </SaveButton>
            
            <div className="border-t border-gray-200 my-4" />
            
            <div className="text-gray-700">
                <p>Detailed information (in case of payment errors for example)</p>
            </div>
            
            <JsonViewer
                paymentIntent={JSON.parse(order.paymentIntent)}
                paymentResult={JSON.parse(order.paymentResult)}
            />
        </div>
    );
};

export const OrderDeliveryInformationDetails = ({ order, onMarkAsShipped, categories }: { order: any; onMarkAsShipped: () => void; categories: any[] }) => {
    const handleMarkAsShipped = async () => {
        try {
            await axios.put("/api/admin/order/shipped", { orderId: order.id }, { withCredentials: true });
            showToast.success("Marked as shipped");
            onMarkAsShipped();
        } catch (e: any) {
            showToast.error("Error: " + (e?.response?.data ?? e.message));
        }
    };

    const handleResendTickets = async () => {
        try {
            await axios.post("/api/admin/order/resend", { orderId: order.id, tickets: true }, { withCredentials: true });
            showToast.success("Download Tickets sent!");
            onMarkAsShipped();
        } catch (e: any) {
            showToast.error("Error: " + (e?.response?.data ?? e.message));
        }
    };

    const getShippingAddress = () => {
        try {
            const shipping = JSON.parse(order.shipping);
            
            // Check if this is the new Stripe address format (direct address fields)
            if (shipping && shipping.line1 && shipping.city) {
                return {
                    firstName: shipping.name?.split(' ')[0] || order.user.firstName,
                    lastName: shipping.name?.split(' ').slice(1).join(' ') || order.user.lastName,
                    address: shipping.line1,
                    zip: shipping.postal_code,
                    city: shipping.city,
                    countryCode: shipping.country,
                    regionCode: shipping.state,
                    email: shipping.email || order.user.email,
                    phone: shipping.phone
                };
            }
            
            // Check if this is the old shipping format (shipping.data structure)
            if (shipping && shipping.data && shipping.data !== "mock" && shipping.data !== null) {
                if (shipping.data.differentAddress && shipping.data.address) {
                    return shipping.data.address;
                }
            }
            
            // Fallback to user data
            return order.user;
        } catch (error) {
            console.error('Error parsing shipping data:', error);
            return order.user;
        }
    };

    const address = getShippingAddress();
    
    return (
        <div className="space-y-4">
            <div className="text-gray-700">
                <p>Delivery Type: {(() => {
                    try {
                        const shipping = JSON.parse(order.shipping);
                        return ShippingFactory.getShippingInstance(shipping)?.DisplayName || 'Unknown';
                    } catch (error) {
                        return 'Unknown';
                    }
                })()}</p>
            </div>
            
            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Address</h3>
                <div className="text-gray-700">
                    <p>{address?.firstName || 'N/A'} {address?.lastName || 'N/A'}</p>
                    <p>{address?.address || 'Address not provided'}</p>
                    <p>{address?.zip || 'ZIP not provided'} {address?.city || 'City not provided'}</p>
                    <p>{address?.countryCode || 'Country not provided'}-{address?.regionCode || 'Region not provided'}</p>
                    <br />
                    {order.customFields && (() => {
                        try {
                            const { formatCustomFieldsForDisplay } = require('../../utils/customFieldsFormatter');
                            const formatted = formatCustomFieldsForDisplay(
                                order.customFields,
                                order.eventDate?.event?.customFields
                            );
                            return formatted.length > 0 ? (
                                <div className="mt-2 space-y-1">
                                    <h4 className="font-semibold text-gray-900 text-sm">Additional Information:</h4>
                                    {formatted.map((field, index) => (
                                        <p key={index} className="text-sm">
                                            <span className="font-medium text-gray-900">{field.label}:</span>{' '}
                                            <span className="text-gray-700">{field.value}</span>
                                        </p>
                                    ))}
                                </div>
                            ) : null;
                        } catch (error) {
                            return <p className="text-gray-500 text-sm">Custom fields could not be parsed</p>;
                        }
                    })()}
                </div>
            </div>
            
            <div className="border-t border-gray-200 my-4" />
            
            <TicketList order={order} categories={categories} />
            
            {!hasShipped(order) && (
                <Button onClick={handleMarkAsShipped} variant="solid">
                    Mark as shipped
                </Button>
            )}
            
            <SaveButton action={handleResendTickets}>
                Resend download tickets
            </SaveButton>
            
            <div className="border-t border-gray-200 my-4" />
            
            <div className="text-gray-700">
                <p>Detailed information</p>
            </div>
            
            {(() => {
                try {
                    const shipping = JSON.parse(order.shipping);
                    return (
                        <ReactJson
                            src={shipping}
                            collapsed
                        />
                    );
                } catch (error) {
                    return (
                        <div className="text-gray-500 p-4 border border-gray-200 rounded">
                            Shipping data could not be parsed
                        </div>
                    );
                }
            })()}
        </div>
    );
};

const TicketList = ({ order, categories }: { order: any; categories: any[] }) => {
    const [tickets, setTickets] = useState(order.tickets);

    const download = async (ticketId: string, fileType: string) => {
        const response = await axios.put("/api/admin/ticket/" + ticketId + "?type=" + fileType, {}, { withCredentials: true });
        const blob = await (await fetch(response.data)).blob();
        window.open(URL.createObjectURL(blob));
    };

    const generateTicket = async (ticket: any) => {
        if (ticketAvailable(ticket)) return;
        try {
            await axios.put("/api/admin/ticket/" + ticket.id, {}, { withCredentials: true });
            const copyTickets = [...tickets];
            copyTickets.find(a => a.id === ticket.id)!.secretGenerated = true;
            setTickets(copyTickets);
        } catch (e: any) {
            showToast.error("Error: " + (e?.response?.data ?? e.message));
        }
    };

    const ticketAvailable = (ticket: any) => {
        return (ticket.secret !== null && ticket.secret !== "" && ticket.secret !== undefined) || ticket.secretGenerated;
    };

    const downloadAll = async (fileType: string) => {
        for (const ticket of tickets) {
            await download(ticket.id, fileType);
        }
    };

    return (
        <div className="border border-gray-200 rounded-lg">
            <details className="group">
                <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50">
                    <span className="text-lg font-medium text-gray-700">Tickets</span>
                    <div className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform">
                        ▼
                    </div>
                </summary>
                
                <div className="p-4 border-t border-gray-200 space-y-4">
                    <div className="space-y-3">
                        {tickets.map((item: any, index: number) => {
                            // Handle both legacy categories and new ticket types safely
                            let ticketType = null;
                            let displayName = 'Unknown Ticket';

                            if (item.eventTicketTypeId && item.eventTicketType) {
                                // New ticket type system
                                ticketType = item.eventTicketType;
                                displayName = ticketType.name || 'Unknown Ticket Type';
                            } else if (item.categoryId) {
                                // Legacy category system
                                const category = categories?.find(c => c.id === item.categoryId);
                                if (!category) return null; // Skip if category not found
                                ticketType = category;
                                displayName = category.label || 'Unknown Category';
                            } else {
                                // Neither categoryId nor eventTicketTypeId - skip this ticket
                                return null;
                            }

                            return (
                                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div className="flex-1">
                                        <div className="text-sm font-medium text-gray-900">{displayName}</div>
                                        {item.seatId && (
                                            <div className="text-sm text-gray-500">Seat: {item.seatId}</div>
                                        )}
                                        {ticketType && (
                                            <div className="text-sm text-gray-500">
                                                Price: {formatTicketPrice(ticketType.price || 0)}
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="text-sm text-gray-700 mr-4">
                                        {item.firstName ?? order.user.firstName} {item.lastName ?? order.user.lastName}
                                    </div>
                                    
                                    {ticketAvailable(item) ? (
                                        <div className="flex space-x-2">
                                            <button
                                                onClick={async () => await download(item.id, "qr")}
                                                className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Download QR-Code only"
                                            >
                                                <QrcodeIcon className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={async () => await download(item.id, "pdf")}
                                                className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Download PDF Ticket"
                                            >
                                                <DocumentTextIcon className="w-5 h-5" />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={async () => await generateTicket(item)}
                                            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="Generate Ticket"
                                        >
                                            <BookOpenIcon className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    
                    <div className="flex space-x-2">
                        <Button onClick={async () => await downloadAll("qr")} variant="outline" className="flex-1">
                            <QrcodeIcon className="w-4 h-4 mr-2" />
                            Download All QR
                        </Button>
                        <Button onClick={async () => await downloadAll("pdf")} variant="outline" className="flex-1">
                            <DocumentTextIcon className="w-4 h-4 mr-2" />
                            Download All PDF
                        </Button>
                    </div>
                    
                    <p className="text-sm text-gray-500">
                        Make sure to allow the opening of new popups/tabs in your browser
                    </p>
                </div>
            </details>
        </div>
    );
};

