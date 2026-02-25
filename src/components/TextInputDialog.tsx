import { useState } from "react";
import { Dialog, Button, Textarea } from "../ui";

interface TextInputDialogProps {
    open: boolean;
    onTextInput: (value: string) => void;
    onClose: () => void;
    title: string;
    placeholder?: string;
}

export const TextInputDialog = ({ open, onTextInput, onClose, title, placeholder }: TextInputDialogProps) => {
    const [value, setValue] = useState("");

    return (
        <Dialog open={open} onClose={onClose}>
            <Dialog.Header>
                <h2 className="text-xl font-semibold">{title}</h2>
            </Dialog.Header>
            <Dialog.Body>
                <Textarea
                    placeholder={placeholder}
                    value={value}
                    onChange={(event) => setValue(event.target.value)}
                    id="text-input-dialog-input"
                    className="w-full min-h-[120px]"
                />
            </Dialog.Body>
            <Dialog.Footer>
                <Button
                    onClick={() => {
                        onTextInput(value);
                        onClose();
                    }}
                    id="text-input-dialog-continue"
                >
                    Continue
                </Button>
            </Dialog.Footer>
        </Dialog>
    );
};
