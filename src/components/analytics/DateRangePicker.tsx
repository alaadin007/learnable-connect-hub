
import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { addDays, format } from "date-fns";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateRangePickerProps {
  date: DateRange | undefined;
  onDateChange: (date: DateRange) => void;
  className?: string;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  date,
  onDateChange,
  className,
}) => {
  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[300px] justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y")} -{" "}
                  {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={(selectedDate) => onDateChange(selectedDate || { from: undefined, to: undefined })}
            numberOfMonths={2}
          />
          <div className="p-3 border-t border-border flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="mr-auto"
              onClick={() => onDateChange({ from: undefined, to: undefined })}
            >
              Clear
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                const today = new Date();
                onDateChange({
                  from: addDays(today, -7),
                  to: today
                });
              }}
            >
              Last 7 days
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                const today = new Date();
                onDateChange({
                  from: addDays(today, -30),
                  to: today
                });
              }}
            >
              Last 30 days
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
