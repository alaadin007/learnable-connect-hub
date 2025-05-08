import React from 'react';
import { DateRange } from 'react-day-picker';
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { format } from 'date-fns';

export interface AnalyticsFiltersProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  selectedTeacherId?: string;
  selectedStudentId?: string;
}

export const AnalyticsFilters: React.FC<AnalyticsFiltersProps> = ({
  dateRange,
  onDateRangeChange,
  selectedTeacherId,
  selectedStudentId
}) => {
  return (
    <div className="flex items-center space-x-4">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[300px] justify-start text-left font-normal",
              !dateRange.from ? "text-muted-foreground" : ""
            )}
          >
            <Calendar className="mr-2 h-4 w-4" />
            {dateRange.from ? (
              dateRange.to ? (
                `${format(dateRange.from, "PPP")} - ${format(dateRange.to, "PPP")}`
              ) : (
                format(dateRange.from, "PPP")
              )
            ) : (
              <span>Pick a date</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            defaultMonth={dateRange?.from}
            selected={dateRange}
            onSelect={onDateRangeChange}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
      {selectedTeacherId && <p>Selected Teacher: {selectedTeacherId}</p>}
      {selectedStudentId && <p>Selected Student: {selectedStudentId}</p>}
    </div>
  );
};
