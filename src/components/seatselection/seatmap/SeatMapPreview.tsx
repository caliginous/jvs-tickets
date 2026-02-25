import React, { useEffect, useState } from "react";
import axios from "axios";
import useTranslation from "next-translate/useTranslation";
import { Dialog } from "../../../ui";
import Image from "next/image";

interface SeatMapPreviewProps {
    open: boolean;
    onClose: () => void;
    id: number;
}

export const SeatMapPreview = ({ open, onClose, id }: SeatMapPreviewProps) => {
    const [data, setData] = useState<string | null>(null);
    const [type, setType] = useState<string | null>(null);
    const { t } = useTranslation();

    useEffect(() => {
        if (data || !id || !open) return;
        const loadData = async () => {
            const response = await axios.get("/api/seatmap_preview/" + id, {
                responseType: "blob"
            });
            setType(response.headers["content-type"]);
            setData(URL.createObjectURL(response.data));
        };
        loadData().catch(console.log);
    }, [id, open, data]);

    return (
        <Dialog open={open} onClose={onClose} size="xl">
            <Dialog.Header>
                <h2 className="text-xl font-semibold">
                    {t("seatselection:seat-map-preview")}
                </h2>
            </Dialog.Header>
            <Dialog.Body>
                <div className="w-full h-full relative">
                    {type?.startsWith("image/") ? (
                        <Image
                            src={data || ""}
                            width={800}
                            height={600}
                            className="w-full h-full object-cover"
                            alt="Seat Map Preview"
                            sizes="100vw"
                        />
                    ) : (
                        <object
                            data={data || ""}
                            type={type || ""}
                            className="w-full object-cover max-h-[80vh] min-h-[600px]"
                        />
                    )}
                </div>
            </Dialog.Body>
        </Dialog>
    );
};
