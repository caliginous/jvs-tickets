import { ChangeEvent, useEffect, useRef, useState } from "react";
import { Dialog, Button } from "../../../ui";
import { XIcon, DocumentDownloadIcon, DocumentAddIcon, ChevronDownIcon } from "@heroicons/react/solid";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import { SeatSelectionRowEditor } from "../SeatMapEditor/SeatSelectionRowEditor";
import { Seat } from "../../seatselection/seatmap/SeatMapSeat";
import { SeatMap } from "../../seatselection/seatmap/SeatSelectionMap";
import axios from "axios";
import { showToast } from "../../../ui";
import { SeatMapTemplateEditor } from "../SeatMapEditor/SeatMapTemplateEditor";
import { SeatMapOriginalSeatMap } from "../SeatMapEditor/SeatMapOriginalSeatMap";
import { makeStore } from "../../../store/store";
import { Provider } from "react-redux";

const isJson = (str: string) => {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
};

const SeatMapDialogInner = ({ seatmap, onClose, categories, onChange, currency }: {
    seatmap: any;
    onClose: () => void;
    categories: any[];
    onChange: () => void;
    currency: string;
}) => {
    const [seatmapDefinition, setSeatmapDefinition] = useState<SeatMap>([]);
    const [scale, setScale] = useState<number>(1);
    const container = useRef<HTMLDivElement>(null);
    const content = useRef<HTMLDivElement>(null);
    const uploadElement = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (seatmap == null) return;
        setSeatmapDefinition(isJson(seatmap.definition) ? JSON.parse(seatmap.definition) : [])
    }, [seatmap]);

    const rescale = () => {
        if (!content.current || !container.current) return;
        const maxWidth = container.current.clientWidth;
        const maxHeight = container.current.clientHeight;
        const width = content.current.clientWidth;
        const height = content.current.clientHeight;
        setScale(Math.min(width / maxWidth, height / maxHeight));
    };

    useEffect(() => {
        rescale();
    }, [container, content]);

    useEffect(() => {
        document.addEventListener("resize", rescale);
        return () => {
            document.removeEventListener("resize", rescale);
        };
    }, []);

    const copySeatmapDefinition = (): SeatMap => {
        return seatmapDefinition.map((row) =>
            row.map((seat) => {
                return { ...seat };
            })
        );
    };

    const handleAddSeat = (rowIndex: number, seat: Seat, index: number) => {
        const newSeatmapDefinition = copySeatmapDefinition();
        newSeatmapDefinition[rowIndex].splice(index, 0, seat);
        setSeatmapDefinition(newSeatmapDefinition);
    };

    const handleChangeSeat = (rowIndex: number, newSeat: Seat, index: number) => {
        const newSeatmapDefinition = copySeatmapDefinition();
        newSeatmapDefinition[rowIndex][index] = newSeat;
        setSeatmapDefinition(newSeatmapDefinition);
    };

    const handleDeleteSeat = (seat: Seat, indexInRow: number, isSelected: boolean, rowIndex: number) => {
        if (!isSelected) return;
        let newSeatmapDefinition = copySeatmapDefinition();
        newSeatmapDefinition[rowIndex].splice(indexInRow, 1);
        setSeatmapDefinition(newSeatmapDefinition);
    };

    const handleSave = async () => {
        try {
            await axios.put("/api/admin/seatmap/" + seatmap.id, {
                definition: seatmapDefinition
            });
            showToast.success("Successfully saved seat map");
            onChange();
        } catch (e: any) {
            showToast.error("Error: " + (e.response?.data ?? e.message));
        }
    };

    const handleDelete = async () => {
        try {
            await axios.delete("/api/admin/seatmap/" + seatmap.id);
            onChange();
            onClose();
        } catch (e: any) {
            showToast.error("Error: " + (e.response?.data ?? e.message));
        }
    };

    const exportJson = () => {
        const blob = new Blob([JSON.stringify(seatmapDefinition, null, 4)], {
            type: "text/plain"
        });
        const tempLink = document.createElement("a");
        tempLink.href = URL.createObjectURL(blob);
        tempLink.setAttribute("download", "Seatmap.json");
        tempLink.click();
    };

    const importJson = async (event: ChangeEvent<HTMLInputElement>) => {
        const imported = await event.target.files?.[0]?.text();
        if (imported) {
            setSeatmapDefinition(JSON.parse(imported) as SeatMap);
            if (uploadElement.current) {
                uploadElement.current.value = "";
            }
            showToast.success("JSON imported successfully!");
        }
    };

    const handleAddRow = () => {
        const newSeatmap = copySeatmapDefinition();
        newSeatmap.push([]);
        setSeatmapDefinition(newSeatmap);
    };

    if (!seatmap) return null;

    return (
        <div className="fixed inset-0 z-50 bg-white">
            {/* Header */}
            <div className="bg-blue-600 text-white shadow-lg">
                <div className="flex items-center justify-between px-6 py-4">
                    <h1 className="text-xl font-semibold">Edit Seat Map</h1>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-blue-700 rounded-lg transition-colors"
                        aria-label="close"
                    >
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex h-[calc(100vh-80px)]">
                {/* Left Panel - Seat Map Editor */}
                <div className="flex-1 p-4" ref={container}>
                    <TransformWrapper
                        centerOnInit
                        centerZoomedOut
                        minScale={scale}
                        limitToBounds
                    >
                        <TransformComponent
                            wrapperStyle={{ width: "100%", height: "100%" }}
                        >
                            <div
                                className="flex flex-col"
                                ref={content}
                            >
                                {seatmapDefinition.map((row, index) => {
                                    return (
                                        <SeatSelectionRowEditor
                                            key={`row${index}`}
                                            row={row}
                                            categories={categories}
                                            onSelectSeat={(seat, indexInRow, isSelected) => handleDeleteSeat(seat, indexInRow, isSelected, index)}
                                            onAddSeat={(seat, seatIndex) =>
                                                handleAddSeat(
                                                    index,
                                                    seat,
                                                    seatIndex
                                                )
                                            }
                                            onChangeSeat={(seat, indexInRow) => handleChangeSeat(index, seat, indexInRow)}
                                            currency={currency}
                                        />
                                    );
                                })}
                                <Button onClick={handleAddRow} variant="solid" className="mt-4">
                                    Add Row
                                </Button>
                            </div>
                        </TransformComponent>
                    </TransformWrapper>
                </div>

                {/* Right Panel - Controls */}
                <div className="w-96 bg-gray-50 p-6 overflow-y-auto">
                    <div className="space-y-6">
                        {/* Import/Export Section */}
                        <div className="bg-white rounded-lg border border-gray-200">
                            <details className="group">
                                <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50">
                                    <span className="text-sm font-medium text-gray-700">Import/Export</span>
                                    <ChevronDownIcon className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" />
                                </summary>
                                <div className="p-4 border-t border-gray-200 space-y-3">
                                    <Button onClick={exportJson} variant="outline" className="w-full">
                                        <DocumentDownloadIcon className="w-4 h-4 mr-2" />
                                        Export to JSON
                                    </Button>
                                    <input
                                        accept="application/json"
                                        id="upload-json"
                                        type="file"
                                        className="hidden"
                                        onChange={importJson}
                                        ref={uploadElement}
                                    />
                                    <label htmlFor="upload-json" className="block">
                                        <span className="w-full">
                                            <DocumentAddIcon className="w-4 h-4 mr-2" />
                                            Upload JSON
                                        </span>
                                    </label>
                                </div>
                            </details>
                        </div>

                        {/* Templates Section */}
                        <div className="bg-white rounded-lg border border-gray-200">
                            <details className="group">
                                <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50">
                                    <span className="text-sm font-medium text-gray-700">Templates</span>
                                    <ChevronDownIcon className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" />
                                </summary>
                                <div className="p-4 border-t border-gray-200">
                                    <SeatMapTemplateEditor
                                        onSeatMapChange={(newSeatMap) => setSeatmapDefinition(newSeatMap)}
                                        categories={categories}
                                        seatDefinition={seatmapDefinition}
                                    />
                                </div>
                            </details>
                        </div>

                        {/* Categories Section */}
                        <div className="bg-white rounded-lg border border-gray-200">
                            <details className="group">
                                <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50">
                                    <span className="text-sm font-medium text-gray-700">Categories</span>
                                    <ChevronDownIcon className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" />
                                </summary>
                                <div className="p-4 border-t border-gray-200 space-y-3">
                                    {categories.map((category) => {
                                        return (
                                            <div
                                                key={category.id}
                                                className="flex items-center space-x-3"
                                            >
                                                <div
                                                    className="w-5 h-5 rounded border border-gray-300"
                                                    style={{ backgroundColor: category.color }}
                                                />
                                                <span className="text-sm text-gray-700">
                                                    {category.label}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </details>
                        </div>

                        {/* Original Seat Map Section */}
                        <div className="bg-white rounded-lg border border-gray-200">
                            <details className="group">
                                <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50">
                                    <span className="text-sm font-medium text-gray-700">Original Seat Map</span>
                                    <ChevronDownIcon className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" />
                                </summary>
                                <div className="p-4 border-t border-gray-200">
                                    <SeatMapOriginalSeatMap seatmap={seatmap} />
                                </div>
                            </details>
                        </div>

                        {/* Action Buttons */}
                        <div className="space-y-3">
                            <Button onClick={handleSave} variant="solid" className="w-full">
                                Save Seat Map
                            </Button>
                            <Button
                                onClick={handleDelete}
                                variant="danger"
                                className="w-full"
                            >
                                Delete Seat Map
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const SeatMapDialog = (props: {
    seatmap: any;
    onClose: () => void;
    categories: any[];
    onChange: () => void;
    currency: string;
}) => {
    return (
        <Provider store={makeStore()}>
            <SeatMapDialogInner {...props} />
        </Provider>
    );
};
