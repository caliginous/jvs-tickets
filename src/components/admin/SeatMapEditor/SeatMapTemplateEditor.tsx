import { useEffect, useState } from "react";
import { Button, Input, Select } from "../../ui";

const templateGenerators = [
    (data, categoryId) => {
        return Array.from(Array(data.rows).keys()).map(() => Array.from(Array(data.cols).keys()).map(() => ({
            type: "seat",
            category: categoryId,
            amount: 1
        })))
    },
    (data, categoryId) => {
        return Array.from(Array(data.rows).keys()).map(() => {
            let currentBlockWidth = 0;
            return Array.from(Array(data.cols).keys()).map(() => {
                if (currentBlockWidth < data.blockWidth) {
                    currentBlockWidth++;
                    return {
                        type: "seat",
                        category: categoryId,
                        amount: 1
                    }
                }
                currentBlockWidth = 0;
                return {
                    type: "space",
                    amount: data.spacing
                }
            })
        });
    }
];

const countingGenerators = {
    "rows": (definition) => {
        let index = 0;
        return definition.map(row => row.map(seat => {
            if (seat.type !== "seat") return seat;
            index++;
            return {
                ...seat,
                id: index
            }
        }))
    },
    "cols": (definition, templateData) => {
        let index = 0;
        const newDefinition = definition.map(row => row.map(col => col));
        for (let col = 0; col < templateData.cols; col++) {
            for (let row of newDefinition) {
                if (row[col].type !== "seat") continue;
                index++;
                row[col].id = index;
            }
        }
        return newDefinition;
    },
    "block": (definition, templateData) => {
        let index = 0;
        const newDefinition = definition.map(row => row.map(col => col));
        for (let block = 0; block < Math.ceil(templateData.cols / templateData.blockWidth); block++) {
            for (let row of newDefinition) {
                for (let col = 0; col < templateData.blockWidth; col++) {
                    const rowIndex = col + (templateData.blockWidth + 1) * block;
                    if (row.length <= rowIndex || row[rowIndex].type !== "seat") continue;
                    index++;
                    row[rowIndex].id = index;
                }
            }
        }
        return newDefinition;
    }
}

interface SeatMapTemplateEditorProps {
    onSeatMapChange: (seatMap: any) => void;
    categories: Array<{ id: number; label: string; color?: string; price?: number }>;
    seatDefinition: any;
}

export const SeatMapTemplateEditor = ({ onSeatMapChange, categories, seatDefinition }: SeatMapTemplateEditorProps) => {
    const [value, setValue] = useState(0);
    const [templateData, setTemplateData] = useState<any>(null);
    const [category, setCategory] = useState(categories[0]?.id || 0);
    const [countingValue, setCountingValue] = useState("rows");

    const apply = () => {
        onSeatMapChange(templateGenerators[value](templateData, category));
    }

    const applyCounting = () => {
        onSeatMapChange(countingGenerators[countingValue](seatDefinition, templateData));
    }

    return (
        <div className="space-y-6">
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-center text-gray-900">Template</h3>
                
                <div className="space-y-4">
                    <div className="grid w-full grid-cols-2">
                        <button
                            onClick={() => setValue(0)}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                                value === 0 
                                    ? 'bg-blue-600 text-white' 
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            Rows
                        </button>
                        <button
                            onClick={() => setValue(1)}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                                value === 1 
                                    ? 'bg-blue-600 text-white' 
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            Blocks
                        </button>
                    </div>
                    
                    <div className="space-y-4">
                        {value === 0 && (
                            <DataInput
                                initialData={{
                                    rows: 5,
                                    cols: 5
                                }}
                                onChange={(data) => setTemplateData(data)}
                            />
                        )}
                        {value === 1 && (
                            <DataInput
                                initialData={{
                                    rows: 5,
                                    cols: 5,
                                    blockWidth: 2,
                                    spacing: 1
                                }}
                                onChange={(data) => setTemplateData(data)}
                            />
                        )}
                    </div>
                </div>
                
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Category</label>
                    <Select
                        value={category.toString()}
                        onChange={(val) => setCategory(val ? parseInt(val) : 0)}
                        options={categories.map(cat => ({
                            value: cat.id.toString(),
                            label: cat.label
                        }))}
                        placeholder="Select category"
                    />
                </div>
                
                <Button onClick={apply} className="w-full">
                    Apply Template
                </Button>
            </div>
            
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-center text-gray-900">Seat ID Counting</h3>
                
                <div className="grid grid-cols-3 gap-2">
                    {["rows", "cols", "block"].map((option) => (
                        <button
                            key={option}
                            onClick={() => setCountingValue(option)}
                            className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                                countingValue === option
                                    ? "bg-blue-600 text-white border-blue-600"
                                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                            }`}
                        >
                            {option === "rows" ? "Rows" : option === "cols" ? "Columns" : "Blocks"}
                        </button>
                    ))}
                </div>
                
                <Button onClick={applyCounting} className="w-full">
                    Apply Counting
                </Button>
            </div>
        </div>
    );
}

interface DataInputProps {
    initialData: Record<string, number>;
    onChange: (data: Record<string, number>) => void;
}

const DataInput = ({ initialData, onChange }: DataInputProps) => {
    const [data, setData] = useState(initialData);

    const handleChange = (key: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
        setData({
            ...data,
            [key]: parseInt(event.target.value) || 0
        });
    };

    useEffect(() => {
        onChange(data);
    }, [data, onChange]);

    return (
        <div className="space-y-3 p-4">
            {Object.entries(data).map(([key, value]) => {
                let labelResult = key.replace(/([A-Z])/g, " $1");
                labelResult = labelResult.charAt(0).toUpperCase() + labelResult.slice(1);
                return (
                    <div key={key} className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">
                            {labelResult}
                        </label>
                        <Input
                            type="number"
                            value={value}
                            onChange={handleChange(key)}
                            min={1}
                            className="w-full"
                        />
                    </div>
                );
            })}
        </div>
    );
};
