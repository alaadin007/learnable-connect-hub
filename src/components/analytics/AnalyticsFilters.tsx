
import React from "react";
import { DateRangePicker } from "./DateRangePicker";
import { StudentSelector } from "./StudentSelector";
import { Card, CardContent } from "@/components/ui/card";
import { Filter } from "lucide-react";
import { AnalyticsFilters as FiltersType } from "./types";

interface AnalyticsFiltersProps {
  filters: FiltersType;
  onFiltersChange: (filters: FiltersType) => void;
  showStudentSelector?: boolean;
}

export function AnalyticsFilters({ 
  filters, 
  onFiltersChange,
  showStudentSelector = false 
}: AnalyticsFiltersProps) {
  const handleDateRangeChange = (range: { from?: Date; to?: Date } | undefined) => {
    onFiltersChange({
      ...filters,
      dateRange: range || { from: undefined, to: undefined }
    });
  };

  const handleStudentChange = (studentId: string | undefined) => {
    onFiltersChange({
      ...filters,
      studentId
    });
  };

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="flex items-center text-muted-foreground mb-2 md:mb-0">
            <Filter className="w-4 h-4 mr-2" />
            <span>Filter Analytics:</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
            <div>
              <DateRangePicker
                dateRange={filters.dateRange}
                onDateRangeChange={handleDateRangeChange}
              />
            </div>
            
            {showStudentSelector && (
              <div>
                <StudentSelector 
                  selectedStudent={filters.studentId} 
                  onStudentChange={handleStudentChange}
                />
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
