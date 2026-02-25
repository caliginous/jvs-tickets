import { ReactNode } from "react";

interface BadgeProps {
    children: ReactNode;
    variant?: "default" | "secondary" | "destructive" | "outline";
    size?: "sm" | "md" | "lg";
    className?: string;
}

export function Badge({
    children,
    variant = "default",
    size = "md",
    className = ""
}: BadgeProps) {
    const baseClasses = "inline-flex items-center rounded-full font-medium";
    
    const variantClasses = {
        default: "bg-indigo-100 text-indigo-800 border border-indigo-200",
        secondary: "bg-gray-100 text-gray-800 border border-gray-200",
        destructive: "bg-red-100 text-red-800 border border-red-200",
        outline: "bg-transparent text-gray-700 border border-gray-300"
    };
    
    const sizeClasses = {
        sm: "px-2 py-0.5 text-xs",
        md: "px-2.5 py-1 text-sm",
        lg: "px-3 py-1.5 text-sm"
    };
    
    const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;
    
    return (
        <span className={classes}>
            {children}
        </span>
    );
}
