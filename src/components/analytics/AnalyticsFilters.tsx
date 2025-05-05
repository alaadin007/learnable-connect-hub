
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { DateRangePicker } from "./DateRangePicker";
import { AnalyticsFilters as FiltersType } from "./types";
import { StudentSelector } from "./StudentSelector";
import { TeacherSelector } from "./TeacherSelector";
import { Student, Teacher } from "./types";

interface AnalyticsFiltersProps {
  filters: FiltersType;
  onFiltersChange: (filters: FiltersType) => void;
  showStudentSelector?: boolean;
  showTeacherSelector?: boolean;
  students?: Student[];
  teachers?: Teacher[];
}

export function AnalyticsFilters({
  filters,
  onFiltersChange,
  showStudentSelector = false,
  showTeacherSelector = false,
  students = [],
  teachers = []
}: AnalyticsFiltersProps) {
  const handleDateRangeChange = (dateRange) => {
    onFiltersChange({
      ...filters,
      dateRange
    });
  };

  const handleStudentChange = (studentId) => {
    onFiltersChange({
      ...filters,
      studentId
    });
  };

  const handleTeacherChange = (teacherId) => {
    onFiltersChange({
      ...filters,
      teacherId
    });
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <DateRangePicker
            dateRange={filters.dateRange}
            onChange={handleDateRangeChange}
          />

          {showStudentSelector && (
            <StudentSelector
              students={students}
              selectedStudent={filters.studentId}
              onStudentChange={handleStudentChange}
            />
          )}

          {showTeacherSelector && (
            <TeacherSelector
              teachers={teachers}
              selectedTeacher={filters.teacherId}
              onTeacherChange={handleTeacherChange}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
