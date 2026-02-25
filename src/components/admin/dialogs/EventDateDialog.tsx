import { Dialog, Button, Input, Select } from "../../../ui";
import { TrashIcon, CalendarIcon, ClockIcon, GlobeAltIcon } from "@heroicons/react/solid";
import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DayPicker } from 'react-day-picker';
import { Switch } from '@headlessui/react';
import { RRule } from 'rrule';
import { toUTC, COMMON_TIMEZONES, getCurrentTime } from "../../../utils/datetime";
import { EventDateSchema, type EventDateFormValues, defaultEventDateValues } from "./EventDateDialog.schema";
import 'react-day-picker/dist/style.css';

interface EventDate {
  title?: string | null;
  date: string;
  totalTicketLimit?: number | null;
  ticketSaleStartDate?: string | null;
  ticketSaleEndDate?: string | null;
}

interface EventDateDialogProps {
  open: boolean;
  onClose: () => void;
  dates: EventDate[];
  onChange: (dates: EventDate[]) => void;
}

const EventDateEntry = ({ date, onChange, onDelete, index }: {
  date: EventDate;
  onChange: (index: number, field: keyof EventDate, value: any) => void;
  onDelete: (index: number) => void;
  index: number;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border border-gray-200 rounded-lg mb-4">
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="text-sm font-medium text-gray-700">
          {date.title || 'Untitled Event'} ({new Date(date.date).toLocaleString()})
        </span>
        <div className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
          ▼
        </div>
      </div>
      
      {isExpanded && (
        <div className="p-4 border-t border-gray-200 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Title"
              value={date.title || ""}
              onChange={(event) => onChange(index, "title", event.target.value === "" ? null : event.target.value)}
            />
            <Input
              label="Event Date"
              type="datetime-local"
              value={date.date ? new Date(date.date).toISOString().slice(0, 16) : ""}
              onChange={(event) => onChange(index, "date", new Date(event.target.value).toISOString())}
            />
          </div>
          
          <Input
            label="Global Ticket Limit (optional)"
            type="number"
            value={date.totalTicketLimit || ""}
            helperText="Maximum total tickets that can be sold across all categories. Leave empty for unlimited."
            onChange={(event) => onChange(index, "totalTicketLimit", event.target.value === "" ? null : parseInt(event.target.value))}
            min={1}
          />
          
          <Input
            label="Ticket Sale Start Date (optional)"
            type="datetime-local"
            value={date.ticketSaleStartDate ? new Date(date.ticketSaleStartDate).toISOString().slice(0, 16) : ""}
            onChange={(event) => onChange(index, "ticketSaleStartDate", new Date(event.target.value).toISOString())}
          />
          
          <Input
            label="Ticket Sale End Date (optional)"
            type="datetime-local"
            value={date.ticketSaleEndDate ? new Date(date.ticketSaleEndDate).toISOString().slice(0, 16) : ""}
            onChange={(event) => onChange(index, "ticketSaleEndDate", new Date(event.target.value).toISOString())}
          />
          
          <Button onClick={() => onDelete(index)} variant="danger" className="w-full">
            <TrashIcon className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      )}
    </div>
  );
};

