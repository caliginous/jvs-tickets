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
  // Require ticket types
  return data.ticketTypesChanged === true;
}, {
  message: 'Add at least one ticket type',
  path: ['ticketTypesChanged']
});

export type ManageEventValues = z.infer<typeof ManageEventSchema>;

// Default values for the form
export const defaultManageEventValues: ManageEventValues = {
  title: '',
  subtitle: '',
  slug: '',
  description: '',
  bespokeMessage: '',
  venueId: '1',

  personalTicket: false,
  startTime: '19:00',
  endTime: '21:00',
  timezone: 'Europe/London',
  eventDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  eventDateTicketLimit: 10,
  ticketSaleEndDate: undefined,
  customFields: [],
  status: 'draft',
  isActive: true,
  coverImage: undefined,
  coverImageSize: undefined,
  removeCoverImage: false,
  ticketTypesChanged: false,
};
