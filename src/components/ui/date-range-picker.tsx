
import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { DateRange } from "react-day-picker"

type DatePickerWithRangeProps = {
  date: DateRange | undefined;
  onDateChange: (date: DateRange | undefined) => void;
}

export function DatePickerWithRange({
  date,
  onDateChange
}: DatePickerWithRangeProps) {
  const [open, setOpen] = React.useState(false)

  // Ensure 'to' date is properly handled as optional
  const handleDateSelect = (selectedDate: DateRange | undefined) => {
    // If selectedDate is undefined or incomplete, use the proper fallback
    if (!selectedDate) {
      onDateChange(undefined);
      return;
    }
    
    // Ensure 'from' date is set
    if (!selectedDate.from) {
      const today = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(today.getDate() - 30);
      
      onDateChange({
        from: thirtyDaysAgo,
        to: today
      });
      return;
    }
    
    // Pass along the selection (handles both cases: with or without 'to')
    onDateChange(selectedDate);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-[300px] justify-start text-left font-normal",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date?.from ? (
            date.to ? (
              `${format(date.from, "MMM d, yyyy")} - ${format(
                date.to,
                "MMM d, yyyy"
              )}`
            ) : (
              format(date.from, "MMM d, yyyy")
            )
          ) : (
            <span>Pick a date range</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <Calendar
          mode="range"
          defaultMonth={date?.from}
          selected={date}
          onSelect={handleDateSelect}
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  )
}
