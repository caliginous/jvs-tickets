import { Switch as HeadlessSwitch } from '@headlessui/react';
import { cn } from './cn';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Switch({ checked, onChange, disabled = false, className, size = 'md' }: SwitchProps) {
  const sizeClasses = {
    sm: 'h-5 w-9',
    md: 'h-6 w-11',
    lg: 'h-7 w-14'
  };

  const thumbSizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  const thumbTranslateClasses = {
    sm: 'translate-x-4',
    md: 'translate-x-5',
    lg: 'translate-x-7'
  };

  return (
    <HeadlessSwitch
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      className={cn(
        "relative inline-flex items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed",
        checked ? "bg-blue-600" : "bg-gray-200",
        sizeClasses[size],
        className
      )}
    >
      <span
        className={cn(
          "inline-block transform rounded-full bg-white transition-transform",
          checked ? thumbTranslateClasses[size] : "translate-x-1",
          thumbSizeClasses[size]
        )}
      />
    </HeadlessSwitch>
  );
}
