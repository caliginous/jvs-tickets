import { IAddress } from "./interfaces";
import { PersonalInformationState } from "../store/reducers/personalInformationReducer";
import axios from "axios";
import { OrderState, Tickets } from "../store/reducers/orderReducer";
import { idempotencyCall } from "../lib/idempotency/clientsideIdempotency";

export type AddressValidator = (address: IAddress) => boolean;
export const addressValidatorMap: Record<string, AddressValidator> = {
    firstName: (address) =>
        address?.firstName != null && address.firstName.length > 1,
    lastName: (address) =>
        address?.lastName != null && address.lastName.length > 1,
    address: (address) =>
        address?.address != null &&
        address.address.length > 5 &&
        hasNumber(address.address),
    zip: (address) => {
        const raw = address?.zip ?? "";
        if (raw.length === 0) return false;
        const input = raw.toUpperCase().trim();
        // UK postcode format (accepts with/without space)
        const ukPostcode = /^(GIR 0AA|(?:[A-PR-UWYZ][0-9]{1,2}|(?:[A-PR-UWYZ][A-HK-Y][0-9]{1,2})|(?:[A-PR-UWYZ][0-9][A-HJKPSTUW])|(?:[A-PR-UWYZ][A-HK-Y][0-9][ABEHMNPRVWXY])) ?[0-9][ABD-HJLNP-UW-Z]{2})$/i;
        return ukPostcode.test(input);
    },
    city: (address) => address?.city != null && address.city.length > 3,
    country: (address) => address?.country != null,
    region: (address) => true // Region is now always optional since it's hidden from frontend
};

export const validateAddress = (address: IAddress) => {
    return Object.values(addressValidatorMap).every((addressValidator) =>
        addressValidator(address)
    );
};

export const validateTicketNames = (tickets) => {
    return tickets.every(ticket => (ticket.firstName ?? "").length > 2 && (ticket.lastName ?? "").length > 2);
}

export const hasNumber = (myString) => {
    return /\d/.test(myString);
};

export const storeOrderAndUser = async (
    order: OrderState,
    user: PersonalInformationState,
    eventDateId,
    paymentType,
    idempotencyKey
) => {
    if (order.orderId && user.userId)
        return { userId: user.userId, orderId: order.orderId };
    const response = await idempotencyCall("/api/order/store", {
        order: order,
        user: user,
        eventDateId: eventDateId,
        paymentType: paymentType,
        locale: navigator.language
    }, {
        idempotencyKey: idempotencyKey
    });
    return { userId: response.data.userId, orderId: response.data.orderId };
};

export const getStoreWithOrderId = async (
    orderId
): Promise<{
    personalInformation: PersonalInformationState;
    order: OrderState;
    eventId: number;
}> => {
    const response = await axios.post("/api/order", { orderId: orderId });
    const { user, order, eventDateId } = response.data;
    return { personalInformation: user, order: order, eventId: eventDateId };
};

export const validatePayment = async (orderId, withResult?: boolean): Promise<boolean> => {
    if (!orderId || orderId === "") return false;
    const response = await axios.post("api/order/validate_intent", {
        orderId: orderId,
        withResult
    });
    return response.data.valid;
};

// Type for database tickets (without price property)
export type DatabaseTicket = Omit<import("../store/reducers/orderReducer").Ticket, "price">;

export const getServiceFeeAmount = (fees, type) => {
    return fees ? fees[type] ?? 0 : 0;
}

export const calculateTotalPrice = (
    tickets: DatabaseTicket[],
    categories: Array<{ id: number; price: number }>,
    shippingFees = null,
    paymentFees = null,
    shippingType = null,
    paymentType = null
): number => {
    const shippingPrice = getServiceFeeAmount(shippingFees, shippingType);
    const paymentPrice = getServiceFeeAmount(paymentFees, paymentType);
    
    const ticketTotal = tickets.reduce((a, ticket) => {
        // Handle EventTicketType (ticketTypeId, eventTicketTypeId) systems
        let ticketPrice = 0;
        const ticketTypeId = ticket.ticketTypeId || (ticket as any).eventTicketTypeId;
        const ticketType = categories.find((c: { id: number }) => c.id === ticketTypeId);
        ticketPrice = ticketType?.price || 0;
        return a + ((ticket as any).amount * ticketPrice);
    }, 0);
    
    return ticketTotal + shippingPrice + paymentPrice;
};

export const totalTicketAmount = (order: OrderState): number => {
    return order.tickets.length;
};

export const totalSeatAmount = (order: OrderState): number => {
    return order.tickets.reduce((a, ticket) => a + ticket.amount, 0);
};

export const summarizeTicketAmount = (tickets: Tickets, ticketTypes: Array<{id: number;}>, hideEmptyTypes?: boolean) => {
    let items = ticketTypes
        .map(ticketType => ({ticketTypeId: ticketType.id, amount: tickets.filter(ticket => ticket.ticketTypeId === ticketType.id).length}));
    if (hideEmptyTypes)
        return items.filter(item => item.amount > 0);
    return items;
}

export const formatPrice = (price: number, currency: string = "GBP"): string => {
    if (typeof navigator === "undefined") return "";
    return new Intl.NumberFormat(navigator.language, {
        style: "currency",
        currency: currency
    }).format(price);
};
export const arrayEquals = (a, b) => {
    return (
        Array.isArray(a) &&
        Array.isArray(b) &&
        a.length === b.length &&
        a.every((val) => b.indexOf(val) !== -1)
    );
};

export const encodeTicketQR = (ticketId, secret) => {
    return Buffer.from(JSON.stringify({id: ticketId, secret: secret})).toString("base64");
}

export const decodeTicketQR = (readValue): {id: string; secret: string} => {
    const buffer = new Buffer(readValue, "base64");
    return JSON.parse(buffer.toString());
}

export const getEventTitle = (eventDate: {title?: string; event: {title: string}}) => {
    return eventDate?.title ?? eventDate?.event?.title;
}

export const eventDateIsBookable = (eventDate: {ticketSaleStartDate?: string | Date; ticketSaleEndDate?: string | Date; date?: string | Date;}, currentDate?: Date) => {
    if (!currentDate) currentDate = new Date();
    const isAfterRegistration = eventDate.ticketSaleStartDate !== null ? new Date(eventDate.ticketSaleStartDate).getTime() < currentDate.getTime() : true;
    const endDate = eventDate.ticketSaleEndDate ?? eventDate.date;
    const isBeforeEnd = endDate !== null ? new Date(endDate).getTime() > currentDate.getTime() : true;
    return isAfterRegistration && isBeforeEnd;
}
