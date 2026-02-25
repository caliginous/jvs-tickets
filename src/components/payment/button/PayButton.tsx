import {
    selectPayment, setIdempotencyKey,
    setPaymentStatus
} from "../../../store/reducers/paymentReducer";
import { validatePayment } from "../../../constants/util";
import {
    selectPersonalInformation,
    setUserId
} from "../../../store/reducers/personalInformationReducer";
import { selectOrder, setOrderId } from "../../../store/reducers/orderReducer";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import { selectEventSelected } from "../../../store/reducers/eventSelectionReducer";
import { CreditCardIcon } from "@heroicons/react/solid";
import React from "react";
import { selectNextStateAvailable } from "../../../store/reducers/nextStepAvailableReducer";
import useTranslation from "next-translate/useTranslation";
import { v4 as uuid } from "uuid";
import { Button } from "../../../ui";

export const PayButton = () => {
    const order = useAppSelector(selectOrder);
    const payment = useAppSelector(selectPayment);
    const selectedEvent = useAppSelector(selectEventSelected);
    const userInformation = useAppSelector(selectPersonalInformation);
    const nextEnabled = useAppSelector(selectNextStateAvailable);
    const dispatch = useAppDispatch();
    const { t } = useTranslation();

    const onPay = async () => {
        // Check if terms and conditions are accepted
        if (!payment.gtcAccepted) {
            console.warn('Terms and conditions must be accepted before payment');
            return;
        }

        let idempotencyKey = payment.idempotencyKey;
        if (idempotencyKey === null) {
            // generate payment request overarching idempotencyKey
            idempotencyKey = uuid();
            dispatch(setIdempotencyKey(idempotencyKey));
        }
        dispatch(setPaymentStatus("persist"));
        const paymentAlreadyValid = await validatePayment(order.orderId);
        if (paymentAlreadyValid) {
            dispatch(setPaymentStatus("finished"));
        }
        try {
            // UPDATED: No longer creating order here - webhook will handle order creation
            // Just initiate the payment process
            const response = await fetch(`/api/payment_intent/${payment.payment.type}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    order: order,
                    user: userInformation,
                    eventDateId: selectedEvent,
                    paymentType: payment.payment.type,
                    locale: navigator.language,
                    idempotencyKey: idempotencyKey
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                // Webhook will create the order, so we don't need to store orderId/userId here
                dispatch(setPaymentStatus("initiate"));
            } else {
                throw new Error('Payment initiation failed');
            }
        } catch (e) {
            dispatch(setPaymentStatus("failure"));
        }
    };

    const isLoading = payment.state === "processing" ||
        payment.state === "persist" ||
        payment.state === "initiate";

    // Button is disabled if next step is not available OR terms are not accepted
    const isButtonDisabled = !nextEnabled || !payment.gtcAccepted;

    return (
        <Button
            variant="secondary"
            className="w-full flex items-center justify-center space-x-2"
            disabled={isButtonDisabled}
            onClick={onPay}
            loading={isLoading}
            id="pay-button"
        >
            <CreditCardIcon className="w-5 h-5" />
            {isLoading ? t("payment:processing") : t("payment:pay-now")}
        </Button>
    );
};
