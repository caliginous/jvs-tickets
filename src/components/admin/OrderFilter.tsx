import { ShippingType } from "../../store/factories/shipping/ShippingFactory";
import { PaymentType } from "../../store/factories/payment/PaymentFactory";
import { WaitingTextField } from "../WaitingTextField";
import { Button, Select, Input } from "../ui";
import { FilterIcon, XIcon } from "@heroicons/react/solid";
import { useRef, useState } from "react";

// Define option types for the Select component
type SelectOption<T extends string = string> = {
    value: T;
    label: string;
};

// Define event option type
type EventOption = {
    value: string;
    label: string;
    date: string;
};

// Define shipping and payment options
const shippingOptions: SelectOption<ShippingType>[] = [
    { value: ShippingType.Post, label: "Post" },
    { value: ShippingType.Download, label: "Download" },
    { value: ShippingType.BoxOffice, label: "BoxOffice" }
];

const paymentOptions: SelectOption<PaymentType>[] = [
    { value: PaymentType.CreditCard, label: "CreditCard" },
    { value: PaymentType.StripeIBAN, label: "StripeIBAN" },
    { value: PaymentType.Sofort, label: "Sofort" },
    { value: PaymentType.Invoice, label: "Invoice" },
    { value: PaymentType.PayPal, label: "PayPal" }
];

interface OrderFilterProps {
    filterChanged: (filter: Record<string, string>) => Promise<void>;
    events?: Array<{
        id: string;
        title: string;
        dates: Array<{
            id: string;
            date: string | null;
        }>;
    }>;
}

export const OrderFilter = ({ filterChanged, events = [] }: OrderFilterProps) => {
    const filter = useRef<Record<string, string>>({});
    const [filterAnchor, setFilterAnchor] = useState<null | HTMLElement>(null);
    const [localFilter, setLocalFilter] = useState<Record<string, string>>({});

    // Stable date formatting function to prevent hydration errors
    const formatEventDate = (dateString: string) => {
        const date = new Date(dateString);
        // Use London timezone instead of UTC
        return new Intl.DateTimeFormat('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            timeZone: 'Europe/London'
        }).format(date);
    };

    // Create event options sorted by date (latest to farthest)
    const eventOptions: EventOption[] = events
        .flatMap(event => 
            (event.dates || []).map(date => ({
                value: date.id,
                label: `${event.title} - ${date.date ? formatEventDate(date.date) : 'TBD'}`,
                date: date.date || '9999-12-31' // Put TBD dates at the end
            }))
        )
        .sort((a, b) => {
            // Sort by date, latest first
            if (a.date === '9999-12-31' && b.date === '9999-12-31') return 0;
            if (a.date === '9999-12-31') return 1;
            if (b.date === '9999-12-31') return -1;
            return new Date(b.date).getTime() - new Date(a.date).getTime();
        });

    const resetFilters = async () => {
        filter.current = {};
        setLocalFilter({});
        await filterChanged(filter.current);
    };

    const applyFilters = async () => {
        filter.current = { ...localFilter };
        await filterChanged(filter.current);
        setFilterAnchor(null);
    };

    const handleFilterChange = (name: string, value: string | undefined) => {
        if (value) {
            setLocalFilter(prev => ({ ...prev, [name]: value }));
        } else {
            setLocalFilter(prev => {
                const newFilter = { ...prev };
                delete newFilter[name];
                return newFilter;
            });
        }
    };



    return (
        <>
            <Button
                onClick={(event) => setFilterAnchor(event.currentTarget)}
                className="flex items-center space-x-2"
            >
                                            <FilterIcon className="w-4 h-4" />
                <span>Filter</span>
            </Button>
            
            {filterAnchor && (
                <div className="fixed inset-0 z-50" onClick={() => setFilterAnchor(null)}>
                    <div className="absolute inset-0 bg-black bg-opacity-25" />
                    <div 
                        className="absolute right-0 top-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 p-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="space-y-4">
                            {/* Shipping Filter */}
                            <div className="flex items-center space-x-2">
                                <div className="flex-1">
                                    <Select
                                        label="Shipping"
                                        value={localFilter?.shipping ?? ""}
                                        onChange={(val) => handleFilterChange("shipping", val || undefined)}
                                        options={shippingOptions}
                                        placeholder="Select shipping type"
                                    />
                                </div>
                                <button
                                    onClick={() => handleFilterChange("shipping", undefined)}
                                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <XIcon className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Event Filter */}
                            <div className="flex items-center space-x-2">
                                <div className="flex-1">
                                    <Select
                                        label="Event"
                                        value={localFilter?.eventDateId ?? ""}
                                        onChange={(val) => handleFilterChange("eventDateId", val || undefined)}
                                        options={eventOptions}
                                        placeholder="Select an event"
                                    />
                                </div>
                                <button
                                    onClick={() => handleFilterChange("eventDateId", undefined)}
                                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <XIcon className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Event ID Filter */}
                            <div className="flex items-center space-x-2">
                                <div className="flex-1">
                                    <Input
                                        label="Event ID"
                                        type="number"
                                        value={localFilter?.eventId ?? ""}
                                        onChange={(event) => handleFilterChange("eventId", event.target.value)}
                                    />
                                </div>
                                <button
                                    onClick={() => handleFilterChange("eventId", undefined)}
                                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <XIcon className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Event Title Filter */}
                            <div className="flex items-center space-x-2">
                                <div className="flex-1">
                                    <WaitingTextField
                                        value={localFilter?.event ?? ""}
                                        label="Event Title"
                                        onChange={(event) => handleFilterChange("event", event.target.value)}
                                    />
                                </div>
                                <button
                                    onClick={() => handleFilterChange("event", undefined)}
                                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <XIcon className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Customer Name Filters */}
                            <div className="flex items-center space-x-2">
                                <div className="flex-1 space-y-2">
                                    <WaitingTextField
                                        value={localFilter?.customerFirstName ?? ""}
                                        label="Customer First Name"
                                        onChange={(event) => handleFilterChange("customerFirstName", event.target.value)}
                                    />
                                    <WaitingTextField
                                        value={localFilter?.customerLastName ?? ""}
                                        label="Customer Last Name"
                                        onChange={(event) => handleFilterChange("customerLastName", event.target.value)}
                                    />
                                </div>
                                <button
                                    onClick={() => {
                                        handleFilterChange("customerFirstName", undefined);
                                        handleFilterChange("customerLastName", undefined);
                                    }}
                                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <XIcon className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Payment Filter */}
                            <div className="flex items-center space-x-2">
                                <div className="flex-1">
                                    <Select
                                        label="Payment"
                                        value={localFilter?.payment ?? ""}
                                        onChange={(val) => handleFilterChange("payment", val || undefined)}
                                        options={paymentOptions}
                                        placeholder="Select payment type"
                                    />
                                </div>
                                <button
                                    onClick={() => handleFilterChange("payment", undefined)}
                                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <XIcon className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Action Buttons */}
                            <div className="border-t border-gray-200 pt-4 space-y-2">
                                <Button
                                    onClick={applyFilters}
                                    className="w-full"
                                >
                                    <FilterIcon className="w-4 h-4 mr-2" />
                                    Apply Filters
                                </Button>
                                
                                <Button
                                    onClick={async () => {
                                        setFilterAnchor(null);
                                        await resetFilters();
                                    }}
                                    variant="secondary"
                                    className="w-full"
                                >
                                    <XIcon className="w-4 h-4 mr-2" />
                                    Reset All Filters
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
