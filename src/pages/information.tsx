
import React, { useEffect, useState } from "react";
import { CheckboxAccordion } from "../components/CheckboxAccordion";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
    selectPersonalInformation,
    setAddress, setCustomFields,
    setEmail, setServerCustomFields,
    setShipping
} from "../store/reducers/personalInformationReducer";
import { ShippingFactory, ShippingType } from "../store/factories/shipping/ShippingFactory";
import { AddressComponentLazy } from "../components/form/AddressComponentLazy";
import { getOption } from "../lib/options";
import { Options } from "../constants/Constants";
import useTranslation from "next-translate/useTranslation";
import loadNamespaces from "next-translate/loadNamespaces";
import { TicketNames } from "../components/form/TicketNames";
import prisma from "../lib/prisma";
import { selectOrder, setTicketPersonalizationRequired } from "../store/reducers/orderReducer";
import { useRouter } from "next/router";
import { formatPrice, validateAddress, validateTicketNames } from "../constants/util";
import { selectPayment } from "../store/reducers/paymentReducer";
import { CustomFields } from "../components/form/CustomFields";
import { InformationNextAvailable } from "../store/factories/nextAvailable/InformationNextAvailable";
import { Button, Input } from "../ui";

const validateEmail = (email) => {
    const re =
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
};

