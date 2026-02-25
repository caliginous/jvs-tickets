import { ReactNode } from "react";

interface EmptyStateProps {
    title: string;
    subtitle?: string;
    action?: ReactNode;
    icon?: ReactNode;
    className?: string;
}

export function EmptyState({
    title,
    subtitle,
    action,
    icon,
    className = ""
}: EmptyStateProps) {
    return (
        <div className={`text-center py-12 ${className}`}>
            {icon && (
                <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                    {icon}
                </div>
            )}
            <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
            {subtitle && (
                <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">{subtitle}</p>
            )}
            {action && <div>{action}</div>}
        </div>
    );
}
