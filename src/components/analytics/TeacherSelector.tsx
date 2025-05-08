
import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from "@/integrations/supabase/client";
import { asDbId } from '@/utils/supabaseTypeHelpers';

interface Teacher {
  id: string;
  name: string;
}

interface TeacherSelectorProps {
  schoolId: string;
  selectedTeacherId?: string;
  onTeacherChange: (teacherId: string | undefined) => void;
}

export const TeacherSelector = ({ schoolId, selectedTeacherId, onTeacherChange }: TeacherSelectorProps) => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (schoolId) {
      fetchTeachers();
    }
  }, [schoolId]);

  const fetchTeachers = async () => {
    setIsLoading(true);
    try {
      // Use teacher_performance_metrics view instead of querying directly
      const { data, error } = await supabase
        .from('teacher_performance_metrics')
        .select('teacher_id, teacher_name')
        .eq('school_id', asDbId(schoolId));

      if (error) {
        console.error('Error fetching teachers:', error);
      } else if (data) {
        const formattedTeachers: Teacher[] = data.map((teacher: any) => ({
          id: teacher.teacher_id,
          name: teacher.teacher_name || 'Unknown Teacher',
        }));
        setTeachers(formattedTeachers);
      }
    } catch (err) {
      console.error('Failed to fetch teachers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <Select 
        value={selectedTeacherId || ''} 
        onValueChange={(value) => onTeacherChange(value || undefined)}
      >
        <SelectTrigger id="teacher-select" className="w-full">
          <SelectValue placeholder="Select teacher..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All Teachers</SelectItem>
          {teachers.map((teacher) => (
            <SelectItem key={teacher.id} value={teacher.id}>
              {teacher.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

