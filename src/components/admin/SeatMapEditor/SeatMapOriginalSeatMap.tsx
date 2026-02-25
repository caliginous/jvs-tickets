import { useState } from "react";
import axios from "axios";
import { Button } from "../../ui";
import { SaveButton } from "../SaveButton";

interface SeatMapOriginalSeatMapProps {
    seatmap: any;
}

export const SeatMapOriginalSeatMap = ({ seatmap }: SeatMapOriginalSeatMapProps) => {
    const [seatMapFile, setSeatMapFile] = useState<File | null>(null);
    const [deleted, setDeleted] = useState(false);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setSeatMapFile(file);
            setDeleted(false);
        }
    };

    const handleDelete = async () => {
        await axios.delete("/api/admin/seatmap/preview/" + seatmap.id);
        setSeatMapFile(null);
        setDeleted(true);
    };

    const handleSave = async () => {
        if (!seatMapFile) return;
        const fileData = new FormData();
        fileData.append('file', seatMapFile);
        await axios.post("/api/admin/seatmap/preview/" + seatmap.id, fileData);
        setSeatMapFile(null);
    };

    const seatMapDataUrl = seatMapFile && URL.createObjectURL(seatMapFile);

    return (
        <div className="space-y-4">
            {(seatmap.containsPreview || seatMapDataUrl) && !deleted ? (
                seatMapDataUrl ? (
                    <object data={seatMapDataUrl} width="100%" className="border border-gray-200 rounded-lg" />
                ) : (
                    <object data={`/api/seatmap_preview/${seatmap.id}`} width="100%" className="border border-gray-200 rounded-lg" />
                )
            ) : (
                <p className="text-gray-500 text-center py-4">
                    No original seat map uploaded yet
                </p>
            )}
            
            <input
                type="file"
                className="hidden"
                onChange={handleFileChange}
                id="seat-map-original-file"
            />
            
            <label htmlFor="seat-map-original-file" className="block">
                <span className="inline-block w-full">
                    <Button variant="secondary" className="w-full">
                        Upload
                    </Button>
                </span>
            </label>
            
            <SaveButton action={handleSave} disabled={seatMapFile === null}>
                Save
            </SaveButton>
            
            <Button onClick={handleDelete} variant="danger" className="w-full">
                Delete
            </Button>
        </div>
    );
};
