
import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import StudentManagement from "@/components/teacher/StudentManagement";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/landing/Footer";
import { useAuth } from "@/contexts/AuthContext";

const TeacherStudents = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, userRole } = useAuth();
  
  // Protection against direct access without authentication
  useEffect(() => {
    if (!user) {
      // Allow test accounts to access this page more easily
      if (location.state?.fromTestAccounts || location.state?.fromNavigation) {
        console.log("TeacherStudents: Allowing access due to navigation context");
        return;
      }
      
      console.log("TeacherStudents: No user found, redirecting to login");
      navigate("/login", { replace: true });
      return;
    }
    
    // Verify the user is a teacher when directly accessing this page
    // But skip this check if we're coming from a known navigation flow
    if (userRole && 
        userRole !== "teacher" && 
        !location.state?.preserveContext && 
        !location.state?.fromNavigation && 
        !location.state?.fromTestAccounts) {
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
          
          <StudentManagement />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TeacherStudents;
