
import React, { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface TeacherSelectorProps {
  schoolId: string;
  selectedTeacherId?: string;
  onTeacherChange: (teacherId: string | undefined) => void;
}

interface Teacher {
  id: string;
  name: string;
}

export function TeacherSelector({ 
  schoolId, 
  selectedTeacherId,
  onTeacherChange 
}: TeacherSelectorProps) {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchTeachers = async () => {
      if (!schoolId) return;
      
      setIsLoading(true);
      try {
        // First get all teachers for this school
        const { data: teachersData, error } = await supabase
          .from('teachers')
          .select('id')
          .eq('school_id', schoolId);
          
        if (error) throw error;
        
        if (teachersData && teachersData.length > 0) {
          // Get their profiles
          const teacherIds = teachersData.map(t => t.id);
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', teacherIds);
            
          if (profilesError) throw profilesError;
          
          const formattedTeachers: Teacher[] = profilesData?.map(profile => ({
            id: profile.id,
            name: profile.full_name || 'Unknown Teacher'
          })) || [];
          
          setTeachers(formattedTeachers);
        }
      } catch (error) {
        console.error("Error fetching teachers:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTeachers();
  }, [schoolId]);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Filter by Teacher:</label>
      <Select
        value={selectedTeacherId || "all"}
        onValueChange={(value) => onTeacherChange(value === "all" ? undefined : value)}
        disabled={isLoading || teachers.length === 0}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select teacher..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Teachers</SelectItem>
          {isLoading ? (
            <div className="flex items-center justify-center py-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-2" />
              <span className="text-sm text-muted-foreground">Loading...</span>
            </div>
          ) : (
            teachers.map((teacher) => (
              <SelectItem key={teacher.id} value={teacher.id}>
                {teacher.name}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
