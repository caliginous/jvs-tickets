import { EventSelectionEntry, EventSelectionMultiple } from "./EventSelectionEntry";
import React from "react";
import style from "../../style/EventSelection.module.scss";
import Link from "next/link";
import { formatInTZ } from "../../utils/datetime";

interface EventSelectionProps {
    events: any[];
    onChange: (value: any) => void;
}

export const EventSelection = ({ events, onChange }: EventSelectionProps) => {
    return (
        <div className={`space-y-4 ${style.eventSelectionWrapper}`}>
            {events.map((event, index) => {
                if (event.dates && event.dates.length > 1) {
                    return (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-lg font-semibold text-gray-900">{event.title}</h3>
                                <Link 
                                    href={event.url ? new URL(event.url).pathname : `/events/${event.slug || event.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                                >
                                    View Details
                                </Link>
                            </div>
                            <EventSelectionMultiple dates={event.dates} label={event.title} onChange={() => {}} />
                        </div>
                    );
                }
                
                // Add proper null checks for dates
                if (!event.dates || event.dates.length === 0) {
                    // Handle events without dates gracefully
                    return (
                        <EventSelectionEntry
                            label={event.title}
                            name={"event_selection"}
                            index={event.id}
                            key={index}
                            onChange={() => {}}
                        />
                    );
                }
                
                let title = event.dates[0]?.title ?? event.title;
                if (event.dates[0]?.date) {
                    title += ` (${formatInTZ(event.dates[0].date, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    }, 'Europe/London', 'en-GB')})`;
                }
                return (
                    <EventSelectionEntry
                        label={title}
                        name={"event_selection"}
                        index={event.dates[0]?.id ?? event.id}
                        key={index}
                        onChange={() => {}}
                    />
                );
            })}
        </div>
    );
};
