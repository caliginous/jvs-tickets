import React, { useEffect, useRef, useState, useCallback } from "react";
import { SeatSelectionMap } from "./seatmap/SeatSelectionMap";
import { SeatSelectionFree } from "./free/SeatSelectionFree";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { selectOrder, setReservationExpiresAt, setReservationId, setTickets } from "../../store/reducers/orderReducer";
import { v4 as uuid } from "uuid";
import { selectEventSelected } from "../../store/reducers/eventSelectionReducer";
import useTranslation from "next-translate/useTranslation";
import { usePrevious } from "../../constants/hooks";
import isEqual from "lodash/isEqual";
import { executeRequest, RecaptchaResultType } from "../../lib/recaptcha";
import { idempotencyCall } from "../../lib/idempotency/clientsideIdempotency";
import { Button, Dialog } from "../../ui";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "../ui";

export const SeatSelectionFactory = ({
                                         seatType,
                                         categories,
                                         seatSelectionDefinition,
                                         noWrap,
                                         hideSummary,
                                         onSeatAlreadyBooked,
                                         seatMapId,
                                         containsPreview,
                                         currency,
                                         noReservation
}: {
    seatType: string,
    categories: Array<any>,
    seatSelectionDefinition: Array<any>,
    seatMapId?: number,
    noWrap?: boolean,
    hideSummary?: boolean,
    onSeatAlreadyBooked?: Function,
    containsPreview?: boolean
    currency: string;
    noReservation?: boolean;
}) => {
    const {t} = useTranslation();
    const dispatch = useAppDispatch();
    const order = useAppSelector(selectOrder);
    const event = useAppSelector(selectEventSelected);
    const timer = useRef<NodeJS.Timeout>(null);
    const [error, setError] = useState(null);
    const previousTickets = usePrevious(order.tickets);
    const recaptchaValue = useRef(null);

    const sendReservation = useCallback(async () => {
        if (noReservation) return;
        let reservationId = order.reservationId;
        if (!reservationId) {
            reservationId = uuid();
            dispatch(setReservationId(reservationId))
        }
        if (recaptchaValue.current === null) {
            recaptchaValue.current = await executeRequest(
                process.env.NEXT_PUBLIC_RECAPTCHA_API_KEY,
                "reservation",
                process.env.NEXT_PUBLIC_RECAPTCHA_ENTERPRISE && process.env.NEXT_PUBLIC_RECAPTCHA_ENTERPRISE === "true"
            );
        }
        try {
            // we can retry if the call fails
            const response = await idempotencyCall("/api/order/reservation", {
                token: recaptchaValue.current,
                id: reservationId,
                tickets: order.tickets,
                eventDateId: event
            }, {method: "PUT"});
            if (response.data.invalidTickets && response.data.invalidTickets.length > 0) {
                dispatch(setTickets(response.data.validTickets));
                setError({
                    title: t("common:tickets-already-booked-title"),
                    content: t("common:tickets-already-booked-content"),
                    invalidTickets: response.data.invalidTickets
                })
                if (onSeatAlreadyBooked) onSeatAlreadyBooked();
            }
            dispatch(setReservationExpiresAt(response.data.expiresAt));
        } catch (e) {
            if (e?.response?.data?.error && e.response.data.error === RecaptchaResultType.Timeout) {
                recaptchaValue.current = null;
                return await sendReservation();
            }
            setError({
                title: t("common:unknown-error"),
                content: t("common:ticket-reservation-error-content")
            })
        }
    }, [noReservation, order.reservationId, order.tickets, event, dispatch, t, onSeatAlreadyBooked]);

    const cancelReservation = useCallback(() => {
        if (order.reservationId === undefined) return undefined;
        fetch(
            "/api/order/reservation?id=" + order.reservationId,
            {
                method: "DELETE"
            }
        );
        return undefined;
    }, [order.reservationId]);

    useEffect(() => {
        if (isEqual(previousTickets, order.tickets)) return;
        if (timer.current) {
            clearTimeout(timer.current);
            timer.current = null;
        }
        if (order.tickets.length === 0) {
            cancelReservation();
            dispatch(setReservationExpiresAt(null));
            return;
        }

        // Wait 2s for more seats, so we don't overwhelm server with requests
        timer.current = setTimeout(sendReservation, 2000);
    }, [order.tickets, cancelReservation, dispatch, previousTickets, sendReservation]);

    useEffect(() => {
        window.onbeforeunload = cancelReservation;
    }, [order.reservationId, cancelReservation]);

    let seatSelection;
    let containerStyles: React.CSSProperties = {
        alignItems: "center",
        justifyContent: "center"
    };

    switch (seatType) {
        case "seatmap":
            seatSelection = (
                <SeatSelectionMap
                    categories={categories}
                    seatSelectionDefinition={seatSelectionDefinition}
                    hideSummary={hideSummary}
                    seatMapId={seatMapId}
                    containsPreview={containsPreview}
                    currency={currency}
                />
            );
            containerStyles.width = "100%";
            containerStyles.maxHeight = "100%";
            containerStyles.flex = "1 1 auto";
            break;
        case "free":
        default:
            seatSelection = <SeatSelectionFree categories={categories} currency={currency} />;
    }

    return (
        <>
            {noWrap ? seatSelection : (
                <div className="flex w-full max-h-full flex-1" style={containerStyles}>
                    {seatSelection}
                </div>
            )}
            
            <Dialog open={error !== null} onClose={() => setError(null)}>
                <Dialog.Header>
                    <h2 className="text-xl font-semibold">{error?.title}</h2>
                </Dialog.Header>
                <Dialog.Body>
                    <div className="space-y-4">
                        <p className="text-gray-700">{error?.content}</p>
                        
                        {error?.invalidTickets && (
                            <>
                                <p className="font-bold text-gray-900">
                                    {t("common:number-of-tickets-unavailable", { ticketAmount: error.invalidTickets.length })}
                                </p>
                                
                                <Accordion type="single" collapsible>
                                    <AccordionItem value="occupied-tickets">
                                        <AccordionTrigger className="text-left">
                                            {t("common:view-occupied-tickets")}
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <div className="space-y-2">
                                                {error?.invalidTickets?.map((ticket, index) => {
                                                    const category = categories.find(category => category.id === ticket.categoryId);
                                                    return (
                                                        <div key={index} className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg">
                                                            <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                                                                {index + 1}
                                                            </span>
                                                            <div className="flex-1">
                                                                <p className="font-medium text-gray-900">{category.label}</p>
                                                                {ticket.seatId && (
                                                                    <p className="text-sm text-gray-600">
                                                                        {t("common:seat", { seat: ticket.seatId })}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                </Accordion>
                            </>
                        )}
                    </div>
                </Dialog.Body>
                <Dialog.Footer>
                    <Button
                        onClick={() => setError(null)}
                        id="seat-reservation-error-close"
                    >
                        {t("common:close")}
                    </Button>
                </Dialog.Footer>
            </Dialog>
        </>
    );
}
