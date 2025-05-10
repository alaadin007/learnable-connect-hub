
import React from 'react';
import { Button } from "@/components/ui/button";
import { DateRange } from 'react-day-picker';
import { addDays } from "date-fns";
import { CalendarIcon } from "lucide-react";

interface AnalyticsFiltersProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
}

export function AnalyticsFilters({ dateRange, onDateRangeChange }: AnalyticsFiltersProps) {
  const handleQuickDateRange = (days: number) => {
    const today = new Date();
    onDateRangeChange({
      from: addDays(today, -days),
      to: today,
    });
  };

  const clearDateRange = () => {
    onDateRangeChange(undefined);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => handleQuickDateRange(7)}
      >
        <CalendarIcon className="mr-2 h-4 w-4" />
        Last 7 days
      </Button>
      
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => handleQuickDateRange(30)}
      >
        <CalendarIcon className="mr-2 h-4 w-4" />
        Last 30 days
      </Button>
      
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => handleQuickDateRange(90)}
      >
        <CalendarIcon className="mr-2 h-4 w-4" />
        Last 90 days
      </Button>
      
      <Button 
        variant="outline" 
        size="sm"
        onClick={clearDateRange}
      >
        Clear
      </Button>
    </div>
  );
}
