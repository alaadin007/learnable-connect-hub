
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
  students?: { id: string; name: string }[];
}

export const AnalyticsFilters: React.FC<AnalyticsFiltersProps> = ({
  filters,
  onFiltersChange,
  showStudentSelector = false,
  showTeacherSelector = false,
  students = []
}) => {
  const handleDateRangeChange = (range: DateRange | undefined) => {
    onFiltersChange({
      ...filters,
      dateRange: range,
    });
  };

  const handleStudentChange = (studentId: string | undefined) => {
    onFiltersChange({
      ...filters,
      selectedStudentId: studentId,
    });
  };

  const handleTeacherChange = (teacherId: string | undefined) => {
    onFiltersChange({
      ...filters,
      selectedTeacherId: teacherId,
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
                  selectedStudentId={filters.selectedStudentId}
                  onStudentChange={handleStudentChange}
                />
              </div>
            )}

            {showTeacherSelector && (
              <div>
                <TeacherSelector
                  schoolId={filters.schoolId || ""}
                  selectedTeacherId={filters.selectedTeacherId}
                  onTeacherChange={handleTeacherChange}
                />
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
