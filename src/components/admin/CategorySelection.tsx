import { useState } from "react";
import { SelectionList } from "./SelectionList";
import { Notifications } from "../../lib/notifications/NotificationTypes";

interface CategorySelectionProps {
    currentValues: Record<string, string[]>;
    selectionValues: Record<string, string[]>;
    onChange: (values: Record<string, string[]>) => void;
}

export const CategorySelection = ({ currentValues, selectionValues, onChange }: CategorySelectionProps) => {
    const [currentTab, setCurrentTab] = useState(Object.keys(selectionValues)[0]);

    const handleChange = (newList: string[]) => {
        const copy = { ...currentValues };
        copy[currentTab] = newList;
        onChange(copy);
    };

    const handleCheckAll = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.checked) {
            onChange({ ...selectionValues });
            return;
        }
        onChange(Object.keys(Notifications).reduce((obj, val) => {
            if (val in obj) return obj;
            obj[val] = [];
            return obj;
        }, {} as Record<string, string[]>));
    };

    const allItemsSelected = Object.keys(selectionValues).every(sel => 
        selectionValues[sel].every(key => currentValues[sel]?.includes(key))
    );

    const hasSomeSelected = Object.values(currentValues).some((val: string[]) => val.length > 0);

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Tab Selection */}
            <div className="flex flex-col items-center justify-center p-4 space-y-4">
                <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2">
                    {Object.keys(selectionValues).map((value, index) => (
                        <button
                            key={index}
                            onClick={() => setCurrentTab(value)}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                                currentTab === value
                                    ? "bg-blue-600 text-white shadow-md"
                                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                        >
                            {value.replace("_", " ")}
                        </button>
                    ))}
                </div>
                
                <label className="flex items-center space-x-2">
                    <input
                        type="checkbox"
                        checked={allItemsSelected}
                        ref={(input) => {
                            if (input) {
                                input.indeterminate = !allItemsSelected && hasSomeSelected;
                            }
                        }}
                        onChange={handleCheckAll}
                        id="category-selection-check-all"
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Check all</span>
                </label>
            </div>

            {/* Selection List */}
            <div className="md:col-span-2 flex items-center">
                <SelectionList
                    options={selectionValues[currentTab]?.map((val) => ({
                        value: val, 
                        primaryLabel: val
                    })) || []}
                    selection={currentValues[currentTab] || []}
                    onChange={handleChange}
                    header=""
                    style={{ flexGrow: 1 }}
                />
            </div>
        </div>
    );
};
