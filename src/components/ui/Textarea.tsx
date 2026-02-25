import { forwardRef, TextareaHTMLAttributes } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    className?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className = "", ...props }, ref) => {
        const baseClasses = "w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500";
        const classes = `${baseClasses} ${className}`;
        
        return (
            <textarea
                ref={ref}
                className={classes}
                {...props}
            />
        );
    }
);

Textarea.displayName = "Textarea";
