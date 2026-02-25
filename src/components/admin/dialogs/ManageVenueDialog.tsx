import { useEffect, useState } from "react";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import axios from "axios";
import { showToast } from "../../../ui";
import { Dialog, Button, Input, Textarea } from "../../../ui";
import { ManageVenueSchema, type ManageVenueValues, defaultManageVenueValues } from "./ManageVenueDialog.schema";

interface Venue {
    id: string;
    name: string;
    address?: string;
    city?: string;
    postcode?: string;
    description?: string;
    createdAt: string;
    createdBy: {
        userName: string;
    };
    _count: {
        events: number;
    };
}

interface ManageVenueDialogProps {
    open: boolean;
    venue?: Venue | null;
    onClose: () => void;
    onChange: () => void;
}

export const ManageVenueDialog = ({
    open,
    venue,
    onClose,
    onChange
}: ManageVenueDialogProps) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isEditing = !!venue;

    const form = useForm<ManageVenueValues>({
        resolver: zodResolver(ManageVenueSchema),
        defaultValues: defaultManageVenueValues
    });

    const { register, handleSubmit, formState: { errors }, setValue, reset } = form;

    // Reset form when dialog opens/closes or venue changes
    useEffect(() => {
        if (open && venue) {
            // Editing existing venue
            setValue("name", venue.name);
            setValue("address", venue.address || '');
            setValue("city", venue.city || '');
            setValue("postcode", venue.postcode || '');
            setValue("description", venue.description || '');
        } else if (open && !venue) {
            // Creating new venue
            reset(defaultManageVenueValues);
        }
    }, [open, venue, setValue, reset]);

    const onSubmit = async (values: ManageVenueValues) => {
        try {
            setIsSubmitting(true);

            if (isEditing) {
                // Update existing venue
                await axios.put(`/api/admin/venues/${venue.id}`, values);
                showToast.success('Venue updated successfully');
            } else {
                // Create new venue
                await axios.post('/api/admin/venues', values);
                showToast.success('Venue created successfully');
            }

            onChange(); // Refresh the venues list
            onClose();
        } catch (error: any) {
            console.error('Error saving venue:', error);
            const errorMessage = error.response?.data?.error || 'Failed to save venue';
            showToast.error(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (!isSubmitting) {
            reset(defaultManageVenueValues);
            onClose();
        }
    };

    return (
        <Dialog open={open} onClose={handleClose} size="md">
            <Dialog.Header>
                <h3 className="text-lg font-semibold">
                    {isEditing ? 'Edit Venue' : 'Create Venue'}
                </h3>
            </Dialog.Header>

            <form onSubmit={handleSubmit(onSubmit)}>
                <Dialog.Body>
                    <div className="space-y-4">
                        <Input
                            label="Venue Name"
                            {...register("name")}
                            error={errors.name?.message}
                            placeholder="Enter venue name"
                            required
                        />

                        <Input
                            label="Address"
                            {...register("address")}
                            error={errors.address?.message}
                            placeholder="Enter street address"
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="City"
                                {...register("city")}
                                error={errors.city?.message}
                                placeholder="Enter city"
                            />

                            <Input
                                label="Postcode"
                                {...register("postcode")}
                                error={errors.postcode?.message}
                                placeholder="Enter postcode"
                            />
                        </div>

                        <Textarea
                            label="Description"
                            {...register("description")}
                            error={errors.description?.message}
                            placeholder="Enter venue description (optional)"
                            rows={3}
                        />
                    </div>
                </Dialog.Body>

                <Dialog.Footer>
                    <div className="flex justify-end space-x-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleClose}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            loading={isSubmitting}
                        >
                            {isEditing ? 'Update Venue' : 'Create Venue'}
                        </Button>
                    </div>
                </Dialog.Footer>
            </form>
        </Dialog>
    );
};