const AddEventDate = ({ onAdd }: { onAdd: (date: EventDate) => void }) => {
  const { control, handleSubmit, reset, watch, formState: { errors } } = useForm<EventDateFormValues>({
    resolver: zodResolver(EventDateSchema),
    defaultValues: {
      ...defaultEventDateValues,
      startTime: getCurrentTime(),
      endTime: getCurrentTime(),
    }
  });

  const mode = watch('mode');
  const recurrenceEnabled = watch('recurrence.enabled');

  const onSubmit = (data: EventDateFormValues) => {
    const tz = data.timezone;
    let eventDate: string;
    
    if (data.mode === 'single' && data.date) {
      eventDate = toUTC(data.date, data.startTime, tz).toISOString();
    } else if (data.mode === 'range' && data.range?.from && data.range?.to) {
      // For range mode, use the start date as the primary date
      eventDate = toUTC(data.range.from, data.startTime, tz).toISOString();
    } else {
      return; // Validation should prevent this
    }

    const newEventDate: EventDate = {
      title: data.title || null,
      date: eventDate,
      totalTicketLimit: data.totalTicketLimit || null,
      ticketSaleStartDate: data.ticketSaleStartDate ? toUTC(data.ticketSaleStartDate, data.startTime, tz).toISOString() : null,
      ticketSaleEndDate: data.ticketSaleEndDate ? toUTC(data.ticketSaleEndDate, data.endTime, tz).toISOString() : null,
    };

    onAdd(newEventDate);
    reset();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Mode Toggle */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-gray-700">Date Range</span>
        <Controller
          name="mode"
          control={control}
          render={({ field }) => (
            <Switch
              checked={field.value === 'range'}
              onChange={(checked) => field.onChange(checked ? 'range' : 'single')}
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 ui-checked:bg-blue-600 transition-colors"
            >
              <span className="inline-block h-4 w-4 transform rounded-full bg-white ui-checked:translate-x-6 translate-x-1 transition-transform" />
            </Switch>
          )}
        />
        <span className="text-sm text-gray-600">
          {mode === 'single' ? 'Single Date' : 'Date Range'}
        </span>
      </div>

      {/* Calendar */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          {mode === 'single' ? 'Select Date' : 'Select Date Range'}
        </label>
        
        {mode === 'single' ? (
          <Controller
            name="date"
            control={control}
            render={({ field }) => (
              <DayPicker
                mode="single"
                selected={field.value}
                onSelect={field.onChange}
                className="border border-gray-300 rounded-lg p-4"
              />
            )}
          />
        ) : (
          <Controller
            name="range"
            control={control}
            render={({ field }) => (
              <DayPicker
                mode="range"
                selected={field.value}
                onSelect={field.onChange}
                className="border border-gray-300 rounded-lg p-4"
              />
            )}
          />
        )}
        
        {errors.date && (
          <p className="text-sm text-red-600">{errors.date.message}</p>
        )}
        {errors.range && (
          <p className="text-sm text-red-600">{errors.range.message as string}</p>
        )}
      </div>

      {/* Times */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <ClockIcon className="w-4 h-4 inline mr-2" />
            Start Time
          </label>
          <Controller
            name="startTime"
            control={control}
            render={({ field }) => (
              <input
                type="time"
                {...field}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            )}
          />
          {errors.startTime && (
            <p className="text-sm text-red-600 mt-1">{errors.startTime.message}</p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <ClockIcon className="w-4 h-4 inline mr-2" />
            End Time
          </label>
          <Controller
            name="endTime"
            control={control}
            render={({ field }) => (
              <input
                type="time"
                {...field}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            )}
          />
          {errors.endTime && (
            <p className="text-sm text-red-600 mt-1">{errors.endTime.message}</p>
          )}
        </div>
      </div>

      {/* Timezone */}
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

      {/* Title */}
      <div>
        <Controller
          name="title"
          control={control}
          render={({ field }) => (
            <Input
              label="Event Title (optional)"
              value={field.value || ""}
              onChange={field.onChange}
            />
          )}
        />
      </div>

      {/* Ticket Limit */}
      <div>
        <Controller
          name="totalTicketLimit"
          control={control}
          render={({ field }) => (
            <Input
              label="Global Ticket Limit (optional)"
              type="number"
              value={field.value || ""}
              onChange={(e) => field.onChange(e.target.value === "" ? null : parseInt(e.target.value))}
              helperText="Maximum total tickets that can be sold across all categories. Leave empty for unlimited."
              min={1}
            />
          )}
        />
      </div>

      {/* Ticket Sale Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Controller
            name="ticketSaleStartDate"
            control={control}
            render={({ field }) => (
              <Input
                label="Ticket Sale Start (optional)"
                type="datetime-local"
                value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ""}
                onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
              />
            )}
          />
        </div>
        
        <div>
          <Controller
            name="ticketSaleEndDate"
            control={control}
            render={({ field }) => (
              <Input
                label="Ticket Sale End (optional)"
                type="datetime-local"
                value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ""}
                onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
              />
            )}
          />
        </div>
      </div>

      {/* Recurrence */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">Recurrence</span>
          <Controller
            name="recurrence.enabled"
            control={control}
            render={({ field }) => (
              <Switch
                checked={field.value}
                onChange={field.onChange}
                className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 ui-checked:bg-blue-600 transition-colors"
              >
                <span className="inline-block h-4 w-4 transform rounded-full bg-white ui-checked:translate-x-6 translate-x-1 transition-transform" />
              </Switch>
            )}
          />
        </div>
        
        {recurrenceEnabled && (
          <div className="pl-6 space-y-3 border-l-2 border-gray-200">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Frequency</label>
                <Controller
                  name="recurrence.freq"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value || ""}
                      onChange={field.onChange}
                      options={[
                        { value: 'DAILY', label: 'Daily' },
                        { value: 'WEEKLY', label: 'Weekly' },
                        { value: 'MONTHLY', label: 'Monthly' },
                      ]}
                      placeholder="Select frequency"
                    />
                  )}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Interval</label>
                <Controller
                  name="recurrence.interval"
                  control={control}
                  render={({ field }) => (
                    <input
                      type="number"
                      min="1"
                      max="52"
                      value={field.value || 1}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  )}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <Button type="submit" variant="solid" className="w-full">
        <CalendarIcon className="w-4 h-4 mr-2" />
        Add Event Date
      </Button>
    </form>
  );
};

export const EventDateDialog = ({ open, onClose, dates, onChange }: EventDateDialogProps) => {
  const handleChange = (index: number, field: keyof EventDate, value: any) => {
    const newDates = [...dates];
    newDates[index] = { ...newDates[index], [field]: value };
    onChange(newDates);
  };

  const handleDelete = (index: number) => {
    const newDates = dates.filter((_, i) => i !== index);
    onChange(newDates);
  };

  const handleAdd = (newDate: EventDate) => {
    onChange([...dates, newDate]);
  };

  return (
    <Dialog open={open} onClose={onClose} size="xl">
      <Dialog.Header>
        <h3 className="text-lg font-semibold">Event Dates</h3>
      </Dialog.Header>
      <Dialog.Body>
        <div className="space-y-6">
          {/* Existing Dates */}
          {dates.map((date, index) => (
            <EventDateEntry
              key={index}
              date={date}
              onChange={handleChange}
              onDelete={handleDelete}
              index={index}
            />
          ))}
          
          {/* Add New Date */}
          {dates.length > 0 && (
            <div className="border-t border-gray-200 my-6" />
          )}
          
          <div className="bg-gray-50 rounded-lg p-6">
            <h4 className="text-md font-medium text-gray-900 mb-4">Add New Event Date</h4>
            <AddEventDate onAdd={handleAdd} />
          </div>
        </div>
      </Dialog.Body>
    </Dialog>
  );
};
