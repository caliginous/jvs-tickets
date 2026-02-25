import style from "../../style/GalleryEventSelection.module.scss";
import { GalleryEventSelectionEntry } from "./GalleryEventSelectionEntry";
import { useEffect, useState } from "react";

export const GalleryEventSelection = ({events, onChange}) => {
    const [currentEvent, setCurrentEvent] = useState(null);

    const needsDateSelection = (event) => event && event.dates && event.dates.length > 1;

    const handleChange = (event) => {
        setCurrentEvent(event);
        if (!event || needsDateSelection(event))
            onChange(-1);
        else
            onChange(event.dates[0].id);
    }

    return (
        <div style={{
            position: "relative"
        }}>
            <div className={style.eventSelectionGallery}>
                {
                    events.map((event, index) => (
                        <GalleryEventSelectionEntry
                            key={index}
                            event={event}
                            onChange={handleChange}
                            selected={currentEvent?.id === event.id}
                            onDateChange={onChange}
                        />
                    ))
                }
            </div>
        </div>
    );
}
