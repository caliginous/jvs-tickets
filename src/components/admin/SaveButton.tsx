import React, { useState } from "react";
import { Button } from "../ui";

type BaseButtonProps = React.ComponentProps<typeof Button>;
interface SaveButtonProps extends Omit<BaseButtonProps, "loading" | "onClick"> {
    action: () => Promise<void>;
    onComplete?: () => void;
    children?: React.ReactNode;
}

export const SaveButton = ({ action, onComplete, children, ...props }: SaveButtonProps) => {
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const handleClick = async () => {
        setIsLoading(true);
        try {
            await action();
            if (onComplete) onComplete();
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Button
            loading={isLoading}
            onClick={handleClick}
            size="md"
            {...props}
        >
            {children ?? "Save"}
        </Button>
    );
};
