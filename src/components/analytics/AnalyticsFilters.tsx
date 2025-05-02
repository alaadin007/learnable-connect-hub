
import React from "react";
import { DateRangePicker } from "./DateRangePicker";
import { StudentSelector } from "./StudentSelector";
import { TeacherSelector } from "./TeacherSelector";
import { Card, CardContent } from "@/components/ui/card";
import { Filter } from "lucide-react";
import { AnalyticsFilters as FiltersType, DateRange } from "./types";

interface AnalyticsFiltersProps {
  filters: FiltersType;
  onFiltersChange: (filters: FiltersType) => void;
  showStudentSelector?: boolean;
  showTeacherSelector?: boolean;
  students?: { id: string; name: string }[]; // Add students prop
}

export function AnalyticsFilters({ 
  filters, 
  onFiltersChange,
  showStudentSelector = false,
  showTeacherSelector = false,
  students = [] // Default to empty array
}: AnalyticsFiltersProps) {
  const handleDateRangeChange = (range: DateRange | undefined) => {
    // Ensure 'from' is defined in the DateRange as required by type
    const updatedRange = range 
      ? { ...range, from: range.from || undefined } 
      : undefined;
      
    onFiltersChange({
      ...filters,
      dateRange: updatedRange
    });
  };

  const handleStudentChange = (studentId: string | undefined) => {
    onFiltersChange({
      ...filters,
      studentId
    });
  };

  const handleTeacherChange = (teacherId: string | undefined) => {
    onFiltersChange({
      ...filters,
      teacherId
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
            <div>
              <DateRangePicker
                dateRange={filters.dateRange}
                onDateRangeChange={handleDateRangeChange}
              />
            </div>
            
            {showStudentSelector && (
              <div>
                <StudentSelector 
                  students={students}
                  selectedStudentId={filters.studentId} 
                  onStudentChange={handleStudentChange}
                />
              </div>
            )}
            
            {showTeacherSelector && (
              <div>
                <TeacherSelector
                  schoolId={typeof filters.schoolId === 'string' ? filters.schoolId : ''}
                  selectedTeacherId={filters.teacherId}
                  onTeacherChange={handleTeacherChange}
                />
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
