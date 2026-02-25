import React, { useCallback, useEffect, useRef, useState } from "react";

import prisma from "../../lib/prisma";
import { SeatMap } from "../../components/seatselection/seatmap/SeatSelectionMap";
import { getOption } from "../../lib/options";
import { Options } from "../../constants/Constants";
import loadNamespaces from "next-translate/loadNamespaces";
import { SeatSelectionFactory } from "../../components/seatselection/SeatSelectionFactory";
import { eventDateIsBookable } from "../../constants/util";
import useTranslation from "next-translate/useTranslation";
import { getCategoryTicketAmount, getSeatMap } from "../../constants/serverUtil";
import axios from "axios";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { selectOrder } from "../../store/reducers/orderReducer";
import { setCurrency } from "../../store/reducers/paymentReducer";

export default function SeatSelection({
    categories,
    seatMap,
    seatType,
    fallback,
    eventDate,
    seatMapId,
    containsPreview,
    currency
}) {
    const {t} = useTranslation();
    const [categoriesState, setCategoriesState] = useState(categories);
    const [seatMapState, setSeatMapState] = useState(seatMap);
    const interval = useRef<NodeJS.Timeout>();
    const order = useAppSelector(selectOrder);
    const dispatch = useAppDispatch();

    const loadData = useCallback(async () => {
        try {
            const query = order.reservationId ? "?reservationId=" + order.reservationId : "";
            const response = await axios.get("/api/bookingInformation/" + eventDate.id + query);
            setCategoriesState(old => response?.data?.categoryAmount ?? old);
            setSeatMapState(old => response?.data?.seatMap ?? old);
        } catch (e) {
            console.log(e);
        }
    }, [order.reservationId, eventDate.id]);

    useEffect(() => {
        dispatch(setCurrency(currency));
    }, [currency, dispatch]);

    useEffect(() => {
        loadData().catch(console.log);
        interval.current = setInterval(loadData, 30000);

        return () => {
            if (interval.current) {
                clearInterval(interval.current);
            }
        };
    }, [loadData]);

    if (fallback) return null;
    if (!eventDateIsBookable(eventDate))
        return (
            <h1>{t("common:event-not-bookable")}</h1>
        );

    return (
        <div className="min-h-screen flex justify-center flex-col w-full">
            <SeatSelectionFactory
                seatSelectionDefinition={seatMapState}
                categories={categoriesState}
                seatType={seatType}
                onSeatAlreadyBooked={loadData}
                seatMapId={seatMapId}
                containsPreview={containsPreview}
                currency={currency}
            />
        </div>
    );
}

export async function getStaticPaths() {
    const eventDates = await prisma.eventDate.findMany();
    const paths = eventDates.map((eventDate) => ({
        params: {eventDateId: eventDate.id.toString()}
    }));
    return { paths, fallback: "blocking"};
}

export async function getStaticProps({ params, locale }) {
    if (params.eventDateId === "[eventDateId]") return {props: { fallback: true }};

    const eventDate = await prisma.eventDate.findUnique({
        where: {
            id: parseInt(params.eventDateId)
        },
        include: {
            event: {
                include: {
                    seatMap: {
                        select: {
                            definition: true,
                            previewType: true
                        }
                    },
                    categories: {
                        include: {
                            category: true
                        }
                    }
                }
            },
            orders: {
                include: {
                    tickets: true
                }
            }
        }
    });

    if (!eventDate) {
        return {
            notFound: true
        };
    }

    const seatType = eventDate.event.seatType;
    const seatMapId = eventDate.event.seatMap?.definition ? eventDate.event.seatMap.definition : null;
    const containsPreview = eventDate.event.seatMap?.previewType === "preview";


    const categories = eventDate.event.categories.map(ce => ({
        id: ce.category.id,
        name: ce.category.label,
        price: ce.category.price,
        maxAmount: ce.maxAmount,
        color: ce.category.color
    }));

    const seatMap = eventDate.event.seatMap?.definition ? await getSeatMap(eventDate.id, true) : null;
    const currentAmounts = await getCategoryTicketAmount(eventDate.id);

    return {
        props: {
            eventDate: {
                id: eventDate.id,
                date: eventDate.date ? eventDate.date.toISOString() : null,
                title: eventDate.title,
                event: {
                    id: eventDate.event.id,
                    title: eventDate.event.title,
                    description: eventDate.event.description,
                    seatType: eventDate.event.seatType,
                    seatMap: eventDate.event.seatMap
                }
            },
            seatMap,
            categories,
            currency: await getOption(Options.Currency),
            fallback: false,
            ...(await loadNamespaces({ locale, pathname: '/seatselection/[eventDateId]' }))
        },
        revalidate: 60
    };
}
