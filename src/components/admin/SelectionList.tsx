import { ReactNode } from "react";

export interface SelectionListOption {
    primaryLabel: string;
    secondaryLabel?: string;
    value: any;
    additionalNode?: ReactNode;
}

interface SelectionListProps {
    options: SelectionListOption[];
    selection: any[];
    onChange: (newSelection: any[]) => void;
    header: string;
    style?: React.CSSProperties;
}

export const SelectionList = ({
    options,
    selection = [],
    onChange,
    style,
    header
}: SelectionListProps) => {
    const handleClick = (value: any) => {
        let newCategories = [...selection];
        if (newCategories.includes(value)) {
            newCategories = newCategories.filter((a) => a !== value);
        } else {
            newCategories.push(value);
        }
        onChange(newCategories);
    };

    return (
        <div
            className="bg-gray-50 rounded-lg overflow-auto border border-gray-200"
            style={style}
        >
            <div className="px-4 py-3 border-b border-gray-200 bg-transparent">
                <h3 className="text-sm font-medium text-gray-700">{header}</h3>
            </div>
            
            <div className="p-2">
                {options.map((option, index) => (
                    <div
                        key={index}
                        className="flex items-center p-3 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"
                        onClick={() => handleClick(option.value)}
                    >
                        <div className="flex items-center mr-3">
                            <input
                                type="checkbox"
                                checked={selection.indexOf(option.value) !== -1}
                                id={`selection-list-${index}`}
                                readOnly
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900">
                                {option.primaryLabel}
                            </div>
                            {option.secondaryLabel && (
                                <div className="text-sm text-gray-500">
                                    {option.secondaryLabel}
                                </div>
                            )}
                        </div>
                        
                        {option.additionalNode && (
                            <div className="ml-3">
                                {option.additionalNode}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
