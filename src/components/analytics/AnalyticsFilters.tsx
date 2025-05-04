
import React, { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { Card } from "@/components/ui/card";
import { StudentSelector } from "./StudentSelector";
import { TeacherSelector } from "./TeacherSelector";
import { AnalyticsFilters as FiltersType } from "./types";
import { Student, Teacher } from "./types";
import { Filter } from "lucide-react";

interface AnalyticsFiltersProps {
  filters: FiltersType;
  onFiltersChange: (filters: FiltersType) => void;
  showStudentSelector?: boolean;
  showTeacherSelector?: boolean;
  showDateSelector?: boolean;
  students?: Student[];
  teachers?: Teacher[];
}

export const AnalyticsFilters: React.FC<AnalyticsFiltersProps> = ({
  filters,
  onFiltersChange,
  showStudentSelector = false,
  showTeacherSelector = false,
  showDateSelector = true,
  students = [],
  teachers = []
}) => {
  const handleDateRangeChange = useCallback(
    (dateRange: any) => {
      onFiltersChange({ ...filters, dateRange });
    },
    [filters, onFiltersChange]
  );

  const handleStudentChange = useCallback(
    (studentId: string | null) => {
      onFiltersChange({ ...filters, studentId: studentId || undefined });
    },
    [filters, onFiltersChange]
  );

  const handleTeacherChange = useCallback(
    (teacherId: string | null) => {
      onFiltersChange({ ...filters, teacherId: teacherId || undefined });
    },
    [filters, onFiltersChange]
  );

  const handleClearFilters = useCallback(() => {
    onFiltersChange({
      dateRange: undefined,
      studentId: undefined,
      teacherId: undefined,
      schoolId: filters.schoolId // Keep the school ID
    });
  }, [filters.schoolId, onFiltersChange]);

  return (
    <Card className="p-4 bg-white shadow-sm">
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="font-medium">Filters</span>
        </div>
        
        <div className="flex flex-wrap gap-4 items-center">
          {showDateSelector && (
            <DatePickerWithRange
              date={filters.dateRange}
              onDateChange={handleDateRangeChange}
            />
          )}
          
          {showStudentSelector && (
            <StudentSelector
              students={students}
              selectedStudentId={filters.studentId}
              onSelect={handleStudentChange}
            />
          )}
          
          {showTeacherSelector && (
            <TeacherSelector
              teachers={teachers}
              selectedTeacherId={filters.teacherId}
              onSelect={handleTeacherChange}
            />
          )}
          
          <Button variant="outline" size="sm" onClick={handleClearFilters}>
            Clear filters
          </Button>
        </div>
      </div>
    </Card>
  );
};
