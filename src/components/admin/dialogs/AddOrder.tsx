import { Dialog, Button, Input } from "../../../ui";
import { EventSelection } from "../../EventSelection/EventSelection";
import React, { useEffect, useState } from "react";
import { Provider } from "react-redux";
import { store } from "../../../store/store";
import {
    resetPersonalInformation,
    setAddress,
    setEmail,
    setShipping
} from "../../../store/reducers/personalInformationReducer";
import { AddressComponentLazy } from "../../form/AddressComponentLazy";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import { ShippingFactory, ShippingType } from "../../../store/factories/shipping/ShippingFactory";
import { CheckboxAccordion } from "../../CheckboxAccordion";
import informationText from "../../../../locale/en/information.json";
import { PaymentMethods } from "../../payment/PaymentMethods";


import { resetEvent, setEvent } from "../../../store/reducers/eventSelectionReducer";
import { showToast } from "../../../ui";
import { ConfirmDialog } from "./ConfirmDialog";
import { resetOrder } from "../../../store/reducers/orderReducer";
import { resetPayment, setGtcAccepted } from "../../../store/reducers/paymentReducer";
import { XIcon, ChevronDownIcon } from "@heroicons/react/solid";

interface props {
    open: boolean;
    events: Array<any>;
    eventDates: Array<any>;
    categories: Array<any>;
    onClose: () => unknown;
    onAdd: () => unknown;
    paymentFees: any;
    currency: string;
}

const AddOrderInner = ({open, events, eventDates, categories, onClose, onAdd, paymentFees, currency}: props) => {
    const selector = useAppSelector((state) => state);
    const [orderStored, setOrderStored] = useState(false);
    const [expandedSections, setExpandedSections] = useState({
        seatSelection: true,
        personalInfo: false,
        paymentInfo: false
    });
    const dispatch = useAppDispatch();

    useEffect(() => {
        if (!open) return;
        dispatch(setGtcAccepted(true));
    }, [open, dispatch]);

    useEffect(() => {
        if (selector.payment.state !== "finished") return;
        setOrderStored(true)
    }, [selector.payment]);

    const storeOrder = async () => {
        // This legacy endpoint is deprecated
        showToast.error(
            "This order creation method is deprecated. Please use the 'Create Order' button " +
            "on the Orders page instead, which supports the modern ticket type system."
        );
    };

    const handleCloseConfirmation = () => {
        setOrderStored(false);
        dispatch(resetEvent());
        dispatch(resetOrder());
        dispatch(resetPayment());
        dispatch(resetPersonalInformation());
        onAdd();
    }

    const canStore = true; // Simplified since workflow system removed

    const event = eventDates.find(event => event.id === selector.selectedEvent.selectedEvent);

    const toggleSection = (section: string) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    return (
        <>
            <Dialog open={open} onClose={onClose} size="full">
                <Dialog.Header>
                    <div className="flex items-center justify-between w-full">
                        <h2 className="text-xl font-semibold">Add Order</h2>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                            aria-label="close"
                        >
                            <XIcon className="w-6 h-6" />
                        </button>
                    </div>
                </Dialog.Header>
                <Dialog.Body>
                    <div className="space-y-6">
                        {/* Seat Selection Section */}
                        <div className="border border-gray-200 rounded-lg">
                            <button
                                onClick={() => toggleSection('seatSelection')}
                                className="w-full px-4 py-3 text-left bg-gray-50 hover:bg-gray-100 transition-colors rounded-t-lg flex items-center justify-between"
                            >
                                <span className="font-medium">Seat Selection</span>
                                <ChevronDownIcon 
                                    className={`w-5 h-5 transition-transform ${expandedSections.seatSelection ? 'rotate-180' : ''}`} 
                                />
                            </button>
                            {expandedSections.seatSelection && (
                                <div className="p-4 border-t border-gray-200">
                                    <div className="space-y-4">
                                        <EventSelection events={events} onChange={(id) => dispatch(setEvent(id))} />
                                        {event && (
                                            <div className="p-4 bg-gray-50 rounded-md">
                                                <p className="text-sm text-gray-600">
                                                    Selected event: {event.event?.title || 'Unknown event'}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-2">
                                                    To add orders with ticket types, please use the Create Order modal instead.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Personal Information Section */}
                        <div className="border border-gray-200 rounded-lg">
                            <button
                                onClick={() => toggleSection('personalInfo')}
                                className="w-full px-4 py-3 text-left bg-gray-50 hover:bg-gray-100 transition-colors rounded-t-lg flex items-center justify-between"
                            >
                                <span className="font-medium">Personal Information</span>
                                <ChevronDownIcon 
                                    className={`w-5 h-5 transition-transform ${expandedSections.personalInfo ? 'rotate-180' : ''}`} 
                                />
                            </button>
                            {expandedSections.personalInfo && (
                                <div className="p-4 border-t border-gray-200">
                                    <div className="space-y-4">
                                        <Input
                                            label="E-Mail"
                                            type="email"
                                            value={selector.personalInformation.email}
                                            onChange={(event) =>
                                                dispatch(setEmail(event.target.value))
                                            }
                                        />
                                        <AddressComponentLazy
                                            value={selector.personalInformation.address}
                                            onChange={(newValue) =>
                                                dispatch(setAddress(newValue))
                                            }
                                        />
                                        {Object.values(ShippingType)
                                            .map((shippingType) => {
                                                const instance = ShippingFactory.getShippingInstance({type: shippingType, data: null});
                                                return (
                                                    <CheckboxAccordion
                                                        label={informationText[instance.DisplayName]}
                                                        name={shippingType}
                                                        selectedItem={selector.personalInformation?.shipping?.type}
                                                        onSelect={method => {
                                                            dispatch(
                                                                setShipping({
                                                                    type: method as ShippingType,
                                                                    data: {}
                                                                })
                                                            )
                                                        }}
                                                        key={shippingType}
                                                    >
                                                        {instance.Component}
                                                    </CheckboxAccordion>
                                                )
                                            })
                                        }
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Payment Information Section */}
                        <div className="border border-gray-200 rounded-lg">
                            <button
                                onClick={() => toggleSection('paymentInfo')}
                                className="w-full px-4 py-3 text-left bg-gray-50 hover:bg-gray-100 transition-colors rounded-t-lg flex items-center justify-between"
                            >
                                <span className="font-medium">Payment Information</span>
                                <ChevronDownIcon 
                                    className={`w-5 h-5 transition-transform ${expandedSections.paymentInfo ? 'rotate-180' : ''}`} 
                                />
                            </button>
                            {expandedSections.paymentInfo && (
                                <div className="p-4 border-t border-gray-200">
                                    <PaymentMethods
                                        paymentMethods={["invoice"]}
                                        paymentFees={paymentFees}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="pt-4">
                            <Button
                                onClick={storeOrder}
                                disabled={!canStore}
                                loading={
                                    selector.payment.state === "processing" ||
                                    selector.payment.state === "persist" ||
                                    selector.payment.state === "initiate"
                                }
                                className="w-full"
                            >
                                Store Order
                            </Button>
                        </div>
                    </div>
                </Dialog.Body>
            </Dialog>
            <ConfirmDialog
                open={orderStored}
                onConfirm={handleCloseConfirmation}
                onClose={handleCloseConfirmation}
                text={"Successfully stored order!"}
            />
        </>
    )
}

export const AddOrder = (props: props) => {
    return (
        <Provider store={store}>
            <AddOrderInner {...props} />
        </Provider>
    )
}
