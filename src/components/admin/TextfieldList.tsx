import { Button, Input } from "../ui";
import { TrashIcon, PlusIcon } from "@heroicons/react/solid";

interface TextfieldListProps {
    values: string[];
    onChange: (newValue: string[]) => void;
    header: string;
}

export const TextfieldList = ({ values, onChange, header }: TextfieldListProps) => {
    const getCopy = () => {
        return values.map(value => value);
    };

    const handleChange = (value: string, index: number) => {
        const newValue = getCopy();
        newValue[index] = value;
        onChange(newValue);
    };

    const handleDelete = (index: number) => {
        const newValue = getCopy();
        newValue.splice(index, 1);
        onChange(newValue);
    };

    const handleAdd = () => {
        const newValue = getCopy();
        newValue.push("");
        onChange(newValue);
    };

    return (
        <div className="bg-gray-50 rounded-lg overflow-auto border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-200 bg-transparent">
                <h3 className="text-sm font-medium text-gray-700">{header}</h3>
            </div>
            
            <div className="p-4 space-y-3">
                {values.map((value, index) => (
                    <div key={index} className="relative">
                        <Input
                            value={value}
                            onChange={(event) => handleChange(event.target.value, index)}
                        />
                        <button
                            onClick={() => handleDelete(index)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-red-500 hover:text-red-700 transition-colors"
                            type="button"
                        >
                            <TrashIcon className="w-4 h-4" />
                        </button>
                    </div>
                ))}
                
                <Button
                    onClick={handleAdd}
                    className="w-full"
                >
                    <PlusIcon className="w-4 h-4 mr-2" />
                    Add
                </Button>
            </div>
        </div>
    );
};
