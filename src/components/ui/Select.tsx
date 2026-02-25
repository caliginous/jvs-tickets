import { Listbox, Transition } from "@headlessui/react";
import { Fragment, useState } from "react";
import { cn } from "./cn";

export type Option<T = string> = { value: T; label: React.ReactNode };

export function Select<T extends Option>({
  value,
  onChange,
  options,
  label,
  placeholder = "Select…",
  className,
}: {
  value?: any;
  onChange: (v: any) => void;
  options: T[];
  label?: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("w-full", className)}>
      {label ? (
        <label className="mb-2 block text-sm font-medium text-slate-700">
          {label}
        </label>
      ) : null}
      <Listbox value={value ?? null} onChange={(option) => {
        if (option && typeof option === 'object' && 'value' in option) {
          onChange(option.value);
        } else {
          onChange(undefined);
        }
      }}>
        {({ open }) => (
          <div className="relative">
            <Listbox.Button className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-left text-sm">
              {value ? options.find(opt => opt.value === value)?.label ?? placeholder : placeholder}
            </Listbox.Button>
            <Transition.Root show={Boolean(open)} as={Fragment}>
              <Transition.Child
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-white p-1 shadow-lg">
                  {options.map((opt) => (
                    <Listbox.Option
                      key={opt.value}
                      value={opt}
                      className="cursor-pointer rounded px-2 py-1 ui-active:bg-slate-100"
                    >
                      {typeof opt.label === 'string' ? opt.label : opt.label}
                    </Listbox.Option>
                  ))}
                </Listbox.Options>
              </Transition.Child>
            </Transition.Root>
          </div>
        )}
      </Listbox>
    </div>
  );
}
