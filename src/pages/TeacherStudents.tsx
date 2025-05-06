
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import StudentManagement from "@/components/teacher/StudentManagement";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/landing/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getSchoolData } from "@/utils/studentUtils";

const TeacherStudents = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, userRole } = useAuth();
  const [pageInitialized, setPageInitialized] = useState(false);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [schoolInfo, setSchoolInfo] = useState<{name: string; code: string} | null>(null);
  
  // Process location state once on first render
  useEffect(() => {
    if (pageInitialized) return;
    
    console.log("TeacherStudents: Initial render with state:", location.state);
    setPageInitialized(true);
  }, [location.state, pageInitialized]);
  
  // Fetch school ID when component mounts
  useEffect(() => {
    const fetchSchoolId = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        const { data: schoolIdData, error: schoolIdError } = await supabase
          .rpc('get_user_school_id');
        
        if (schoolIdError) {
          console.error('Error fetching school ID:', schoolIdError);
          toast.error('Failed to load school information');
          setIsLoading(false);
          return;
        }
        
        if (schoolIdData) {
          console.log("TeacherStudents: School ID retrieved:", schoolIdData);
          setSchoolId(schoolIdData);
          
          // Fetch school data
          const schoolData = await getSchoolData(schoolIdData);
          if (schoolData) {
            setSchoolInfo(schoolData);
          } else {
            toast.error('Failed to load school details');
          }
        }
      } catch (error) {
        console.error("Error in fetchSchoolId:", error);
        toast.error('Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSchoolId();
  }, [user]);
  
  // Protection against direct access without authentication
  useEffect(() => {
    // Skip authentication check for test accounts with proper navigation context
    if (location.state?.fromTestAccounts || location.state?.fromNavigation) {
      console.log("TeacherStudents: Allowing access due to navigation context");
      return;
    }
    
    if (!user) {
      console.log("TeacherStudents: No user found, redirecting to login");
      navigate("/login", { replace: true });
      return;
    }
    
    // Verify the user is a teacher when directly accessing this page
    // But skip this check if we're coming from a known navigation flow
    if (userRole && 
        userRole !== "teacher" && 
        !location.state?.preserveContext) {
      console.log("TeacherStudents: Redirecting non-teacher user to dashboard");
      navigate("/dashboard", { replace: true });
    }
  }, [user, userRole, navigate, location.state]);
  
  // Handle back navigation with context preservation
  const handleBack = () => {
    if (location.state?.fromTestAccounts || location.state?.fromNavigation) {
      // Preserve context when navigating back
      navigate("/teacher/analytics", { 
        state: { 
          preserveContext: true,
          fromNavigation: location.state?.fromNavigation,
          fromTestAccounts: location.state?.fromTestAccounts,
          accountType: location.state?.accountType
        } 
      });
    } else {
      navigate(-1);
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow bg-learnable-super-light py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4 mb-6">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-1"
              onClick={handleBack}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <h1 className="text-3xl font-bold gradient-text">Student Management</h1>
          </div>
          
          <StudentManagement schoolId={schoolId} isLoading={isLoading} schoolInfo={schoolInfo} />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TeacherStudents;
