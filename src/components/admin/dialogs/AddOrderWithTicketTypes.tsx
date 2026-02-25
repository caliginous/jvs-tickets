import { Dialog, Button, Input } from "../../../ui";
import React, { useState } from "react";
import axios from "axios";
import { showToast } from "../../../ui";

interface AddOrderWithTicketTypesProps {
    open: boolean;
    onClose: () => void;
    onOrderCreated: (orderId: string) => void;
    events: any[];
    eventDates: any[];
}

export default function AddOrderWithTicketTypes({ 
    open, 
    onClose, 
    onOrderCreated, 
    events, 
    eventDates 
}: AddOrderWithTicketTypesProps) {
    const [loading, setLoading] = useState(false);
    const [selectedEventId, setSelectedEventId] = useState("");
    const [selectedEventDateId, setSelectedEventDateId] = useState("");
    const [eventTicketTypes, setEventTicketTypes] = useState([]);
    const [selectedTicketTypeId, setSelectedTicketTypeId] = useState("");
    const [quantity, setQuantity] = useState(1);
    const [priceOverride, setPriceOverride] = useState("");
    const [customer, setCustomer] = useState({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        address: "",
        zip: "",
        city: "",
        countryCode: "GB",
        regionCode: ""
    });
    const [notes, setNotes] = useState("");

    // Load ticket types when event is selected
    const handleEventChange = async (eventId: string) => {
        console.log(`[ADD-ORDER-MODAL] 🔍 Event selected:`, { eventId, eventIdParsed: parseInt(eventId) });
        setSelectedEventId(eventId);
        setSelectedEventDateId("");
        setEventTicketTypes([]);
        setSelectedTicketTypeId("");
        
        if (eventId) {
            try {
                const response = await axios.get(`/api/admin/events/${eventId}/ticket-types`);
                const ticketTypes = response.data || [];
                setEventTicketTypes(ticketTypes);
                console.log(`[ADD-ORDER-MODAL] Loaded ${ticketTypes.length} ticket types for event ${eventId}:`, ticketTypes);
            } catch (error) {
                console.error('Error loading ticket types:', error);
                showToast.error('Failed to load ticket types for this event');
                setEventTicketTypes([]);
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!selectedEventId || !selectedEventDateId || !selectedTicketTypeId) {
            showToast.error("Please fill in all required fields");
            return;
        }

        if (!customer.firstName || !customer.lastName || !customer.email) {
            showToast.error("Please fill in customer information");
            return;
        }

        setLoading(true);
        
        try {
            const orderData = {
                eventId: parseInt(selectedEventId),
                eventDateId: parseInt(selectedEventDateId),
                items: [{
                    eventTicketTypeId: parseInt(selectedTicketTypeId),
                    quantity: quantity,
                    ...(priceOverride && priceOverride.trim() !== "" && { priceOverride: parseFloat(priceOverride) })
                }],
                customer: {
                    firstName: customer.firstName,
                    lastName: customer.lastName,
                    email: customer.email,
                    phone: customer.phone || "",
                    address: customer.address || "",
                    zip: customer.zip || "",
                    city: customer.city || "",
                    countryCode: customer.countryCode || "GB",
                    regionCode: customer.regionCode || ""
                },
                paymentMethod: "stripe_link",
                notes: notes || "",
                locale: "en"
            };

            console.log('[ADD-ORDER-MODAL] Sending order data:', JSON.stringify(orderData, null, 2));
            const response = await axios.post('/api/admin/orders/create-with-ticket-types', orderData);
            
            if (response.data.success) {
                const paymentLink = response.data.paymentLink;
                if (paymentLink) {
                    showToast.success(
                        `Order created successfully! Payment link has been sent to ${customer.email}`
                    );
                    console.log('🔗 PAYMENT LINK FOR CUSTOMER:', paymentLink);
                } else {
                    showToast.success("Order created successfully!");
                }
                onOrderCreated(response.data.orderId);
                onClose();
                
                // Reset form
                setSelectedEventId("");
                setSelectedEventDateId("");
                setEventTicketTypes([]);
                setSelectedTicketTypeId("");
                setQuantity(1);
                setPriceOverride("");
                setCustomer({
                    firstName: "",
                    lastName: "",
                    email: "",
                    phone: "",
                    address: "",
                    zip: "",
                    city: "",
                    countryCode: "GB",
                    regionCode: ""
                });
                setNotes("");
            } else {
                showToast.error(response.data.error || "Failed to create order");
            }
        } catch (error: any) {
            console.error('Error creating order:', error);
            showToast.error(error.response?.data?.error || "Failed to create order");
        } finally {
            setLoading(false);
        }
    };

    const filteredEventDates = eventDates.filter(date => 
        date.event?.id === parseInt(selectedEventId)
    );

    // Debug logging
    if (selectedEventId) {
        console.log(`[ADD-ORDER-MODAL] ✅ FIXED: Looking for event.id === ${selectedEventId}`);
        console.log(`[ADD-ORDER-MODAL] ✅ FILTERED RESULTS:`, filteredEventDates.length, 'out of', eventDates.length);
        if (filteredEventDates.length > 0) {
            console.log(`[ADD-ORDER-MODAL] ✅ SAMPLE FILTERED DATE:`, filteredEventDates[0]);
        }
    }

    return (
        <Dialog open={open} onClose={onClose} size="lg">
            <Dialog.Header>
                <h3 className="text-lg font-semibold">Add Order (Ticket Types)</h3>
            </Dialog.Header>
            <Dialog.Body>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Event Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Event *
                        </label>
                        <select
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={selectedEventId}
                            onChange={(e) => handleEventChange(e.target.value)}
                            required
                        >
                            <option value="">Select an event</option>
                            {events.map(event => (
                                <option key={event.id} value={event.id}>
                                    {event.title}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Event Date Selection */}
                    {selectedEventId && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Event Date *
                            </label>
                            <select
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={selectedEventDateId}
                                onChange={(e) => setSelectedEventDateId(e.target.value)}
                                required
                            >
                                <option value="">Select a date</option>
                                {filteredEventDates.map(date => (
                                    <option key={date.id} value={date.id}>
                                        {new Date(date.date).toLocaleString()}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Ticket Type Selection */}
                    {eventTicketTypes.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Ticket Type *
                            </label>
                            <select
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={selectedTicketTypeId}
                                onChange={(e) => setSelectedTicketTypeId(e.target.value)}
                                required
                            >
                                <option value="">Select a ticket type</option>
                                {eventTicketTypes.map(ticketType => (
                                    <option key={ticketType.id} value={ticketType.id}>
                                        {ticketType.name} - £{(ticketType.price / 100).toFixed(2)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Quantity and Price Override */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Quantity *
                            </label>
                            <Input
                                type="number"
                                min="1"
                                value={quantity}
                                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Price Override (£)
                            </label>
                            <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={priceOverride}
                                onChange={(e) => setPriceOverride(e.target.value)}
                                placeholder="Leave empty to use default price"
                            />
                        </div>
                    </div>

                    {/* Customer Information */}
                    <div className="border-t pt-4">
                        <h4 className="text-md font-medium text-gray-900 mb-3">Customer Information</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    First Name *
                                </label>
                                <Input
                                    value={customer.firstName}
                                    onChange={(e) => setCustomer({...customer, firstName: e.target.value})}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Last Name *
                                </label>
                                <Input
                                    value={customer.lastName}
                                    onChange={(e) => setCustomer({...customer, lastName: e.target.value})}
                                    required
                                />
                            </div>
                        </div>
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Email *
                            </label>
                            <Input
                                type="email"
                                value={customer.email}
                                onChange={(e) => setCustomer({...customer, email: e.target.value})}
                                required
                            />
                        </div>
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Phone
                            </label>
                            <Input
                                value={customer.phone}
                                onChange={(e) => setCustomer({...customer, phone: e.target.value})}
                            />
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Notes
                        </label>
                        <textarea
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows={3}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Optional notes for this order"
                        />
                    </div>
                </form>
            </Dialog.Body>
            <Dialog.Footer>
                <Button variant="secondary" onClick={onClose}>
                    Cancel
                </Button>
                <Button 
                    onClick={handleSubmit}
                    disabled={loading}
                >
                    {loading ? "Creating..." : "Create Order"}
                </Button>
            </Dialog.Footer>
        </Dialog>
    );
}
