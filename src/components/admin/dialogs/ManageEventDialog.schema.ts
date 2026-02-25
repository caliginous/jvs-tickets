import { z } from 'zod';

export const TicketSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Ticket name is required'),
  price: z.number().min(0),
  quantity: z.number().int().min(0),
  salesStart: z.date().optional(),
  salesEnd: z.date().optional(),
});

export const ManageEventSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  subtitle: z.string().optional(),
  slug: z.string().min(3).regex(/^[a-z0-9-]+$/i, 'Only letters, numbers and hyphens'),
  description: z.string().max(2000, 'Description must be under 2000 characters').optional(),
  bespokeMessage: z.string().max(1200, 'Bespoke message must be under 200 words (1200 characters)').optional(),
  venueId: z.union([z.string(), z.number()]).optional().transform(val => val === "" ? undefined : val),

  // Seat map configuration
  seatType: z.enum(['free', 'seatmap']),
  seatMapId: z.union([z.string(), z.number(), z.null()]).optional().transform(val => {
    if (val === "" || val === null || val === undefined) return undefined;
    return val;
  }),
  personalTicket: z.boolean(),

  // Schedule
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format'),
  timezone: z.string().optional(),

  // Event date (simplified - single date only)
  eventDate: z.string().min(1, 'Event date is required'),
  eventDateTicketLimit: z.union([z.string(), z.number()]).optional().transform(val => {
    if (val === "" || val === null || val === undefined) return undefined;
    const num = typeof val === 'string' ? parseInt(val) : val;
    return isNaN(num) ? undefined : num;
  }),
  ticketSaleEndDate: z.string().optional(),

  // Categories (for free seating)
  selectedCategories: z.array(z.union([z.string(), z.number(), z.object({})])).default([]),

  // Custom fields
  customFields: z.array(z.object({
    label: z.string(),
    name: z.string(),
    isRequired: z.boolean(),
  })).default([]),

  // Visibility
  status: z.enum(['draft', 'published']).default('draft'),
  isActive: z.boolean().default(true),

  // Media
  coverImage: z.any().optional(),
  coverImageSize: z.number().optional(),
  removeCoverImage: z.boolean().default(false),
  
  // Ticket types tracking
  ticketTypesChanged: z.boolean().default(false),
}).refine((data) => {
  // Ensure we have an event date
  if (!data.eventDate) {
    return false;
  }
  return true;
}, { 
  message: 'Event date is required',
  path: ['eventDate']
}).refine((data) => {
  // Ensure end time is after start time
  if (data.startTime && data.endTime) {
    const start = new Date(`2000-01-01T${data.startTime}`);
    const end = new Date(`2000-01-01T${data.endTime}`);
    return end > start;
  }
  return true;
}, {
  message: 'End time must be after start time',
  path: ['endTime']
}).refine((data) => {
  // Validate seat map selection for seatmap type
  if (data.seatType === 'seatmap') {
    const seatMapId = typeof data.seatMapId === 'string' ? parseInt(data.seatMapId) : data.seatMapId;
    if (!seatMapId || seatMapId <= 0) {
      return false;
    }
  }
  return true;
}, {
  message: 'Seat map is required for seatmap type events',
  path: ['seatMapId']
}).refine((data) => {
  // For free seating events, require either categories (legacy) OR ticket types (new system)
  if (data.seatType === 'free') {
    const hasCategories = Array.isArray(data.selectedCategories) && data.selectedCategories.length > 0;
    const hasTicketTypes = data.ticketTypesChanged; // This indicates ticket types are being used
    
    if (!hasCategories && !hasTicketTypes) {
      return false;
    }
  }
  return true;
}, {
  message: 'Add at least one ticket type for free seating events',
  path: ['selectedCategories'] // Keep the path for UI purposes, but message is about ticket types
});

export type ManageEventValues = z.infer<typeof ManageEventSchema>;

// Default values for the form
export const defaultManageEventValues: ManageEventValues = {
  title: '',
  subtitle: '',
  slug: '',
  description: '',
  bespokeMessage: '',
  venueId: '1', // Default to first venue

  seatType: 'free',
  seatMapId: undefined,
  personalTicket: false,
  startTime: '19:00',
  endTime: '21:00',
  timezone: 'Europe/London',
  eventDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // tomorrow
  eventDateTicketLimit: 10, // Default to 10 tickets
  ticketSaleEndDate: undefined,
  selectedCategories: [], // Start with no categories selected
  customFields: [],
  status: 'draft',
  isActive: true,
  coverImage: undefined,
  coverImageSize: undefined,
  removeCoverImage: false,
  ticketTypesChanged: false,
};
