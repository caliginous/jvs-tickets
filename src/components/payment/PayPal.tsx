import React, { useRef } from "react";
import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import type { OnClickActions, OnApproveData } from "@paypal/paypal-js/types/components/buttons";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { selectOrder, setOrderId } from "../../store/reducers/orderReducer";
import { selectEventSelected } from "../../store/reducers/eventSelectionReducer";
import { selectPersonalInformation, setUserId } from "../../store/reducers/personalInformationReducer";
import { selectPayment, setPaymentStatus, setIdempotencyKey } from "../../store/reducers/paymentReducer";
import { validatePayment } from "../../constants/util";
import { v4 as uuid } from "uuid";
import Image from "next/image";
import logo from "../../assets/payment/paypal.svg";
import { idempotencyCall } from "../../lib/idempotency/clientsideIdempotency";

export const PayPal = () => {
    const selectorOrder = useAppSelector(selectOrder);
    const selectedEvent = useAppSelector(selectEventSelected);
    const userInformation = useAppSelector(selectPersonalInformation);
    const payment = useAppSelector(selectPayment);
    const dispatch = useAppDispatch();

    const orderIdRef = useRef<string>(null);

    const click = async (data, actions: OnClickActions) => {
        const paymentAlreadyValid = await validatePayment(
            orderIdRef.current ? orderIdRef.current : selectorOrder.orderId,
            true
        );
        if (paymentAlreadyValid) {
            dispatch(setPaymentStatus("finished"));
            return actions.reject();
        }
        return actions.resolve();
    };

    const createOrder = async (): Promise<string> => {
        let idempotencyKey = payment.idempotencyKey;
        if (idempotencyKey === null) {
            // generate payment request overarching idempotencyKey
            idempotencyKey = uuid();
            dispatch(setIdempotencyKey(idempotencyKey));
        }
        
        // UPDATED: No longer creating order here - webhook will handle order creation
        // Just create the PayPal payment intent
        const response = await idempotencyCall("api/payment_intent/paypal", {
            order: selectorOrder,
            user: userInformation,
            eventDateId: selectedEvent,
            paymentType: "paypal",
            locale: navigator.language,
            idempotencyKey: idempotencyKey
        });
        
        if (response.status === 201) {
            return null;
        }
        return response.data.orderId;
    };

    const onFailed = () => {
        dispatch(setPaymentStatus("failure"));
    };

    const onApproved = async (data: OnApproveData) => {
        // UPDATED: Webhook will handle order creation and payment processing
        const response = await idempotencyCall("api/webhook/paypal", {
            paypalId: data.orderID,
            // No orderId needed - webhook will create order
        });
        if (response.status !== 200) {
            dispatch(setPaymentStatus("failure"));
            return;
        }
        dispatch(setPaymentStatus("finished"));
    };

    if (!payment.gtcAccepted) return null;

    return (
        <>
            <PayPalScriptProvider
                options={{
                    "client-id": process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID,
                    currency: payment.currency
                }}
            >
                <PayPalButtons
                    style={{
                        color: "blue",
                        layout: "horizontal",
                        label: "buynow",
                        tagline: false
                    }}
                    createOrder={createOrder}
                    onError={onFailed}
                    onCancel={onFailed}
                    onApprove={onApproved}
                    onClick={click}
                    fundingSource={"paypal"}
                />
            </PayPalScriptProvider>
        </>
    );
};

export const PayPalHeader = () => {
    return <Image src={logo} height={20} alt="PayPal Logo" />;
};
