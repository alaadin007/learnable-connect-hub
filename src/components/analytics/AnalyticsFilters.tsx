
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "lucide-react";
import { DateRange } from "react-day-picker";

interface AnalyticsFiltersProps {
  dateRange?: DateRange;
  onDateRangeChange?: (range: DateRange) => void;
}

export function AnalyticsFilters({ dateRange, onDateRangeChange }: AnalyticsFiltersProps) {
  const [timeRange, setTimeRange] = useState<string>('30days');

  const handleTimeRangeChange = (value: string) => {
    setTimeRange(value);
    
    if (!onDateRangeChange) return;
    
    const today = new Date();
    let fromDate: Date | undefined;
    const toDate = today;
    
    switch (value) {
      case '7days':
        fromDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
        break;
      case '30days':
        fromDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30);
        break;
      case '90days':
        fromDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 90);
        break;
      case 'thisWeek':
        const day = today.getDay();
        fromDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - day);
        break;
      case 'thisMonth':
        fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      default:
        fromDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30);
    }
    
    onDateRangeChange({ from: fromDate, to: toDate });
  };

  return (
    <div className="flex items-center space-x-4">
      <Select value={timeRange} onValueChange={handleTimeRangeChange}>
        <SelectTrigger className="w-[180px]">
          <Calendar className="mr-2 h-4 w-4" />
          <SelectValue placeholder="Select time range" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="7days">Last 7 days</SelectItem>
          <SelectItem value="30days">Last 30 days</SelectItem>
          <SelectItem value="90days">Last 90 days</SelectItem>
          <SelectItem value="thisWeek">This week</SelectItem>
          <SelectItem value="thisMonth">This month</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
