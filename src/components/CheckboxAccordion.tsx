import React from "react";

interface CheckboxAccordionProps {
    label: React.ReactNode;
    name: string;
    selectedItem: string;
    onSelect: (checkedItem: string | null) => unknown;
    children: React.ReactNode;
}

export const CheckboxAccordion = ({
    label,
    name,
    selectedItem,
    onSelect,
    children
}: CheckboxAccordionProps) => {
    const onCheckChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        onSelect(event.target.checked ? name : null);
    };

    const handleChange = (_: React.SyntheticEvent, isSelected: boolean) => {
        onSelect(isSelected ? name : null);
    };

    const isExpanded = name === selectedItem;

    return (
        <div className="border border-gray-200 rounded-lg mb-2">
            <details open={isExpanded} className="group">
                <summary 
                    className="flex items-center p-4 cursor-pointer hover:bg-gray-50 list-none"
                    onClick={(e) => {
                        e.preventDefault();
                        handleChange(e, !isExpanded);
                    }}
                >
                    <input
                        type="checkbox"
                        checked={name === selectedItem}
                        onChange={onCheckChange}
                        className="mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        id={`checkbox-${name}`}
                    />
                    <span className="text-base font-medium text-gray-900 flex items-center">
                        {label}
                    </span>
                    <div className="ml-auto w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform">
                        ▼
                    </div>
                </summary>
                <div className="px-4 pb-4 border-t border-gray-200">
                    {children}
                </div>
            </details>
        </div>
    );
};
