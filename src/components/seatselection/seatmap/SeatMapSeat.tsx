
import { motion } from "framer-motion";
import React, { useEffect, useState } from "react";
import { useAppSelector } from "../../../store/hooks";
import { OrderState, selectOrder } from "../../../store/reducers/orderReducer";
import { SEAT_COLORS } from "../../../constants/Constants";
import { formatPrice } from "../../../constants/util";
import useTranslation from "next-translate/useTranslation";
import seatselection from "../../../../locale/en/seatselection.json";
import common from "../../../../locale/en/common.json";

export interface Seat {
    type: "seat" | "space";
    id?: number;
    category?: number;
    amount?: number;
    occupied?: boolean;
}

export type OnSeatSelect = (seat: Seat, indexInRow, isSelected: boolean) => unknown;
export type OnContextMenu = (event: React.MouseEvent<HTMLDivElement>, seat: Seat, indexInRow, isSelected: boolean) => unknown;

export const SeatMapSeat = ({
    seat,
    categories,
    onSeatSelect,
    forceNoRedux,
    index,
    onContextMenu,
    currency
}: {
    seat: Seat;
    categories: Array<{
        id: number;
        label: string;
        price: number;
        color?: string;
        activeColor?: string;
        occupiedColor?: string;
    }>;
    onSeatSelect?: OnSeatSelect;
    onContextMenu?: OnContextMenu;
    forceNoRedux?: boolean;
    index: number;
    currency: string;
}) => {
    const [isSelected, setIsSelected] = useState(false);
    const reduxOrder = (useAppSelector(selectOrder) as OrderState);
    const orders = !forceNoRedux
        ? reduxOrder
        : null;
    const { t } = useTranslation();

    useEffect(() => {
        setIsSelected(
            orders?.tickets?.some((val) => val.seatId === seat.id) ?? false
        );
    }, [orders, seat.id]);

    const handleSelect = () => {
        if (seat.occupied) return;
        if (onSeatSelect) onSeatSelect(seat, index, !isSelected);
        setIsSelected((prev) => !prev);
    };

    const handleContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
        if (!onContextMenu) return;
        event.preventDefault();
        onContextMenu(event, seat, index, isSelected);
    };

    const category = categories.find(
        (category) => category.id === seat.category
    );
    if (!category) return null;

    const color = isSelected
        ? category.activeColor ?? SEAT_COLORS.active
        : seat.occupied
        ? category.occupiedColor ?? SEAT_COLORS.occupied
        : category.color ?? SEAT_COLORS.normal;
    return (
        <div className="relative group">
            <motion.div
                className="flex justify-center items-center relative cursor-pointer transition-all duration-300 seat-selection-seatmap-seat"
                style={{
                    height: "40px",
                    width: (seat.amount ?? 1) * 40 + ((seat.amount ?? 1) - 1) * 8,
                    backgroundColor: color,
                    borderRadius: "8px",
                    margin: "4px"
                }}
                whileHover={{
                    opacity: 0.6,
                    transition: { duration: 0.1, delay: 0 }
                }}
                onClick={handleSelect}
                onContextMenu={handleContextMenu}
            >
                <span>{seat.id}</span>
            </motion.div>
            
            {/* Custom tooltip */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                {(seat.occupied && !isSelected) ? (
                    <p>{t("seatselection:seat-booked", null, { fallback: seatselection["seat-booked"] })}</p>
                ) : (
                    <>
                        <p>{t("common:category", null, { fallback: common["category"] })}: {category.label}</p>
                        <p>{t("common:price", null, { fallback: common["price"] })}: {formatPrice(category.price * seat.amount, currency)}</p>
                    </>
                )}
            </div>
        </div>
    );
};

export const SeatMapSpace = ({ seat }: { seat: Seat }) => {
    return (
        <div
            className="flex justify-center items-center relative cursor-pointer transition-all duration-300"
            style={{
                height: "40px",
                width: (seat.amount ?? 1) * 40,
                cursor: "initial",
                margin: "4px"
            }}
        />
    );
};
