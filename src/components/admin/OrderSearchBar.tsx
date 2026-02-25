import React, { useState, useCallback, useRef, useEffect } from 'react';
import { SearchIcon, XIcon, ClockIcon, BookmarkIcon } from '@heroicons/react/solid';
import { Input } from '../ui';

interface SearchHistory {
  id: string;
  query: string;
  timestamp: Date;
  resultCount: number;
}

interface OrderSearchBarProps {
  onSearch: (query: string) => void;
  loading?: boolean;
  placeholder?: string;
  className?: string;
  value?: string;
}

export const OrderSearchBar: React.FC<OrderSearchBarProps> = ({
  onSearch,
  loading = false,
  placeholder = "Search orders by ID, email, name, event, or phone...",
  className = "",
  value = ""
}) => {
  const [query, setQuery] = useState(value);
  const [isFocused, setIsFocused] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Sync with external value prop
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Load search history from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('orderSearchHistory');
      if (saved) {
        const history = JSON.parse(saved).map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        }));
        setSearchHistory(history.slice(0, 10)); // Keep last 10 searches
      }
    } catch (error) {
      console.warn('Failed to load search history:', error);
    }
  }, []);

  // Debounced search with 300ms delay
  const debouncedSearch = useCallback((searchQuery: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      if (searchQuery.trim()) {
        // Add to search history
        const newHistoryItem: SearchHistory = {
          id: Date.now().toString(),
          query: searchQuery.trim(),
          timestamp: new Date(),
          resultCount: 0 // Will be updated by parent component
        };

        setSearchHistory(prev => {
          const filtered = prev.filter(item => item.query !== searchQuery.trim());
          const updated = [newHistoryItem, ...filtered].slice(0, 10);
          
          try {
            localStorage.setItem('orderSearchHistory', JSON.stringify(updated));
          } catch (error) {
            console.warn('Failed to save search history:', error);
          }
          
          return updated;
        });
      }
      
      onSearch(searchQuery);
    }, 300);
  }, [onSearch]);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    debouncedSearch(value);
  };

  const handleClear = () => {
    setQuery('');
    onSearch('');
    setShowHistory(false);
  };

  const handleHistorySelect = (historyItem: SearchHistory) => {
    setQuery(historyItem.query);
    onSearch(historyItem.query);
    setShowHistory(false);
  };

  const handleClearHistory = () => {
    setSearchHistory([]);
    try {
      localStorage.removeItem('orderSearchHistory');
    } catch (error) {
      console.warn('Failed to clear search history:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowHistory(false);
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Main Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <SearchIcon className="h-5 w-5 text-gray-400" />
        </div>
        
        <input
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            // Delay hiding history to allow clicks
            setTimeout(() => setIsFocused(false), 200);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm placeholder-gray-500"
          disabled={loading}
        />
        
        {/* Clear Button */}
        {query && (
          <button
            onClick={handleClear}
            className="absolute inset-y-0 right-8 flex items-center pr-2 text-gray-400 hover:text-gray-600"
          >
            <XIcon className="h-5 w-5" />
          </button>
        )}
        
        {/* Loading Indicator */}
        {loading && (
          <div className="absolute inset-y-0 right-3 flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          </div>
        )}
      </div>

      {/* Search History Dropdown */}
      {isFocused && searchHistory.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Recent Searches</span>
            <button
              onClick={handleClearHistory}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Clear All
            </button>
          </div>
          
          {searchHistory.map((item) => (
            <button
              key={item.id}
              onClick={() => handleHistorySelect(item)}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center justify-between group"
            >
              <div className="flex items-center space-x-3">
                <ClockIcon className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-900">{item.query}</span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                {item.resultCount > 0 && (
                  <span className="bg-gray-100 px-2 py-1 rounded">
                    {item.resultCount} results
                  </span>
                )}
                <span>{item.timestamp.toLocaleDateString()}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Search Tips */}
      {isFocused && !query && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg p-4">
          <div className="text-sm text-gray-600">
            <p className="font-medium mb-2">Search Tips:</p>
            <ul className="space-y-1 text-xs">
              <li>• <strong>Order ID:</strong> Enter full or partial order ID</li>
              <li>• <strong>Email:</strong> Search by customer email address</li>
              <li>• <strong>Name:</strong> Search by customer first or last name</li>
              <li>• <strong>Event:</strong> Search by event title</li>
              <li>• <strong>Phone:</strong> Search by phone number</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderSearchBar;
