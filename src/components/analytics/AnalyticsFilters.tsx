
import React from 'react';
import { Button } from "@/components/ui/button";
import { DateRange } from 'react-day-picker';
import { addDays } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { AnalyticsFilters as FiltersType } from './types';

export interface AnalyticsFiltersProps {
  currentFilters: FiltersType;
  onFiltersChange: (filters: FiltersType) => void;
  isLoading: boolean;
}

export function AnalyticsFilters({ currentFilters, onFiltersChange, isLoading }: AnalyticsFiltersProps) {
  const handleQuickDateRange = (days: number) => {
    const today = new Date();
    onFiltersChange({
      ...currentFilters,
      dateRange: {
        from: addDays(today, -days),
        to: today,
      }
    });
  };

  const clearDateRange = () => {
    onFiltersChange({
      ...currentFilters,
      dateRange: undefined
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => handleQuickDateRange(7)}
        disabled={isLoading}
      >
        <CalendarIcon className="mr-2 h-4 w-4" />
        Last 7 days
      </Button>
      
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => handleQuickDateRange(30)}
        disabled={isLoading}
      >
        <CalendarIcon className="mr-2 h-4 w-4" />
        Last 30 days
      </Button>
      
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => handleQuickDateRange(90)}
        disabled={isLoading}
      >
        <CalendarIcon className="mr-2 h-4 w-4" />
        Last 90 days
      </Button>
      
      <Button 
        variant="outline" 
        size="sm"
        onClick={clearDateRange}
        disabled={isLoading}
      >
        Clear
      </Button>
    </div>
  );
}
