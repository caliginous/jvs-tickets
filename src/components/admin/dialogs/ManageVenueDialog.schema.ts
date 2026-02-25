import { z } from 'zod';

export const ManageVenueSchema = z.object({
  name: z.string().min(3, 'Venue name must be at least 3 characters').max(100, 'Venue name must be under 100 characters'),
  address: z.string().max(200, 'Address must be under 200 characters').optional().or(z.literal('')),
  city: z.string().max(100, 'City must be under 100 characters').optional().or(z.literal('')),
  postcode: z.string().max(20, 'Postcode must be under 20 characters').optional().or(z.literal('')),
  description: z.string().max(500, 'Description must be under 500 characters').optional().or(z.literal(''))
});

export type ManageVenueValues = z.infer<typeof ManageVenueSchema>;

export const defaultManageVenueValues: ManageVenueValues = {
  name: '',
  address: '',
  city: '',
  postcode: '',
  description: ''
};











