import React from 'react';
import { cn } from '../../lib/utils';

export interface StepperProps {
  currentStep: number;
  steps: {
    id: string;
    title: string;
    description?: string;
  }[];
  className?: string;
}

export function Stepper({ currentStep, steps, className }: StepperProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {steps.map((step, index) => {
        const isCurrent = index === currentStep;
        const isCompleted = index < currentStep;
        const isUpcoming = index > currentStep;
        
        return (
          <div key={step.id} className="flex items-center">
            {/* Step dot */}
            <div
              className={cn(
                "h-2.5 w-2.5 rounded-full transition-colors",
                isCurrent && "bg-primary-600",
                isCompleted && "bg-primary-600",
                isUpcoming && "bg-neutral-300"
              )}
              aria-current={isCurrent}
            />
            
            {/* Step title */}
            <span
              className={cn(
                "ml-2 text-sm font-medium transition-colors",
                isCurrent && "text-primary-600",
                isCompleted && "text-primary-600",
                isUpcoming && "text-neutral-500"
              )}
            >
              {step.title}
            </span>
            
            {/* Connector line (except for last step) */}
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "mx-4 h-px w-8 transition-colors",
                  isCompleted ? "bg-primary-600" : "bg-neutral-300"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
