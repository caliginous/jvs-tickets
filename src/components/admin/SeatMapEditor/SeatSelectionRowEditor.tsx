import { OnContextMenu, OnSeatSelect, Seat } from "../../seatselection/seatmap/SeatMapSeat";
import { SeatRow, SeatSelectionRow } from "../../seatselection/seatmap/SeatSelectionRow";
import { Popover, Transition } from "@headlessui/react";
import { 
    PlusIcon, 
    ChevronLeftIcon, 
    ChevronRightIcon, 
    MinusIcon 
} from "@heroicons/react/solid";
import React, { useState } from "react";
import { Button, Input } from "../../ui";

export type OnAddSeat = (seat: Seat, index: number) => unknown;
export type OnChangeSeat = (newSeat: Seat, index) => unknown;

export const SeatSelectionRowEditor = ({
    row,
    categories,
    onSelectSeat,
    onAddSeat,
    onChangeSeat,
    currency
}: {
    row: SeatRow;
    categories: Array<any>;
    onSelectSeat?: OnSeatSelect;
    onAddSeat?: OnAddSeat;
    onChangeSeat?: OnChangeSeat;
    currency: string;
}) => {
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [newSeatIndex, setNewSeatIndex] = useState<number>(-1);
    const [seatAmount, setSeatAmount] = useState<number>(0);
    const [seatContext, setSeatContext] = useState<any>(null);
    const [seatId, setSeatId] = useState("");

    const handleOpenMenu = () => {
        setIsPopoverOpen(true);
        setSeatAmount(1);
        setNewSeatIndex(row.length);
    };

    const handleContextMenu: OnContextMenu = (event, seat, indexInRow) => {
        setIsPopoverOpen(true);
        setSeatContext(seat);
        setNewSeatIndex(indexInRow);
        setSeatAmount(seat.amount);
        setSeatId(seat.id.toString() ?? "");
    };

    const handleClose = () => {
        setIsPopoverOpen(false);
        setNewSeatIndex(-1);
        setSeatContext(null);
        setSeatId("");
        setSeatAmount(1);
    };

    const handleAddSeat = (category) => {
        if (seatContext) {
            onChangeSeat({
                category: category?.id,
                amount: seatAmount,
                type: category === undefined ? "space" : "seat",
                id: parseInt(seatId)
            }, newSeatIndex);
            handleClose();
            return;
        }
        onAddSeat(
            {
                category: category?.id,
                amount: seatAmount,
                type: category === undefined ? "space" : "seat",
                ...(seatId !== "" && ({id: parseInt(seatId)}))
            },
            newSeatIndex
        );
        handleClose();
    };

    const handleLeft = () => {
        if (newSeatIndex <= 0) return;
        setNewSeatIndex((prev) => prev - 1);
    };

    const handleRight = () => {
        if (newSeatIndex >= row.length) return;
        setNewSeatIndex((prev) => prev + 1);
    };

    const mutatedRow = row.map((a) => {
        return { ...a };
    });
    if (newSeatIndex >= 0 && !seatContext) {
        mutatedRow.splice(newSeatIndex, 0, {
            type: "seat",
            category: -1,
            amount: seatAmount
        });
    }
    if (seatContext) {
        mutatedRow[newSeatIndex] = {
            id: seatContext.id,
            type: "seat",
            category: seatContext.category,
            amount: seatAmount
        };
    }

    const mutatedCategories = categories.map((a) => {
        return { ...a };
    });
    mutatedCategories.push({
        id: -1,
        label: "New Seat",
        color: "#333333",
        price: 0
    });

    return (
        <div className="flex">
            <SeatSelectionRow
                row={mutatedRow}
                categories={mutatedCategories}
                forceNoRedux
                onSelectSeat={onSelectSeat}
                onContextMenu={handleContextMenu}
                currency={currency}
            />
            <button
                onClick={handleOpenMenu}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Add seat"
            >
                <PlusIcon className="w-5 h-5" />
            </button>
            
            <Popover className="relative">
                {({ open }) => (
                    <Transition.Root
                        show={open}
                        as={React.Fragment}
                        enter="transition ease-out duration-100"
                        enterFrom="transform opacity-0 scale-95"
                        enterTo="transform opacity-100 scale-100"
                        leave="transition ease-in duration-75"
                        leaveFrom="transform opacity-100 scale-100"
                        leaveTo="transform opacity-0 scale-95"
                    >
                        <Popover.Panel className="absolute z-50 mt-2 w-72 rounded-md border border-gray-200 bg-white p-3 shadow-lg">
                                <div className="flex flex-col items-center space-y-3">
                                    <Input
                                        label="Id"
                                        value={seatId}
                                        onChange={(event) => setSeatId(event.target.value)}
                                        className="w-full"
                                    />
                                    
                                    {!seatContext && (
                                        <>
                                            <span className="text-sm font-medium text-gray-700">Position:</span>
                                            <div className="flex gap-2 w-full">
                                                <Button
                                                    variant="secondary"
                                                    onClick={handleLeft}
                                                    disabled={newSeatIndex <= 0}
                                                    className="flex-1"
                                                >
                                                    <ChevronLeftIcon className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="secondary"
                                                    onClick={handleRight}
                                                    disabled={newSeatIndex >= row.length}
                                                    className="flex-1"
                                                >
                                                    <ChevronRightIcon className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </>
                                    )}
                                    
                                    <span className="text-sm font-medium text-gray-700">Amount:</span>
                                    <div className="flex gap-2 w-full">
                                        <Button
                                            variant="secondary"
                                            onClick={() => setSeatAmount((prev) => prev - 1)}
                                            disabled={seatAmount <= 1}
                                            className="flex-1"
                                        >
                                            <MinusIcon className="w-4 h-4" />
                                        </Button>
                                        <span className="flex items-center justify-center px-3 text-sm font-medium text-gray-700 min-w-[3rem]">
                                            {seatAmount}
                                        </span>
                                        <Button
                                            variant="secondary"
                                            onClick={() => setSeatAmount((prev) => prev + 1)}
                                            className="flex-1"
                                        >
                                            <PlusIcon className="w-4 h-4" />
                                        </Button>
                                    </div>
                                    
                                    <div className="text-center">
                                        <span className="text-sm font-medium text-gray-700">
                                            Choose Category to Add Seat:
                                        </span>
                                    </div>
                                    
                                    <div className="flex flex-col gap-2 w-full">
                                        {categories.map((category, index) => (
                                            <Button
                                                key={index}
                                                variant="secondary"
                                                onClick={() => handleAddSeat(category)}
                                                className="w-full justify-start"
                                            >
                                                <span 
                                                    className="w-3 h-3 rounded-full mr-2"
                                                    style={{ backgroundColor: category.color }}
                                                />
                                                {category.label}
                                            </Button>
                                        ))}
                                        <Button 
                                            variant="secondary"
                                            onClick={() => handleAddSeat(undefined)}
                                            className="w-full justify-start"
                                        >
                                            Spacing
                                        </Button>
                                    </div>
                                </div>
                        </Popover.Panel>
                    </Transition.Root>
                )}
            </Popover>
        </div>
    );
};