export default function Information({ deliveryMethods, categories, events, shippingFees }) {
    const selector = useAppSelector(selectPersonalInformation);
    const selectorOrder = useAppSelector(selectOrder);
    const currency = useAppSelector(selectPayment).currency;
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const [expanded, setExpanded] = useState(0);
    const router = useRouter();
    const [event, setEvent] = useState(null);

    useEffect(() => {
        setEvent(events.find(event => event.id === parseInt(router.query.event as string)));
    }, [events, router.isReady, router.query.event]);

    const [selectedShippingMethod, setSelectedShippingMethod] =
        useState<ShippingType | null>(selector.shipping?.type ?? null);
    const [emailError, setEmailError] = useState<string>(null);
    const [emailTouched, setEmailTouched] = useState<boolean>(false);

    const [isMdUp, setIsMdUp] = useState(false);

    useEffect(() => {
        const checkMediaQuery = () => {
            setIsMdUp(window.innerWidth >= 768); // md breakpoint
        };
        
        checkMediaQuery();
        window.addEventListener('resize', checkMediaQuery);
        return () => window.removeEventListener('resize', checkMediaQuery);
    }, []);

    const boxStyling = isMdUp ? { width: "60%" } : { width: "100%" };

    useEffect(() => {
        const emailValid = validateEmail(selector.email);

        setEmailError(
            selector.email.length == 0 || emailValid
                ? null
                : t("information:e-mail-error")
        );
    }, [selector, t]);

    useEffect(() => {
        if (!event) return;
        dispatch(setTicketPersonalizationRequired(event.personalTicket));
        dispatch(setServerCustomFields(event.customFields));
    }, [event, dispatch]);

    useEffect(() => {
        if (selectedShippingMethod === null) {
            // Default to Download shipping and hide the field
            dispatch(
                setShipping({
                    type: ShippingType.Download,
                    data: {}
                })
            );
            setSelectedShippingMethod(ShippingType.Download);
            return;
        }
        dispatch(
            setShipping({
                type: selectedShippingMethod,
                data: {}
            })
        );
    }, [selectedShippingMethod, dispatch]);

    const handleAccordionChange = (index) => (event, isExpanded) => {
        if (!isExpanded) return;
        setExpanded(index);
    }

    return (
        <div className="min-h-screen flex justify-center py-2">
            <div style={boxStyling} className="py-2">
                <div className="border border-gray-200 rounded-lg mb-4">
                    <details open={expanded === 0} className="group">
                        <summary 
                            className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 list-none"
                            onClick={() => handleAccordionChange(0)(null, expanded === 0 ? false : true)}
                        >
                            <span className="text-base font-medium text-gray-900">{t("information:address")}</span>
                            <div className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform">▼</div>
                        </summary>
                        <div className="px-4 pb-4 border-t border-gray-200">
                            <div className="p-1 space-y-2">
                                <p className="text-gray-900">
                                    {t("information:address-for-invoice")}
                                </p>
                                <Input
                                    label={t("information:e-mail")}
                                    type="email"
                                    value={selector.email}
                                    onChange={(event) =>
                                        dispatch(setEmail(event.target.value))
                                    }
                                    error={emailError != null ? emailError : undefined}
                                    helperText={emailTouched && emailError}
                                    name="address-email"
                                    onBlur={() => setEmailTouched(true)}
                                />
                                <AddressComponentLazy
                                    value={selector.address}
                                    onChange={(newValue) =>
                                        dispatch(setAddress(newValue))
                                    }
                                />
                                <CustomFields
                                    customFields={event?.customFields}
                                    onChange={(newValue) => dispatch(setCustomFields(newValue))}
                                    value={selector.customFields}
                                />
                                <Button
                                    onClick={() => setExpanded(event?.personalTicket ? 1 : 2)}
                                    className="w-full"
                                    id="information-address-next"
                                    disabled={!validateAddress(selector.address) ||
                                        !validateEmail(selector.email) ||
                                        !InformationNextAvailable.customFieldsValid(event?.customFields, selector.customFields)
                                    }
                                >
                                    {t("common:next")}
                                </Button>
                            </div>
                        </div>
                    </details>
                </div>
                {event?.personalTicket && (
                    <div className="border border-gray-200 rounded-lg mb-4">
                        <details open={expanded === 1} className="group">
                            <summary 
                                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 list-none"
                                onClick={() => handleAccordionChange(1)(null, expanded === 1 ? false : true)}
                            >
                                <span className="text-base font-medium text-gray-900">{t("information:tickets")}</span>
                                <div className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform">▼</div>
                            </summary>
                            <div className="px-4 pb-4 border-t border-gray-200">
                                <TicketNames ticketTypes={categories} />
                                <Button
                                    onClick={() => setExpanded(2)}
                                    className="w-full"
                                    id="information-tickets-next"
                                    disabled={!validateTicketNames(selectorOrder.tickets)}
                                >
                                    {t("common:next")}
                                </Button>
                            </div>
                        </details>
                    </div>
                )}
                
                <div className="border border-gray-200 rounded-lg mb-4">
                    <details open={expanded === 2} className="group">
                        <summary 
                            className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 list-none"
                            onClick={() => handleAccordionChange(2)(null, expanded === 2 ? false : true)}
                        >
                            <span className="text-base font-medium text-gray-900">{t("information:delivery")}</span>
                            <div className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform">▼</div>
                        </summary>
                        <div className="px-4 pb-4 border-t border-gray-200">
                            <p className="text-sm text-gray-600">
                                {t("information:download-description", null, { fallback: "Tickets will be available for download after payment." })}
                            </p>
                            <div className="mt-4">
                                <Button
                                    onClick={() => router.push('/payment')}
                                    className="w-full"
                                    id="information-continue-to-payment"
                                    disabled={!InformationNextAvailable.customFieldsValid(event?.customFields, selector.customFields) ||
                                              !validateEmail(selector.email) ||
                                              !validateAddress(selector.address)}
                                >
                                    Continue to Payment
                                </Button>
                            </div>
                        </div>
                    </details>
                </div>
            </div>
        </div>
    );
}

export async function getStaticProps({ locale }) {
    const deliveryMethods = await getOption(Options.Delivery);
    
    // Get all ticket types to use as categories
    const ticketTypes = await prisma.eventTicketType.findMany({
        where: { isActive: true },
        select: {
            id: true,
            name: true,
            price: true,
            colorHex: true
        }
    });
    
    // Transform ticket types to categories format for compatibility
    const categories = ticketTypes.map(tt => ({
        id: tt.id,
        label: tt.name,
        price: tt.price / 100,
        color: tt.colorHex || '#4F46E5'
    }));
    
    return {
        props: {
            deliveryMethods,
            categories,
            events: await prisma.event.findMany({
                select: {
                    personalTicket: true,
                    id: true,
                    customFields: {
                        select: {
                            name: true,
                            label: true,
                            isRequired: true
                        }
                    }
                }
            }),
            shippingFees: await getOption(Options.PaymentFeesShipping),
            theme: await getOption(Options.Theme),
            ...(await loadNamespaces({ locale, pathname: '/information' })),
            impressUrl: await getOption(Options.ImpressUrl)
        }
    };
}
