import * as React from "react";
import { cn } from "./cn";

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  helper?: string;
};

export const Input = React.forwardRef<HTMLInputElement, Props>(({ label, error, helper, className, ...rest }, ref) => (
  <div className="w-full">
    {label ? (
      <label className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </label>
    ) : null}
    <input
      ref={ref}
      className={cn(
        "block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30",
        error && "border-red-500 focus:ring-red-500/30",
        className
      )}
      {...rest}
    />
    {error ? (
      <p className="mt-1 text-sm text-red-600">{error}</p>
    ) : helper ? (
      <p className="mt-1 text-sm text-slate-500">{helper}</p>
    ) : null}
  </div>
));

Input.displayName = "Input";
