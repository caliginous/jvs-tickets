import { PencilIcon } from "@heroicons/react/solid";
import React from "react";
import { useAppSelector } from "../store/hooks";
import { selectOrder } from "../store/reducers/orderReducer";
import { calculateTotalPrice, formatPrice, summarizeTicketAmount } from "../constants/util";
import useTranslation from "next-translate/useTranslation";
import { selectPayment } from "../store/reducers/paymentReducer";
import { selectPersonalInformation } from "../store/reducers/personalInformationReducer";

interface PaymentOverviewProps {
    categories: Array<{
        id: number;
        price: number;
        label?: string;
        name?: string;
        color?: string;
    }>;
    withEditButton?: boolean;
    onEdit?: () => void;
    hideEmptyCategories?: boolean;
    displayColor?: boolean;
    shippingFees?: Record<string, number>;
    paymentFees?: Record<string, number>;
    eventName?: string;
}

export const PaymentOverview = ({
    categories,
    withEditButton,
    onEdit,
    hideEmptyCategories,
    displayColor,
    shippingFees,
    paymentFees,
    eventName
}: PaymentOverviewProps) => {
    const order = useAppSelector(selectOrder);
    const payment = useAppSelector(selectPayment);
    const shipping = useAppSelector(selectPersonalInformation).shipping?.type;
    const { t } = useTranslation();

    const handleEdit = () => {
        if (!onEdit) return;
        onEdit();
    };

    const items = summarizeTicketAmount(order.tickets, categories, hideEmptyCategories);
    const shippingPrice = shippingFees ? shippingFees[shipping] ?? 0 : 0;
    const paymentPrice = paymentFees ? paymentFees[payment.payment?.type] ?? 0 : 0;
    const price = calculateTotalPrice(order.tickets, categories, shippingFees, paymentFees, shipping, payment.payment?.type);

    return (
        <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <h3 className="text-xl font-semibold text-gray-900">{t("common:summary")}</h3>
                {eventName && (
                    <h4 className="text-lg font-medium text-gray-700 mt-1">{eventName}</h4>
                )}
            </div>
            
            <div className="divide-y divide-gray-200">
                {items.map((item, index) => {
                    const ticketType = categories.find(
                        (tt) => tt.id === item.ticketTypeId
                    );
                    if (!ticketType) return null;
                    const displayLabel = ticketType.label || ticketType.name || 'Ticket';
                    return (
                        <div
                            key={index}
                            className="flex items-center justify-between px-4 py-3"
                        >
                            <div className="flex-1">
                                <div className="flex items-center justify-between">
                                    <span 
                                        id={`payment-overview-category-amount-${displayLabel}`}
                                        className="text-sm font-medium text-gray-900"
                                    >
                                        {item.amount}x: {displayLabel}
                                    </span>
                                    {displayColor && (
                                        <div
                                            className="w-5 h-5 rounded-full float-right"
                                            style={{
                                                backgroundColor: ticketType.color ?? "#59bb59"
                                            }}
                                        />
                                    )}
                                </div>
                                <div className="text-sm text-gray-500 mt-1">
                                    {formatPrice(ticketType.price, payment.currency)}
                                </div>
                            </div>
                            
                            {withEditButton && (
                                <button
                                    onClick={handleEdit}
                                    className="ml-3 p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                                    aria-label="edit"
                                >
                                    <PencilIcon className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    );
                })}
                
                {shippingPrice !== 0 && (
                    <div className="flex items-center justify-between px-4 py-3">
                        <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">
                                {t("payment:shipping-fee")}
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                                {formatPrice(shippingPrice, payment.currency)}
                            </div>
                        </div>
                    </div>
                )}
                
                {paymentPrice !== 0 && (
                    <div className="flex items-center justify-between px-4 py-3">
                        <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">
                                {t("payment:payment-fee")}
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                                {formatPrice(paymentPrice, payment.currency)}
                            </div>
                        </div>
                    </div>
                )}
            </div>
            
            {categories.length > 0 && (
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                        <div className="text-lg font-semibold text-gray-900">
                            {t("common:total-price")}:
                        </div>
                        <div 
                            id="payment-overview-total-price"
                            className="text-lg font-semibold text-gray-900"
                        >
                            {formatPrice(Math.max(price, 0), payment.currency)}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
