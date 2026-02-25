import { Input, Switch } from "./ui";

export type DataTypeNames = "string" | "boolean";
export type DataTypes = string | boolean;

interface GenericDataCollectorProps {
    currentData: Record<string, DataTypes>;
    data: Record<string, DataTypeNames>;
    onChange: (name: string, newValue: DataTypes) => unknown;
}

export const GenericDataCollector = ({ currentData, data, onChange }: GenericDataCollectorProps) => {
    if (!data || Object.entries(data).length === 0) {
        return <p className="text-gray-500 text-center py-4">No additional data available</p>;
    }

    const safeCurrentData = currentData ?? {};
    
    return (
        <div className="space-y-4">
            {Object.entries(data).map(([key, type]) => {
                if (type === "string") {
                    return (
                        <StringCollector 
                            key={key}
                            name={key} 
                            value={safeCurrentData[key]} 
                            onChange={(value) => onChange(key, value)} 
                        />
                    );
                }
                if (type === "boolean") {
                    return (
                        <BooleanCollector 
                            key={key}
                            name={key} 
                            value={safeCurrentData[key]} 
                            onChange={(value) => onChange(key, value)} 
                        />
                    );
                }
                return null;
            })}
        </div>
    );
};

interface StringCollectorProps {
    name: string;
    value: DataTypes;
    onChange: (value: string) => void;
}

const StringCollector = ({ name, value, onChange }: StringCollectorProps) => {
    return (
        <Input
            id={`generic-${name}`}
            label={name}
            value={value as string ?? ""}
            onChange={(event) => onChange(event.target.value)}
        />
    );
};

interface BooleanCollectorProps {
    name: string;
    value: DataTypes;
    onChange: (value: boolean) => void;
}

const BooleanCollector = ({ name, value, onChange }: BooleanCollectorProps) => {
    return (
        <div className="flex items-center space-x-3">
            <Switch
                checked={value as boolean ?? false}
                onChange={onChange}
            />
            <label className="text-sm font-medium text-gray-700">
                {name}
            </label>
        </div>
    );
};
