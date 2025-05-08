
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';

interface AnalyticsFiltersProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  selectedTeacherId?: string;
}

export const AnalyticsFilters = ({ 
  dateRange, 
  onDateRangeChange,
  selectedTeacherId
}: AnalyticsFiltersProps) => {
  return (
    <Card>
      <CardContent className="flex flex-col sm:flex-row justify-between gap-4 p-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">Date Range:</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant="outline"
                className={cn(
                  "w-[300px] justify-start text-left font-normal",
                  !dateRange && "text-muted-foreground"
                )}
              >
                <Calendar className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "LLL dd, y")} -{" "}
                      {format(dateRange.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(dateRange.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={(range) => onDateRangeChange(range as DateRange)}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onDateRangeChange({
              from: new Date(new Date().setDate(new Date().getDate() - 7)),
              to: new Date(),
            })}
          >
            Last 7 days
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onDateRangeChange({
              from: new Date(new Date().setDate(new Date().getDate() - 30)),
              to: new Date(),
            })}
          >
            Last 30 days
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
