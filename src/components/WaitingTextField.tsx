import { ChangeEvent, useEffect, useState } from "react";
import { Input } from "./ui";

interface WaitingTextFieldProps {
    time?: number;
    value?: string;
    onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
    [key: string]: any;
}

export const WaitingTextField = (props: WaitingTextFieldProps) => {
    const { time, ...additionalProps } = props;
    const [waitEvent, setWaitEvent] = useState<ChangeEvent<HTMLInputElement> | null>(null);
    const [value, setValue] = useState(props.value);

    useEffect(() => {
        setValue(props.value);
    }, [props.value]);

    useEffect(() => {
        let timer: NodeJS.Timeout | null = null;
        if (waitEvent && additionalProps.onChange) {
            timer = setTimeout(() => additionalProps.onChange(waitEvent), time ?? 1000);
        }
        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [waitEvent, additionalProps, time]);

    const onChange = (event: ChangeEvent<HTMLInputElement>) => {
        setWaitEvent(event);
        setValue(event.target.value);
    };

    return <Input {...additionalProps} onChange={onChange} value={value} />;
};
