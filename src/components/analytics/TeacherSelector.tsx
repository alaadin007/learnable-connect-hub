
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
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { retryWithBackoff, isNetworkError } from "@/utils/networkHelpers";

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
  onTeacherChange,
}: TeacherSelectorProps) {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const { user } = useAuth(); // Change from session to user

  useEffect(() => {
    const fetchTeachers = async () => {
      if (!schoolId) {
        setTeachers([]);
        return;
      }

      setIsLoading(true);
      try {
        // Call the get_teachers_for_school function (now with SECURITY DEFINER)
        const { data, error } = await supabase.rpc('get_teachers_for_school', {
          school_id_param: schoolId
        });

        if (error) {
          console.error("Error fetching teachers:", error);
          throw error;
        }

        if (Array.isArray(data)) {
          const formattedTeachers: Teacher[] = data.map((teacher) => ({
            id: teacher.id,
            name: teacher.full_name || "Unknown Teacher",
          }));

          setTeachers(formattedTeachers);
        } else {
          console.log("TeacherSelector: Unexpected response format", data);
          setTeachers([]);
        }
      } catch (error: any) {
        console.error("Error in TeacherSelector:", error);
        
        // If it's a network error, we handle it differently
        if (isNetworkError(error)) {
          toast.error("Network connection issue", { 
            description: "Please check your internet connection" 
          });
          
          // Retry logic for network errors (max 3 times)
          if (retryCount < 3) {
            const timer = setTimeout(() => {
              setRetryCount(prev => prev + 1);
            }, 2000); // Retry after 2 seconds
            
            return () => clearTimeout(timer);
          }
        } else if (error.message?.includes("Authentication") || error.message?.includes("Authorization")) {
          toast.error("Please log in to view teachers");
        } else {
          toast.error("Failed to load teachers");
        }
        
        setTeachers([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTeachers();
  }, [schoolId, user, retryCount]);

  const labelId = "teacher-selector-label";

  return (
    <div className="space-y-2">
      <label id={labelId} className="text-sm font-medium">
        Filter by Teacher:
      </label>
      <Select
        value={selectedTeacherId ?? "all"}
        onValueChange={(value) =>
          onTeacherChange(value === "all" ? undefined : value)
        }
        disabled={isLoading}
        aria-labelledby={labelId}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select teacher..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Teachers</SelectItem>

          {isLoading ? (
            <SelectItem disabled value="loading" className="cursor-default">
              <div className="flex items-center justify-center space-x-2 py-1">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Loading...</span>
              </div>
            </SelectItem>
          ) : retryCount > 0 && teachers.length === 0 ? (
            <SelectItem disabled value="retrying" className="cursor-default">
              <div className="flex items-center justify-center space-x-2 py-1">
                <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
                <span className="text-sm text-muted-foreground">Retrying... ({retryCount}/3)</span>
              </div>
            </SelectItem>
          ) : teachers.length === 0 ? (
            <SelectItem disabled value="none" className="cursor-default">
              No teachers found
            </SelectItem>
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
