import { ChangeEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { showToast } from "../../../ui";
import { Dialog, Button, Input, Select, Switch, Textarea } from "../../../ui";
import { Listbox } from '@headlessui/react';
import { DayPicker } from 'react-day-picker';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import axios from "axios";
import { ConfirmDialog } from "./ConfirmDialog";
import { arrayEquals, formatPrice } from "../../../constants/util";
import dynamic from 'next/dynamic';

import { PhotographIcon, CalendarIcon, ClockIcon, GlobeAltIcon, TrashIcon, ClipboardListIcon } from '@heroicons/react/solid';
import Image from "next/image";

import { ManageEventSchema, type ManageEventValues, defaultManageEventValues } from "./ManageEventDialog.schema";

import { EventCustomFieldsDialog } from "./EventCustomFieldsDialog";
import { toUTC, fromUTC, COMMON_TIMEZONES, getCurrentTime } from "../../../utils/datetime";
import { generateSlug } from "../../../utils/slug";
import EventTicketTypesPanel from "../events/EventTicketTypesPanel";
import 'react-day-picker/dist/style.css';

// Dynamic import to avoid SSR issues with ReactQuill
const MinimalEditor = dynamic(() => import('../../MinimalEditor'), { ssr: false });

interface ManageEventDialogProps {
    open: boolean;
    event: any;
    venues: any[];
    onClose: () => void;
    onChange: () => void;
    currency: string;
}

export const ManageEventDialog = ({
    open,
    event,
    venues,
    onClose,
    onChange,
    currency
}: ManageEventDialogProps) => {
    const [openPreview, setOpenPreview] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [eventToDelete, setEventToDelete] = useState<any>(null);
    const [coverImage, setCoverImage] = useState<File | null>(null);
    const [coverImageSize, setCoverImageSize] = useState<number | null>(null);
    const [removeCoverImage, setRemoveCoverImage] = useState(false);

    const [customFieldsOpen, setCustomFieldsOpen] = useState(false);
    const [slugEdited, setSlugEdited] = useState(false);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [isSubmittingForm, setIsSubmittingForm] = useState(false);
    const [hasEventTicketTypes, setHasEventTicketTypes] = useState(false);
    
    // Local state for ticket types during creation
    const [localTicketTypes, setLocalTicketTypes] = useState<any[]>([]);

    const form = useForm({
        resolver: zodResolver(ManageEventSchema),
        defaultValues: {
            ...defaultManageEventValues,
            title: event?.title ?? "",
            description: event?.description ?? "",
            venueId: event?.venueId ? event.venueId.toString() : ((venues?.length ?? 0) > 0 ? venues[0].id.toString() : ""),
            personalTicket: event?.personalTicket ?? false,
            isActive: event?.isActive ?? true,
            eventDate: event?.dates?.[0]?.date ? new Date(event.dates[0].date).toISOString().split('T')[0] : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            eventDateTicketLimit: event?.dates?.[0]?.totalTicketLimit || undefined,
            ticketSaleEndDate: event?.dates?.[0]?.ticketSaleEndDate ? new Date(event.dates[0].ticketSaleEndDate).toISOString().slice(0, 16) : undefined,
            customFields: event?.customFields ?? [],
            startTime: event?.dates?.[0]?.date ? (() => {
                // Extract time from ISO string to avoid timezone conversion issues
                const isoString = new Date(event.dates[0].date).toISOString();
                return isoString.split('T')[1].slice(0, 5);
            })() : '19:00',
            endTime: event?.dates?.[0]?.date ? (() => {
                // Calculate end time based on start time + 2 hours, preserving the original time
                const isoString = new Date(event.dates[0].date).toISOString();
                const timeStr = isoString.split('T')[1];
                const [hours, minutes] = timeStr.slice(0, 5).split(':').map(Number);
                const endHours = (hours + 2) % 24;
                return `${endHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            })() : '21:00',
            ticketTypesChanged: false, // Track if ticket types have been modified
        } as ManageEventValues
    });



    const { control, handleSubmit, watch, setValue, formState: { errors, isSubmitting }, reset } = form;

    // Watch values for conditional rendering
    const title = watch('title');
    const subtitle = watch('subtitle');
    const venueId = watch('venueId');
    const ticketSaleEndDate = watch('ticketSaleEndDate');

    // Auto-generate slug when title changes (if not manually edited)
    useEffect(() => {
        if (title && !slugEdited && !event?.slug) {
            const autoSlug = generateSlug(title);
            if (autoSlug) {
                form.setValue('slug', autoSlug);
            }
        }
    }, [title, slugEdited, event?.slug, form]);

    // Require ticket types
    const ticketTypesValid = hasEventTicketTypes;
    const isValidRealTime = title && venueId && ticketTypesValid;


    // Check if form has changes
    // Watch all fields that should trigger change detection
    const watchedTitle = watch('title');
    const watchedDescription = watch('description');
    const watchedBespokeMessage = watch('bespokeMessage');
    const watchedSlug = watch('slug');
    const watchedVenueId = watch('venueId');
    const watchedPersonalTicket = watch('personalTicket');
    const watchedIsActive = watch('isActive');
    const watchedEventDate = watch('eventDate');
    const watchedStartTime = watch('startTime');
    const watchedEndTime = watch('endTime');
    const watchedTimezone = watch('timezone');
    const watchedTicketLimit = watch('eventDateTicketLimit');
    const watchedTicketSaleEndDate = watch('ticketSaleEndDate');
    const ticketTypesChanged = watch('ticketTypesChanged');
    
    const hasChanges = useMemo(() => {
        if (!event) return true;
        
        const values = form.getValues();
        
        
        const hasFormChanges = (
            values.title !== event.title ||
            values.description !== event.description ||
            values.bespokeMessage !== (event.bespokeMessage || '') ||
            values.slug !== event.slug ||
            values.venueId !== event.venueId?.toString() ||
            values.personalTicket !== event.personalTicket ||
            values.isActive !== event.isActive ||
            values.startTime !== (event.dates?.[0]?.date ? (() => {
                const isoString = new Date(event.dates[0].date).toISOString();
                return isoString.split('T')[1].slice(0, 5);
            })() : '19:00') ||
            values.endTime !== (event.dates?.[0]?.date ? (() => {
                const isoString = new Date(event.dates[0].date).toISOString();
                const timeStr = isoString.split('T')[1];
                const [hours, minutes] = timeStr.slice(0, 5).split(':').map(Number);
                const endHours = (hours + 2) % 24;
                return `${endHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            })() : '21:00') ||
            values.timezone !== (event.timezone || 'Europe/London') ||
            values.eventDate !== (event.dates?.[0]?.date ? new Date(event.dates[0].date).toISOString().split('T')[0] : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]) ||
            values.eventDateTicketLimit !== event.dates?.[0]?.totalTicketLimit ||
            values.ticketSaleEndDate !== (event.dates?.[0]?.ticketSaleEndDate ? new Date(event.dates[0].ticketSaleEndDate).toISOString().slice(0, 16) : undefined) ||
            coverImage !== null ||
            removeCoverImage ||
            coverImageSize !== event.coverImageSize ||
            values.ticketTypesChanged // Track ticket type changes
        );
        
        return hasFormChanges;
    }, [
        event, 
        form, 
        coverImage, 
        removeCoverImage, 
        coverImageSize,
        // Add all watched values as dependencies to trigger re-computation
        watchedTitle,
        watchedDescription,
        watchedBespokeMessage,
        watchedSlug,
        watchedVenueId,
        watchedPersonalTicket,
        watchedIsActive,
        watchedEventDate,
        watchedStartTime,
        watchedEndTime,
        watchedTimezone,
        watchedTicketLimit,
        watchedTicketSaleEndDate,
        ticketTypesChanged
    ]);



    const onSubmit = async (values: ManageEventValues) => {
        try {

            
            const ticketTypesValid = hasEventTicketTypes;
            if (!ticketTypesValid) {
                showToast.error("Please add at least one ticket type");
                return;
            }

            const eventData = {
                title: values.title,
                description: values.description,
                bespokeMessage: values.bespokeMessage,
                slug: values.slug,
                venueId: values.venueId,
                personalTicket: values.personalTicket,
                isActive: values.isActive,
                customFields: values.customFields,
                eventDate: values.eventDate,
                startTime: values.startTime,
                endTime: values.endTime,
                timezone: values.timezone,
                eventDateTicketLimit: values.eventDateTicketLimit,
                ticketSaleEndDate: values.ticketSaleEndDate,
                // Include ticket types for new events
                ...((!event?.id && localTicketTypes.length > 0) && {
                    ticketTypes: localTicketTypes.map((tt, index) => ({
                        name: tt.name,
                        description: tt.description || null,
                        price: typeof tt.price === 'number' ? tt.price : parseInt((parseFloat(tt.price || '0') * 100).toString()),
                        currency: tt.currency || 'GBP',
                        capacity: tt.capacity ? parseInt(tt.capacity.toString()) : null,
                        colorHex: tt.colorHex || null,
                        isActive: tt.isActive !== false,
                        isPublic: tt.isPublic !== false,
                        sortOrder: tt.sortOrder || index
                    }))
                })
            };

            console.log('📤 [ManageEventDialog] Sending eventData to API:', eventData);
            console.log('📤 [ManageEventDialog] bespokeMessage in eventData:', eventData.bespokeMessage);

            let eventId: string;
            if (event) {
                // Update existing event
                console.log('🔄 [ManageEventDialog] Updating existing event:', event.id);
                await axios.put(`/api/admin/events/${event.id}`, eventData, { withCredentials: true });
                eventId = event.id;
            } else {
                // Create new event
                console.log('➕ [ManageEventDialog] Creating new event');
                const response = await axios.post("/api/admin/events", eventData, { withCredentials: true });
                eventId = response.data.id;
                // Reset form for new event
                reset();
            }

            // Handle cover image if present (don't let this break the main flow)
            if (coverImage) {
                try {
                    await uploadCoverImage(eventId);
                } catch (imageError: any) {

                    showToast.error("Event created successfully, but cover image upload failed");
                }
            }

            // Store cover image size if changed (don't let this break the main flow)
            if (event) {
                try {
                    await storeCoverImageSize(event.id);
                } catch (sizeError: any) {

                }
            }

            onChange();
            // Don't close the modal - let user explicitly close with X button
            // This prevents accidental closure and allows continued editing
            showToast.success(event ? "Event saved! You can continue editing or close this dialog." : "Event created successfully!");
        } catch (error: any) {
            console.error('❌ Error saving event:', error);
            // Show detailed error message to help users understand the issue
            const errorMessage = error.response?.data?.details ||  // Detailed error from API
                                 error.response?.data?.error || 
                                 error.response?.data?.message || 
                                 error.message || 
                                 "Failed to save event";
            showToast.error(errorMessage);
        }
    };

    const uploadCoverImage = async (eventId: string) => {
        if (!coverImage) return;

        const formData = new FormData();
        formData.append('coverImage', coverImage);

        try {
            await axios.post(`/api/admin/events/coverimage?eventId=${eventId}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                withCredentials: true
            });
            showToast.success("Cover image uploaded successfully!");
        } catch (error: any) {

            showToast.error("Failed to upload cover image");
        }
    };

    const storeCoverImageSize = async (eventId: string) => {
        if (coverImageSize === event?.coverImageSize || coverImageSize === null) return;
        await axios.put(`/api/admin/events/coverimage?eventId=${eventId}&coverImageSize=${coverImageSize}`, {}, { withCredentials: true });
    };

    const handleDelete = async () => {


        
        const targetEvent = eventToDelete || event;
        if (!targetEvent) {

            return;
        }
        

        
        try {
            await axios.delete(`/api/admin/events/${targetEvent.id}`, { withCredentials: true });

            showToast.success("Event deleted successfully!");
            setDeleteOpen(false);
            setEventToDelete(null);
            onChange();
            onClose();
        } catch (error: any) {

            showToast.error(error.response?.data?.error || "Failed to delete event");
        }
    };

    const handleTicketTypesChange = (ticketTypes: any[]) => {
        // Update local ticket types state
        setLocalTicketTypes(ticketTypes);
        
        // Consider only active items for validity
        const hasActive = Array.isArray(ticketTypes) && ticketTypes.some(tt => tt?.isActive !== false);
        setHasEventTicketTypes(hasActive);
        
        // Mark the form as changed so hasChanges flips true if needed
        setValue("ticketTypesChanged", true, { shouldDirty: true, shouldValidate: true });
        

    };

    const handleUploadImageChange = async (fileEvent: ChangeEvent<HTMLInputElement>) => {
        const file = fileEvent.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            showToast.error("Image size must be less than 5MB");
            return;
        }

        setCoverImage(file);
        setRemoveCoverImage(false);
        setCoverImageSize(1); // Default size
    };

    const handleRemoveCoverImage = () => {
        setCoverImage(null);
        setRemoveCoverImage(true);
        setCoverImageSize(null);
    };

    const handleSetCoverImageSizeRandom = (checkboxEvent: ChangeEvent<HTMLInputElement>) => {
        setCoverImageSize(checkboxEvent.target.checked ? null : 1);
    };

    const handleChangeCoverImageSize = (rangeEvent: ChangeEvent<HTMLInputElement>) => {
        setCoverImageSize(parseInt(rangeEvent.target.value));
    };

    // Reset form when event changes
    useEffect(() => {
        if (event) {

            setValue("title", event.title);
            setValue("slug", event.slug || generateSlug(event.title));
            setValue("description", event.description);
            setValue("bespokeMessage", event.bespokeMessage || "");
            setValue("venueId", event.venueId ? event.venueId.toString() : "");
            setValue("personalTicket", event.personalTicket);
            setValue("isActive", event.isActive ?? true);
            setValue("customFields", event.customFields || []);
            console.log('[ManageEventDialog] Setting customFields from event:', event.customFields);
            setValue("eventDate", event.dates?.[0]?.date ? new Date(event.dates[0].date).toISOString().split('T')[0] : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
            setValue("startTime", event.dates?.[0]?.date ? (() => {
                // Convert UTC to London timezone before extracting time
                const utcDate = new Date(event.dates[0].date);
                const londonDate = fromUTC(utcDate, event.timezone || 'Europe/London');
                const hours = londonDate.getHours().toString().padStart(2, '0');
                const minutes = londonDate.getMinutes().toString().padStart(2, '0');
                return `${hours}:${minutes}`;
            })() : '19:00');
            setValue("endTime", event.dates?.[0]?.date ? (() => {
                // Calculate end time based on start time + 2 hours in London timezone
                const utcDate = new Date(event.dates[0].date);
                const londonDate = fromUTC(utcDate, event.timezone || 'Europe/London');
                const endDate = new Date(londonDate.getTime() + 2 * 60 * 60 * 1000); // Add 2 hours
                const hours = endDate.getHours().toString().padStart(2, '0');
                const minutes = endDate.getMinutes().toString().padStart(2, '0');
                return `${hours}:${minutes}`;
            })() : '21:00');
            setValue("timezone", event.timezone || 'Europe/London');
            setValue("eventDateTicketLimit", event.dates?.[0]?.totalTicketLimit);
            setValue("ticketSaleEndDate", event.dates?.[0]?.ticketSaleEndDate ? new Date(event.dates[0].ticketSaleEndDate).toISOString().slice(0, 16) : undefined);
            // Don't reset ticketTypesChanged here - only reset it when actually switching to a different event
            setCoverImageSize(event.coverImageSize);
            setCoverImage(null);  // Reset cover image when switching events to prevent accidental uploads
            setRemoveCoverImage(false);
            
            // Log the updated form values for debugging
            setTimeout(() => {

            }, 100);
            } else {
            reset();
            setCoverImageSize(null);
            setCoverImage(null);  // Reset cover image when creating new event
            setRemoveCoverImage(false);
        }
    }, [event, setValue, reset, form]);

    const coverImageUrl = !removeCoverImage && (coverImage ? URL.createObjectURL(coverImage) : event?.coverImage);

    // Prevent parent dialog from closing when child dialogs are open
    const handleClose = () => {
        // Only allow closing if no child dialogs are open
        if (!customFieldsOpen && !deleteOpen && !openPreview) {
            onClose();
        }
        // If child dialogs are open, do nothing (prevents closing)
    };

    return (
        <>
            <Dialog 
                open={open || event !== null} 
                onClose={handleClose} 
                size="xl"
                static={customFieldsOpen || deleteOpen || openPreview}
            >
                <Dialog.Header onClose={onClose}>
                    <div className="flex flex-wrap items-center justify-between gap-3 w-full pr-2">
                        <h3 className="text-lg font-semibold">
                            {event ? "Edit Event" : "Add Event"}
                        </h3>
                        {event?.id ? (
                            <Link href={`/admin/events/${event.id}/waitlist`}>
                                <span
                                    className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 cursor-pointer"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <ClipboardListIcon className="w-4 h-4" />
                                    Waitlist
                                </span>
                            </Link>
                        ) : null}
                    </div>
                </Dialog.Header>
                <Dialog.Body>
                    <form 
                        onSubmit={async (e) => {
                            e.preventDefault(); // Prevent default form submission


                            
                            // Validate form before submission
                            try {
                                const isValid = await form.trigger();



                                
                                if (!isValid) {

                                    // Show specific validation errors
                                    const errorMessages = Object.values(form.formState.errors)
                                        .map(error => error?.message)
                                        .filter(Boolean)
                                        .join(', ');
                                    showToast.error(`Please fix the form errors: ${errorMessages}`);
                                    return;
                                }
                            } catch (validationError) {

                                showToast.error("Form validation error occurred");
                                return;
                            }
                            
                            // Set loading state immediately
                            setIsSubmittingForm(true);
                            
                            try {
                                // Call onSubmit directly since handleSubmit wrapper isn't working
                                const values = form.getValues() as ManageEventValues;
                                await onSubmit(values);
                            } catch (error) {

                                // Error is already handled in onSubmit, just reset loading state
                            } finally {
                                // Reset loading state
                                setIsSubmittingForm(false);
                            }
                        }}
                        onKeyDown={(e) => {
                            // Prevent Enter key from accidentally submitting the form
                            // Only allow submission via explicit "Save Changes" button click
                            if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') {
                                e.preventDefault();
                                console.log('⚠️ Enter key blocked in input field to prevent accidental submission');
                            }
                        }}
                        className="space-y-6"
                    >
                        <div className="space-y-8">
                            {/* DETAILS SECTION */}
                            <div className="space-y-4">
                                <Input
                                    label="Title"
                                    {...form.register("title")}
                                    error={errors.title?.message}
                                />
                                
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Description
                                    </label>
                                    <Controller
                                        name="description"
                                        control={form.control}
                                        render={({ field }) => (
                                            <MinimalEditor
                                                value={field.value || ''}
                                                onChange={field.onChange}
                                                placeholder="Describe your event (up to 200 words). You can use bold, italic, and links."
                                            />
                                        )}
                                    />
                                    <p className="text-sm text-gray-500">
                                        Describe your event (up to 200 words). You can use bold, italic, and links.
                                    </p>
                                    {errors.description && (
                                        <p className="text-sm text-red-600">{errors.description.message}</p>
                                    )}
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Slug
                                    </label>
                                    <Input
                                        {...form.register("slug")}
                                        error={errors.slug?.message}
                                        helperText="Auto-generated from title; you can edit"
                                        onChange={(e) => {
                                            setSlugEdited(true);
                                            form.setValue("slug", e.target.value);
                                        }}
                                    />
                                </div>

                                <Select
                                    label="Venue"
                                    value={watch('venueId')?.toString() || ""}
                                    onChange={(value) => setValue("venueId", value)}
                                    options={[
                                        { value: "", label: "No venue selected" },
                                        ...(venues?.map((venue) => ({
                                            value: venue.id.toString(),
                                            label: venue.name + (venue.city ? ` - ${venue.city}` : "")
                                        })) || [])
                                    ]}
                                    placeholder="Select venue"
                                />
                                {errors.venueId && (
                                    <p className="text-sm text-red-600 mt-1">{errors.venueId.message}</p>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            <CalendarIcon className="w-4 h-4 inline mr-2" />
                                            Event Date
                                        </label>
                                        <input
                                            type="date"
                                            {...form.register("eventDate")}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                        {errors.eventDate && (
                                            <p className="text-sm text-red-600 mt-1">{errors.eventDate.message}</p>
                                        )}
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            <ClockIcon className="w-4 h-4 inline mr-2" />
                                            Start Time
                                        </label>
                                        <input
                                            type="time"
                                            {...form.register("startTime")}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                        {errors.startTime && (
                                            <p className="text-sm text-red-600 mt-1">{errors.startTime.message}</p>
                                        )}
                                    </div>
                                    </div>
                                    
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            <ClockIcon className="w-4 h-4 inline mr-2" />
                                            End Time
                                        </label>
                                        <input
                                            type="time"
                                            {...form.register("endTime")}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                        {errors.endTime && (
                                            <p className="text-sm text-red-600 mt-1">{errors.endTime.message}</p>
                                        )}
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            <GlobeAltIcon className="w-4 h-4 inline mr-2" />
                                            Timezone
                                        </label>
                                        <Controller
                                            name="timezone"
                                            control={control}
                                            render={({ field }) => (
                                                <Select
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                    options={COMMON_TIMEZONES}
                                                    placeholder="Select timezone"
                                                />
                                            )}
                                        />
                                        {errors.timezone && (
                                            <p className="text-sm text-red-600 mt-1">{errors.timezone.message}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center space-x-3">
                                    <Switch
                                        checked={watch('personalTicket')}
                                        onChange={(checked) => setValue("personalTicket", checked)}
                                    />
                                    <span className="text-sm font-medium text-gray-700">
                                        Personal Tickets
                                    </span>
                                    <span className="text-sm text-gray-500">
                                        (Enforces users to provide the name for each ticket)
                                    </span>
                                </div>

                                <div className="flex items-center space-x-3">
                                    <Switch
                                        checked={watch('isActive')}
                                        onChange={(checked) => setValue("isActive", checked)}
                                    />
                                    <span className="text-sm font-medium text-gray-700">
                                        Event Active
                                    </span>
                                    <span className="text-sm text-gray-500">
                                        (Controls whether this event appears on the public website)
                                    </span>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        <CalendarIcon className="w-4 h-4 inline mr-2" />
                                        Global Ticket Limit (optional)
                                    </label>
                                    <input
                                        type="number"
                                        {...form.register("eventDateTicketLimit")}
                                        placeholder="Leave empty for unlimited"
                                        min="1"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                    <p className="text-sm text-gray-500 mt-1">
                                        Maximum total tickets that can be sold across all ticket types
                                    </p>
                                    {errors.eventDateTicketLimit && (
                                        <p className="text-sm text-red-600 mt-1">{errors.eventDateTicketLimit.message}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        <CalendarIcon className="w-4 h-4 inline mr-2" />
                                        Ticket Sale End Date (optional)
                                    </label>
                                    <input
                                        type="datetime-local"
                                        {...form.register("ticketSaleEndDate")}
                                        placeholder="Leave empty to allow sales until event date"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                    <p className="text-sm text-gray-500 mt-1">
                                        Stop ticket sales at this date/time. Leave empty to allow sales until the event.
                                    </p>
                                    {errors.ticketSaleEndDate && (
                                        <p className="text-sm text-red-600 mt-1">{errors.ticketSaleEndDate.message}</p>
                                    )}
                                </div>
                            </div>

                                  {/* TICKET TYPES SECTION */}
       <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Ticket Types</h3>
      </div>
      <EventTicketTypesPanel
        eventId={event?.id}
        mode={event?.id ? 'existing' : 'creating'}
        initialTicketTypes={localTicketTypes}
        onTicketTypesChange={handleTicketTypesChange}
      />

                            {/* CUSTOM FIELDS SECTION */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Custom Fields</h3>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-gray-700">Custom Fields</span>
                                        <Button
                                            type="button"
                                            onClick={() => setCustomFieldsOpen(true)}
                                            variant="outline"
                                            size="sm"
                                        >
                                            Configure
                                        </Button>
                                    </div>
                                    {(watch('customFields')?.length ?? 0) > 0 && (
                                        <div className="text-sm text-gray-600">
                                            {watch('customFields')?.length ?? 0} custom field(s) configured
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* EMAIL SETTINGS SECTION */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Email Settings</h3>
                                <div className="space-y-3">
                                    <Textarea
                                        label="Bespoke Email Message"
                                        {...form.register("bespokeMessage")}
                                        rows={4}
                                        helperText="Custom message to include in email templates (up to 200 words). Use {{event.bespoke.message}} token in templates."
                                        maxLength={1200}
                                        placeholder="Enter a custom message for this event's emails..."
                                    />
                                </div>
                            </div>

                            {/* MEDIA SECTION */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Media & Images</h3>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    {coverImageUrl && (
                                        <div className="h-32 relative">
                                            <Image 
                                                src={coverImageUrl} 
                                                alt="Event Preview" 
                                                width={128}
                                                height={128}
                                                className="object-contain w-full h-full"
                                                unoptimized={coverImageUrl?.includes('blob.vercel-storage.com')}
                                            />
                                        </div>
                                    )}
                                    <div className="space-y-3">
                                        <input
                                            accept="image/*"
                                            className="hidden"
                                            id="upload-file"
                                            type="file"
                                            onChange={handleUploadImageChange}
                                        />
                                        <label htmlFor="upload-file" className="block cursor-pointer">
                                            <span className="inline-block w-full">
                                                <Button 
                                                    type="button"
                                                    variant="outline" 
                                                    className="w-full"
                                                    disabled={isUploadingImage}
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        document.getElementById('upload-file')?.click();
                                                    }}
                                                >
                                                    <PhotographIcon className="w-4 h-4 mr-2" />
                                                    {isUploadingImage ? 'Uploading...' : 'Upload Cover Image'}
                                                </Button>
                                            </span>
                                        </label>
                                        {coverImageUrl && (
                                            <Button
                                                type="button"
                                                onClick={handleRemoveCoverImage}
                                                variant="danger"
                                                className="w-full"
                                            >
                                                Remove Cover Image
                                            </Button>
                                        )}
                                    </div>
                                </div>
                                
                                {coverImageUrl && (
                                    <div className="space-y-3">
                                        <div className="flex items-center space-x-3">
                                            <input
                                                type="checkbox"
                                                checked={coverImageSize === null}
                                                onChange={handleSetCoverImageSizeRandom}
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-sm text-gray-500">
                                                Random size
                                            </span>
                                        </div>
                                        
                                        {coverImageSize !== null && (
                                            <div className="space-y-2">
                                                <label className="block text-sm font-medium text-gray-700">
                                                    Cover Image Size
                                                </label>
                                                <input
                                                    type="range"
                                                    min="1"
                                                    max="5"
                                                    step="0.1"
                                                    value={coverImageSize}
                                                    onChange={handleChangeCoverImageSize}
                                                    className="w-full"
                                                />
                                                <div className="text-sm text-gray-600">
                                                    Size: {coverImageSize}
                                                    {coverImageSize > 2 && (
                                                        <span className="text-red-600 ml-2">
                                                            (Images larger than 2 will be cut-off on mobile)
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex space-x-3 pt-4 border-t border-gray-200">
                            <Button
                                type="submit"
                                variant="solid"
                                disabled={event ? (!hasChanges || !isValidRealTime || isSubmittingForm) : (!isValidRealTime || isSubmittingForm)}
                                loading={isSubmittingForm}
                                className="flex-1"
                            >
                                {isSubmittingForm ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        {event ? "Saving..." : "Creating..."}
                                    </>
                                ) : (
                                    event ? "Save Changes" : "Create Event"
                                )}
                            </Button>
                            
                            {event && (
                                <Button
                                    type="button"
                                    onClick={() => {
                                        console.log('Delete button clicked for event:', event?.id, event?.title);
                                        try {
                                            setEventToDelete(event); // Store the event for deletion
                                            setDeleteOpen(true);
                                            console.log('Delete dialog should be open now');
                                        } catch (error) {
                                            console.error('Error opening delete dialog:', error);
                                        }
                                    }}
                                    variant="danger"
                                    className="flex-1"
                                >
                                    Delete Event
                                </Button>
                            )}
                        </div>

                        {event && (
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full"
                                onClick={async () => {
                                    try {
                                        const response = await fetch('https://jvs-vercel.vercel.app/api/revalidate-events', {
                                            method: 'POST',
                                            headers: {
                                                'Content-Type': 'application/json',
                                            },
                                            body: JSON.stringify({
                                                secret: 'VXAm6hyyfcxfdBrw9bIZZIzCo3nF1G2aVZuyKsiRMSA=',
                                                action: 'event_updated',
                                                eventId: event.id
                                            })
                                        });
                                        
                                        if (response.ok) {
                                            showToast.success('✅ Main website updated successfully!');
                                        } else {
                                            throw new Error(`HTTP ${response.status}`);
                                        }
                                    } catch (error) {

                                        showToast.error('❌ Failed to update main website');
                                    }
                                }}
                            >
                                Update Main Website
                            </Button>
                        )}
                    </form>
                </Dialog.Body>
            </Dialog>

            <ConfirmDialog
                open={deleteOpen}
                onConfirm={() => {
                    console.log('ConfirmDialog onConfirm called');
                    handleDelete();
                }}
                onClose={() => {
                    console.log('ConfirmDialog onClose called');
                    setDeleteOpen(false);
                    setEventToDelete(null);
                }}
                text={`Confirm delete of event <b>${eventToDelete?.title || event?.title || 'undefined'}</b>`}
            />
            
            <EventCustomFieldsDialog
                customFields={watch('customFields')}
                open={customFieldsOpen}
                onClose={() => setCustomFieldsOpen(false)}
                onChange={(newFields) => setValue("customFields", newFields)}
            />
        </>
    );
};
