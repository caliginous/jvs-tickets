import React, { useEffect, useState } from "react";
import { StripeTextFieldCVC, StripeTextFieldExpiry, StripeTextFieldNumber } from "./stripe/StripeElementWrapper";
import { CardNumberElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { selectPayment, setPayment, setPaymentStatus } from "../../store/reducers/paymentReducer";
import { CreditCardPayment } from "../../store/factories/payment/CreditCardPayment";
import { PaymentType } from "../../store/factories/payment/PaymentFactory";
import { selectOrder } from "../../store/reducers/orderReducer";
import { selectEventSelected } from "../../store/reducers/eventSelectionReducer";
import useTranslation from "next-translate/useTranslation";
import { idempotencyCall } from "../../lib/idempotency/clientsideIdempotency";
import { Input } from "../../ui";

export const StripeCard = () => {
    const selector = useAppSelector(selectPayment);
    const selectorOrder = useAppSelector(selectOrder);
    const selectorEvent = useAppSelector(selectEventSelected);
    const dispatch = useAppDispatch();
    const { t } = useTranslation();

    const stripe = useStripe();

    const [state, setState] = React.useState({
        cardNumberComplete: false,
        expiredComplete: false,
        cvcComplete: false,
        cardNumberError: null,
        expiredError: null,
        cvcError: null
    });
    const [cardHolderName, setCardHolderName] = useState<string>("");

    const elements = useElements();

    useEffect(() => {
        const creditCardPayment = new CreditCardPayment(selector.payment);
        if (
            selector.state !== "initiate" ||
            selector.payment.type !== PaymentType.CreditCard ||
            !creditCardPayment.isValid()
        ) {
            return;
        }

        async function processPayment() {
            dispatch(setPaymentStatus("processing"));

            const response = await idempotencyCall(
                "api/payment_intent/stripe",
                { order: selectorOrder, eventId: selectorEvent }
            );

            if (response.status === 500) {
                throw new Error("Server Error: " + response.data);
            }

            const cardElement = elements!.getElement(CardNumberElement);
            const { error, paymentIntent } = await stripe!.confirmCardPayment(
                response.data.client_secret,
                {
                    payment_method: {
                        card: cardElement!,
                        billing_details: { name: cardHolderName }
                    }
                }
            );

            if (error || paymentIntent.status !== "succeeded") {
                throw new Error(error.message);
            }

            await idempotencyCall(
                "api/payment_intent/stripe_confirm_temp",
                {
                    order: selectorOrder,
                    paymentResult: JSON.stringify(paymentIntent)
                }
            );
            dispatch(setPaymentStatus("finished"));
        }

        processPayment().catch(() => dispatch(setPaymentStatus("failure")));
    }, [
        selector,
        cardHolderName,
        dispatch,
        elements,
        selectorOrder,
        selectorEvent,
        stripe
    ]);

    useEffect(() => {
        const creditCardPayment = new CreditCardPayment(null);
        creditCardPayment.setData({
            cardNumberComplete: state.cardNumberComplete,
            expiredComplete: state.expiredComplete,
            cvcComplete: state.cvcComplete
        });
        dispatch(setPayment(creditCardPayment.data));
    }, [state, dispatch]);

    const onElementChange =
        (field: string, errorField: string) =>
        ({ complete, error = { message: null } }: { complete: boolean; error?: { message: string | null } }) => {
            setState({
                ...state,
                [field]: complete,
                [errorField]: error.message
            });
        };

    const { cardNumberError, expiredError, cvcError } = state;

    return (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-12">
                <Input
                    label={t("payment:credit-card-name")}
                    required
                    onChange={(event) => setCardHolderName(event.target.value)}
                    value={cardHolderName}
                    id="stripe-card-name"
                    className="w-full"
                />
            </div>
            <div className="md:col-span-12">
                <StripeTextFieldNumber
                    error={Boolean(cardNumberError)}
                    labelErrorMessage={cardNumberError}
                    onChange={onElementChange(
                        "cardNumberComplete",
                        "cardNumberError"
                    )}
                    id="stripe-card-number"
                    label={t("payment:credit-card-number")}
                />
            </div>
            <div className="md:col-span-6">
                <StripeTextFieldExpiry
                    error={Boolean(expiredError)}
                    labelErrorMessage={expiredError}
                    onChange={onElementChange(
                        "expiredComplete",
                        "expiredError"
                    )}
                    id="stripe-card-expire"
                    label={t("payment:credit-card-expires")}
                />
            </div>
            <div className="md:col-span-6">
                <StripeTextFieldCVC
                    error={Boolean(cvcError)}
                    labelErrorMessage={cvcError}
                    onChange={onElementChange("cvcComplete", "cvcError")}
                    id="stripe-card-cvc"
                    label={t("payment:credit-card-cvc")}
                />
            </div>
        </div>
    );
};

export const StripeCardHeader = () => {
    const { t } = useTranslation();
    return (
        <h3 className="text-lg font-medium text-gray-900">
            {t("payment:credit-card")}
        </h3>
    );
};
