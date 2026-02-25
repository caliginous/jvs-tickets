import { useAppSelector } from "../store/hooks";
import { selectOrder } from "../store/reducers/orderReducer";
import React, { useEffect, useMemo, useState } from "react";
import useTranslation from "next-translate/useTranslation";

export const ReservationCountdown = () => {
    const order = useAppSelector(selectOrder);
    const expiresAt = useMemo(
        () => order.reservationExpiresAt && new Date(order.reservationExpiresAt),
        [order.reservationExpiresAt]
    );
    const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
    const [ready, setReady] = useState(false);
    const { t } = useTranslation();

    useEffect(() => {
        if (!expiresAt) return;
        setReady(true);
        const update = () => setRemainingSeconds((expiresAt.getTime() - new Date().getTime()) / 1000);

        update();
        const timer = setInterval(update, 1000);
        return () => clearInterval(timer);
    }, [expiresAt]);

    const withLeadingZeros = (number: number) => number < 10 ? "0" + number : number.toString();

    const minutes = Math.floor((remainingSeconds / 60) % 60);
    const seconds = Math.floor(remainingSeconds % 60);
    const isOver = remainingSeconds <= 0;
    const hideInfo = remainingSeconds < -120;
    
    return (
        <div 
            className="absolute left-0 right-0 p-2.5 bg-blue-100 transition-all duration-300 ease-in-out"
            style={{
                bottom: order.reservationExpiresAt && !hideInfo ? "100%" : 0,
                zIndex: -1
            }}
        >
            {(order.reservationExpiresAt && !hideInfo) && (
                isOver ? (
                    <p className="text-sm text-center text-gray-700">
                        {t("common:seat-reservation-time-over")}
                    </p>
                ) : (
                    <div className="flex items-center justify-center space-x-2">
                        <span className="text-sm text-gray-700">
                            {t("common:time-until-title")}
                        </span>
                        <span className="text-sm font-bold text-gray-900">
                            <span suppressHydrationWarning>
                                {ready ? t("common:time-until", { 
                                    minutes: withLeadingZeros(minutes), 
                                    seconds: withLeadingZeros(seconds) 
                                }) : '00:00'}
                            </span>
                        </span>
                    </div>
                )
            )}
        </div>
    );
};
