import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { EventProduct, TicketType } from "./types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function parseTicketTypes(event: EventProduct): TicketType[] {
  if (!event.ticketTypes || event.ticketTypes.length === 0) {
    // If no ticket types defined, create a default one from the event price
    if (event.eventPrice) {
      return [{
        label: 'General Admission',
        price: event.eventPrice,
        available: event.available !== false
      }]
    }
    return []
  }
  
  return event.ticketTypes.map(ticketType => ({
    label: ticketType.label || 'General Admission',
    type: ticketType.type,
    price: ticketType.price,
    available: ticketType.available !== false
  }))
}

export function getEventPrice(event: EventProduct): string {
  if (event.ticketTypes && event.ticketTypes.length > 0) {
    // If there are ticket types, return the first available one's price
    const availableTicket = event.ticketTypes.find(ticket => ticket.available !== false);
    if (availableTicket) {
      return availableTicket.price;
    }
  }
  
  // Fallback to event price or default
  return event.eventPrice || 'Price TBC';
}
