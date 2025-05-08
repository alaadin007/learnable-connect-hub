
import React from "react";
import { Button } from "@/components/ui/button";
import { DateRange } from "@/components/analytics/types";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";

export interface DateRangePickerProps {
  dateRange: DateRange;
  onChange: (range: DateRange) => void;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({ 
  dateRange,
  onChange
}) => {
  return (
    <DatePickerWithRange
      date={dateRange}
      onDateChange={onChange}
    />
  );
};
