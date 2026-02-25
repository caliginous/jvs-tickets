import * as React from "react";
import { cn } from "./cn";

export function FilterBar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  // 2 rows on mobile, compact grid on md+
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-3 md:grid-cols-12 md:items-end",
        className
      )}
    >
      {children}
    </div>
  );
}

// Usage example per field:
// <div className="md:col-span-3"> ...control... </div>
