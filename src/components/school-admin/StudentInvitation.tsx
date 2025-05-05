
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Copy, UserPlus, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { generateStudentInviteCode } from '@/utils/schoolUtils';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface StudentInvitationProps {
  onSuccess?: () => void;
}

export const StudentInvitation = ({ onSuccess }: StudentInvitationProps) => {
  const [generatedCode, setGeneratedCode] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { schoolId, user, isTestUser } = useAuth();
  const [isDirectFetchNeeded, setIsDirectFetchNeeded] = useState(false);
  const [directSchoolId, setDirectSchoolId] = useState<string | null>(null);

  useEffect(() => {
    // For test accounts or if schoolId is not available, we'll fetch directly
    const checkAndFetchSchoolId = async () => {
      if ((!schoolId && user) || isTestUser) {
        setIsDirectFetchNeeded(true);
        
        try {
          let fetchedSchoolId = null;
          
          // Try to get user profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('user_type')
            .eq('id', user.id)
            .single();
            
          if (profile) {
            if (profile.user_type === 'school' || profile.user_type === 'teacher') {
              // For teachers/school admins, get from teachers table
              const { data: teacher } = await supabase
                .from('teachers')
                .select('school_id')
                .eq('id', user.id)
                .single();
                
              if (teacher?.school_id) {
                fetchedSchoolId = teacher.school_id;
              }
            } else if (profile.user_type === 'student') {
              // For students, get from students table
              const { data: student } = await supabase
                .from('students')
                .select('school_id')
                .eq('id', user.id)
                .single();
                
              if (student?.school_id) {
                fetchedSchoolId = student.school_id;
              }
            }
          }
          
          // If we found a school ID, store it
          if (fetchedSchoolId) {
            setDirectSchoolId(fetchedSchoolId);
            console.log("Direct school ID fetch successful:", fetchedSchoolId);
          }
        } catch (err) {
          console.error("Error fetching school ID directly:", err);
        }
      }
    };
    
    checkAndFetchSchoolId();
  }, [schoolId, user, isTestUser]);

  const generateInviteCode = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Use either the context schoolId or the directly fetched one
      const effectiveSchoolId = schoolId || directSchoolId;
      
      if (!effectiveSchoolId) {
        throw new Error("Could not determine school ID");
      }
      
      // For test accounts, try to use the database function directly
      if (isTestUser) {
        try {
          console.log("Using direct database call for test account");
          const { data: inviteData, error: directError } = await supabase
            .rpc('create_student_invitation', {
              school_id_param: effectiveSchoolId
            });
          
          if (directError) throw directError;
          
          if (inviteData && inviteData.length > 0) {
            setGeneratedCode(inviteData[0].code);
            toast.success("Student invitation code generated successfully");
            
            if (onSuccess) {
              onSuccess();
            }
            return;
          }
        } catch (directErr) {
          console.error("Direct DB call failed, falling back to normal method:", directErr);
          // Fall through to regular method
        }
      }
      
      // Use the updated function that calls the database function directly
      const { code, error } = await generateStudentInviteCode();
      
      if (error) {
        setError(error);
        toast.error("Failed to generate code: " + error);
        return;
      }
      
      if (code) {
        setGeneratedCode(code);
        toast.success("Student invitation code generated successfully");
        
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (err: any) {
      console.error("Error generating code:", err);
      setError(err.message || "Failed to generate invitation code");
      toast.error("Error generating code: " + (err.message || "Unknown error"));
    } finally {
      setIsLoading(false);
    }
  };

  const copyInviteCode = () => {
    if (!generatedCode) return;
    
    navigator.clipboard.writeText(generatedCode);
    toast.success("Code copied to clipboard!");
  };
  
  const handleRetryFetchingSchoolId = async () => {
    setError(null);
    try {
      if (!user) {
        throw new Error("User not authenticated");
      }
      
      // Force fetch school ID again using a direct DB call
      const userId = user.id;
      let fetchedSchoolId = null;
      
      // Get user type first
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_type, school_code')
        .eq('id', userId)
        .single();
        
      if (!profile) {
        throw new Error("User profile not found");
      }
      
      if (profile.user_type === 'school' || profile.user_type === 'teacher') {
        // Try teachers table
        const { data: teacher } = await supabase
          .from('teachers')
          .select('school_id')
          .eq('id', userId)
          .single();
          
        if (teacher?.school_id) {
          fetchedSchoolId = teacher.school_id;
        }
      } else if (profile.user_type === 'student') {
        // Try students table
        const { data: student } = await supabase
          .from('students')
          .select('school_id')
          .eq('id', userId)
          .single();
          
        if (student?.school_id) {
          fetchedSchoolId = student.school_id;
        }
      }
      
      // If still no school ID but we have a school code, try to find by code
      if (!fetchedSchoolId && profile.school_code) {
        const { data: school } = await supabase
          .from('schools')
          .select('id')
          .eq('code', profile.school_code)
          .single();
          
        if (school?.id) {
          fetchedSchoolId = school.id;
        }
      }
      
      if (fetchedSchoolId) {
        setDirectSchoolId(fetchedSchoolId);
        toast.success("School information retrieved successfully");
      } else {
        throw new Error("Could not determine school ID");
      }
    } catch (err: any) {
      console.error("Error fetching school ID:", err);
      setError(err.message || "Failed to retrieve school information");
      toast.error("Error: " + (err.message || "Failed to retrieve school information"));
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-4 bg-muted rounded-lg">
        {generatedCode ? (
          <>
            <p className="font-semibold mb-2">Invitation Code:</p>
            <div className="flex items-center gap-2">
              <code className="bg-background p-2 rounded border flex-1 text-center text-lg font-mono">
                {generatedCode}
              </code>
              <Button variant="outline" size="sm" onClick={copyInviteCode}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Share this code with students to join your school
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground mb-2">
            Generate a code to invite students to your school
          </p>
        )}
        
        {error && (
          <div className="mt-4 flex flex-col gap-2">
            <div className="text-sm text-red-500 bg-red-50 border border-red-200 p-3 rounded">
              <p className="font-semibold">Error:</p> 
              <p>{error}</p>
            </div>
            
            {(!schoolId && !directSchoolId) && (
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full mt-2"
                onClick={handleRetryFetchingSchoolId}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry Fetching School Information
              </Button>
            )}
          </div>
        )}
        
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full mt-4"
          onClick={generateInviteCode}
          disabled={isLoading || (!schoolId && !directSchoolId)}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <UserPlus className="mr-2 h-4 w-4" />
              Generate New Code
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default StudentInvitation;
