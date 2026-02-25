import * as React from "react";
import {
    AuBankAccountElement,
    CardCvcElement,
    CardExpiryElement,
    CardNumberElement,
    FpxBankElement,
    IbanElement,
    IdealBankElement
} from "@stripe/react-stripe-js";
import { StripeInput } from "./StripeInput";
import { Input } from "../../ui";

type StripeElement =
    | typeof AuBankAccountElement
    | typeof CardCvcElement
    | typeof CardExpiryElement
    | typeof CardNumberElement
    | typeof FpxBankElement
    | typeof IbanElement
    | typeof IdealBankElement;

interface StripeTextFieldProps<T extends StripeElement> {
    label?: string;
    error?: boolean;
    helperText?: string;
    labelErrorMessage?: string;
    onChange?: React.ComponentProps<T>["onChange"];
    stripeElement?: T;
    fullWidth?: boolean;
    [key: string]: any;
}

export const StripeTextField = <T extends StripeElement>(
    props: StripeTextFieldProps<T>
) => {
    const {
        helperText,
        inputProps,
        error,
        labelErrorMessage,
        stripeElement,
        ...other
    } = props;

    return (
        <div className="space-y-2">
            <Input
                label={props.label}
                error={error ? labelErrorMessage : undefined}
                helper={error ? labelErrorMessage : helperText}
            />
            <StripeInput
                component={stripeElement}
                options={inputProps?.options}
                onChange={props.onChange}
            />
        </div>
    );
};

export function StripeTextFieldNumber(
    props: StripeTextFieldProps<typeof CardNumberElement>
) {
    return (
        <StripeTextField
            label="Credit Card Number"
            stripeElement={CardNumberElement}
            {...props}
        />
    );
}

export function StripeTextFieldExpiry(
    props: StripeTextFieldProps<typeof CardExpiryElement>
) {
    return (
        <StripeTextField
            label="Expires"
            stripeElement={CardExpiryElement}
            {...props}
        />
    );
}

export function StripeTextFieldCVC(
    props: StripeTextFieldProps<typeof CardCvcElement>
) {
    return (
        <StripeTextField
            label="CVC Code"
            stripeElement={CardCvcElement}
            {...props}
        />
    );
}

export function StripeTextFieldIBAN(
    props: StripeTextFieldProps<typeof IbanElement>
) {
    return (
        <StripeTextField label="IBAN" stripeElement={IbanElement} inputProps={{options: { supportedCountries: ['SEPA'] }}} {...props} />
    );
}
