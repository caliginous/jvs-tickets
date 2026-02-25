import React from 'react';
import { Button } from '../ui';
import { 
  CalendarIcon, 
  ExclamationCircleIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  ClockIcon,
  CurrencyPoundIcon
} from '@heroicons/react/solid';

interface QuickFilter {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  query: string;
}

interface OrderQuickFiltersProps {
  onFilterSelect: (query: string, label: string, filterId: string) => void;
  activeFilters?: {[key: string]: string};
  className?: string;
}

const quickFilters: QuickFilter[] = [
  {
    id: 'today',
    label: "Today's Orders",
    icon: <CalendarIcon className="w-4 h-4" />,
    color: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
    query: 'today'
  },
  {
    id: 'unpaid',
    label: 'Unpaid Orders',
    icon: <ExclamationCircleIcon className="w-4 h-4" />,
    color: 'bg-red-100 text-red-800 hover:bg-red-200',
    query: 'status:PENDING'
  },
  {
    id: 'paid',
    label: 'Paid Orders',
    icon: <CheckCircleIcon className="w-4 h-4" />,
    color: 'bg-green-100 text-green-800 hover:bg-green-200',
    query: 'status:PAID'
  },
  {
    id: 'cancelled',
    label: 'Cancelled Orders',
    icon: <XCircleIcon className="w-4 h-4" />,
    color: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
    query: 'status:CANCELLED'
  },
  {
    id: 'refunded',
    label: 'Refunded Orders',
    icon: <CurrencyPoundIcon className="w-4 h-4" />,
    color: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
    query: 'status:REFUNDED'
  },
  {
    id: 'recent',
    label: 'Recent Orders',
    icon: <ClockIcon className="w-4 h-4" />,
    color: 'bg-purple-100 text-purple-800 hover:bg-purple-200',
    query: 'recent:7d'
  }
];

export const OrderQuickFilters: React.FC<OrderQuickFiltersProps> = ({
  onFilterSelect,
  activeFilters = {},
  className = ""
}) => {
  const isFilterActive = (filterId: string) => {
    return activeFilters.hasOwnProperty(filterId);
  };

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {quickFilters.map((filter) => {
        const isActive = isFilterActive(filter.id);
        return (
          <Button
            key={filter.id}
            variant="ghost"
            size="sm"
            onClick={() => onFilterSelect(filter.query, filter.label, filter.id)}
            className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              isActive 
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm' 
                : filter.color
            }`}
          >
            {filter.icon}
            <span>{filter.label}</span>
            {isActive && (
              <span className="ml-1 inline-flex items-center justify-center w-4 h-4 bg-blue-700 rounded-full">
                <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </span>
            )}
          </Button>
        );
      })}
    </div>
  );
};

export default OrderQuickFilters;
