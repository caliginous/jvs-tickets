import { SeatSelectionFreeEntry } from "./SeatSelectionFreeEntry";
import { PlusIcon } from "@heroicons/react/solid";
import React, { useState } from "react";
import { useAppSelector } from "../../../store/hooks";
import {
    OrderState,
    selectOrder, setTickets, Tickets
} from "../../../store/reducers/orderReducer";
import { useDispatch } from "react-redux";
import { formatPrice } from "../../../constants/util";
import useTranslation from "next-translate/useTranslation";
import { motion } from "framer-motion";
import seatSelectionText from "../../../../locale/en/seatselection.json";
import commonText from "../../../../locale/en/common.json";
import { Button } from "../../../ui";

export const SeatSelectionFree = ({ categories, currency }) => {
    const order = useAppSelector(selectOrder) as OrderState;
    categories = categories
        .filter(category => (category.ticketsLeft !== null && typeof category.ticketsLeft !== "undefined" ? category.ticketsLeft > 0 : true) ||
            (order.tickets.some(ticket => ticket.categoryId === category.id && order.reservationExpiresAt && order.reservationExpiresAt > new Date().getTime()))
        );
    const dispatch = useDispatch();
    const { t } = useTranslation();
    const [currentlySelectedCategories, setCurrentlySelectedCategories] = useState([categories[0]?.id ?? 1]);

    const handleChange = (index, amount: number, categoryId, oldCategory) => {
        if (categoryId === -1) return;
        const newTickets: Tickets = order.tickets.map(a => a).filter(a => a.categoryId !== oldCategory);
        const category = categories.find(c => c.id === categoryId);
        if (category) {
            newTickets.push(...Array.from(Array(amount).keys()).map(() => ({
                categoryId: categoryId, 
                amount: 1, 
                price: category.price
            })));
        }
        dispatch(setTickets(newTickets));
        const newValue = currentlySelectedCategories.map(a => a);
        newValue[index] = categoryId;
        setCurrentlySelectedCategories(newValue);
    };

    const handleAddCategory = () => {
        if (currentlySelectedCategories.length >= categories.length) return;
        setCurrentlySelectedCategories([...currentlySelectedCategories, -1]);
    };

    const handleRemoveCategory = (index) => {
        if (currentlySelectedCategories.length < index || currentlySelectedCategories.length <= 1) return;
        const categoryId = currentlySelectedCategories[index];
        const newValue = currentlySelectedCategories.map(a => a);
        newValue.splice(index, 1);
        setCurrentlySelectedCategories(newValue);
        dispatch(setTickets(order.tickets.map(a => a).filter(a => a.categoryId !== categoryId)))
    };

    const price = order.tickets.reduce((a, ticket) => a + categories.find(category => category.id === ticket.categoryId).price, 0);

    return (
        <div className="flex flex-col items-center justify-center w-full lg:w-2/3">
            {categories.length > 0 ? (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full justify-center">
                        {currentlySelectedCategories &&
                            currentlySelectedCategories.length > 0 &&
                            currentlySelectedCategories.map((o, index) => {
                                return (
                                    <div key={index} className="w-full">
                                        <SeatSelectionFreeEntry
                                            categories={categories}
                                            onChange={handleChange}
                                            index={index}
                                            onRemove={handleRemoveCategory}
                                            tickets={order.tickets}
                                            currentlySelectedCategories={currentlySelectedCategories}
                                            category={o}
                                            currency={currency}
                                        />
                                    </div>
                                );
                            })}
                    </div>
                    <motion.div layout>
                        <div className="h-5" />
                        <Button
                            variant="secondary"
                            onClick={handleAddCategory}
                            disabled={
                                currentlySelectedCategories && currentlySelectedCategories.length >= categories.length
                            }
                            id="seat-selection-free-add-category"
                            className="flex items-center space-x-2"
                        >
                            <PlusIcon className="w-5 h-5" />
                            {t("seatselection:add-category", null, { fallback: seatSelectionText["add-category"] })}
                        </Button>
                        <div className="h-5" />
                        <p className="text-base text-gray-900" suppressHydrationWarning>
                            {t("common:total-price", null, { fallback: commonText["total-price"] })}:{" "}
                            <span className="font-bold" id="seat-selection-free-total-price">
                                {categories.length > 0 && formatPrice(price, currency)}
                            </span>
                        </p>
                    </motion.div>
                </>
            ) : (
                <h2 className="text-2xl font-bold text-center text-gray-900">
                    {t("seatselection:event-booked-out")}
                </h2>
            )}
        </div>
    );
};
