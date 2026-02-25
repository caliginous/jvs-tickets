import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { 
    PlusCircleIcon, 
    MinusCircleIcon, 
    TrashIcon 
} from "@heroicons/react/solid";
import { formatPrice } from "../../../constants/util";
import useTranslation from "next-translate/useTranslation";
import seatSelectionText from "../../../../locale/en/seatselection.json";
import commonText from "../../../../locale/en/common.json";
import { Tickets } from "../../../store/reducers/orderReducer";
import { Button, Input, Select, type Option } from "../../ui";

export const SeatSelectionFreeEntry = ({
    onChange,
    categories,
    index,
    currentlySelectedCategories,
    tickets,
    onRemove,
    category,
    currency
}: {
    onChange?: (index: number, amount: number, categoryId, oldCategory) => unknown;
    categories: Array<{
        id: number;
        label: string;
        price: number;
        ticketsLeft: number;
    }>;
    index: number;
    currentlySelectedCategories: Array<number>;
    tickets: Tickets;
    onRemove?: (index: number, categoryId: number) => unknown;
    category?: number;
    currency: string;
}) => {
    const alreadyUsedCategories = currentlySelectedCategories.filter((_, i) => i !== index);
    const categoriesFiltered = categories.filter(category => !alreadyUsedCategories.includes(category.id));

    const [ticketAmount, setTicketAmount] = useState<number>(tickets.filter(ticket => ticket.categoryId === category).length);
    const { t } = useTranslation();

    useEffect(() => {
        setTicketAmount(tickets.filter(ticket => ticket.categoryId === category).length)
    }, [tickets, category]);

    const getTicketsLeft = (categoryId?: number) => {
        return categories.find((value) => value.id === (categoryId ?? category))?.ticketsLeft ?? Infinity;
    }

    const handleChange = (event) => {
        if (event.target.value === "") {
            setTicketAmount(-1);
            return;
        }
        const newValue = Math.min(isNaN(parseInt(event.target.value)) ? 0 : parseInt(event.target.value), getTicketsLeft());
        setTicketAmount(newValue);
        onChange(index, newValue, category, category);
    };

    const onAdd = () => {
        if (category === -1) return;
        const val = Math.min(ticketAmount + 1, getTicketsLeft());
        setTicketAmount(val);
        onChange(index, val, category, category);
    };

    const onSubtract = () => {
        if (ticketAmount <= 0 || category === -1) return;
        setTicketAmount(ticketAmount - 1);
        onChange(index, ticketAmount - 1, category, category);
    };

    const handleCategoryChange = (option: Option<string> | null) => {
        if (option) {
            onChange(index, Math.min(ticketAmount, getTicketsLeft(parseInt(option.value))), parseInt(option.value), category);
        }
    };

    const categoryPrice = categories.find((value) => value.id === category)?.price ?? 0;
    const price = ticketAmount * categoryPrice;

    return (
        <motion.div layout>
            <div className="flex flex-col p-5 m-5 bg-white rounded-lg shadow-lg border border-gray-200">
                <div className="flex items-center justify-center">
                    <div className="flex flex-col space-y-2">
                        <Input
                            id="outlined-basic"
                            label={t("common:amount", null, { fallback: commonText["amount"] })}
                            value={ticketAmount === -1 ? "" : ticketAmount}
                            onChange={handleChange}
                            className="seat-selection-free-ticket-amount"
                            type="number"
                            min={0}
                        />
                        {getTicketsLeft() < Infinity && (
                            <p className="text-xs text-gray-500">
                                {t("seatselection:tickets-left", { ticketsLeft: getTicketsLeft() })}
                            </p>
                        )}
                    </div>
                    <div className="w-5" />
                    <div className="flex flex-col space-y-2">
                        <button
                            onClick={onAdd}
                            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors seat-selection-free-add"
                            aria-label="Add ticket"
                        >
                            <PlusCircleIcon className="w-6 h-6" />
                        </button>
                        <button
                            onClick={onSubtract}
                            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors seat-selection-free-remove"
                            aria-label="Remove ticket"
                        >
                            <MinusCircleIcon className="w-6 h-6" />
                        </button>
                    </div>
                </div>
                
                <div className="mt-4 space-y-2">
                    <label 
                        htmlFor={`category-selection-${index}`}
                        className="block text-sm font-medium text-gray-700"
                    >
                        {t("common:category", null, { fallback: commonText["category"] })}
                    </label>
                    <Select
                        value={category === -1 ? "" : category?.toString() || ""}
                        onChange={(val) => {
                            if (val) {
                                const selectedCategory = categoriesFiltered.find(cat => cat.id.toString() === val);
                                if (selectedCategory) {
                                    handleCategoryChange({
                                        value: val,
                                        label: `${selectedCategory.label} (${formatPrice(selectedCategory.price, currency)})`
                                    });
                                }
                            }
                        }}
                        options={categoriesFiltered.map((cat) => ({
                            value: cat.id.toString(),
                            label: `${cat.label} (${formatPrice(cat.price, currency)})`
                        }))}
                        placeholder="Select category"
                        className="category-selection"
                    />
                </div>
                
                <motion.div
                    layout
                    className="py-2.5 self-center"
                >
                    {price > 0 && (
                        <p className="text-base text-gray-900">
                            {t("common:price", null, { fallback: commonText["price"] })}:{" "}
                            <span className="font-bold">{formatPrice(price, currency)}</span>
                        </p>
                    )}
                </motion.div>
                
                {index > 0 && (
                    <Button
                        variant="secondary"
                        onClick={() => onRemove(index, category)}
                        className="self-center seat-selection-free-remove-category flex items-center space-x-2"
                    >
                        <TrashIcon className="w-4 h-4" />
                        {t("seatselection:remove-category", null, { fallback: seatSelectionText["remove-category"] })}
                    </Button>
                )}
            </div>
        </motion.div>
    );
};
