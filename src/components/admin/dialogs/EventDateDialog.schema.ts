import { z } from 'zod';

export const EventDateSchema = z.object({
  mode: z.enum(['single', 'range']),
  date: z.date().optional(),
  range: z.object({ 
    from: z.date(), 
    to: z.date() 
  }).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format'),
  timezone: z.string().min(1, 'Timezone is required'),
  title: z.string().optional(),
  totalTicketLimit: z.number().min(1).optional(),
  ticketSaleStartDate: z.date().optional(),
  ticketSaleEndDate: z.date().optional(),
  recurrence: z.object({
    enabled: z.boolean(),
    freq: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).optional(),
    interval: z.number().min(1).max(52).optional(),
    byweekday: z.array(z.number()).optional(),
    until: z.date().optional(),
    count: z.number().min(1).max(999).optional(),
  }).optional(),
}).refine((data) => {
  // Ensure we have either a single date or a range
  if (data.mode === 'single' && !data.date) {
    return false;
  }
  if (data.mode === 'range' && (!data.range?.from || !data.range?.to)) {
    return false;
  }
  return true;
}, { 
  message: 'Please select a valid date or date range',
  path: ['date']
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
  // If range mode, ensure end date is after start date
  if (data.mode === 'range' && data.range?.from && data.range?.to) {
    return data.range.to > data.range.from;
  }
  return true;
}, {
  message: 'End date must be after start date',
  path: ['range']
}).refine((data) => {
  // If ticket sale dates are set, ensure they're valid
  if (data.ticketSaleStartDate && data.ticketSaleEndDate) {
    return data.ticketSaleEndDate > data.ticketSaleStartDate;
  }
  return true;
}, {
  message: 'Ticket sale end date must be after start date',
  path: ['ticketSaleEndDate']
});

export type EventDateFormValues = z.infer<typeof EventDateSchema>;

// Default values for the form
export const defaultEventDateValues: EventDateFormValues = {
  mode: 'single',
  startTime: '09:00',
  endTime: '17:00',
  timezone: 'Europe/London',
  recurrence: {
    enabled: false,
  }
};
