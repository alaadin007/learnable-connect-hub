
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import StudentManagement from "@/components/teacher/StudentManagement";
import TeacherLayout from "@/components/layout/TeacherLayout";

const TeacherStudents = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Handle back navigation with context preservation
  const handleBack = () => {
    if (location.state?.fromTestAccounts || location.state?.fromNavigation) {
      // Preserve context when navigating back
      navigate("/teacher/dashboard", { 
        state: { 
          preserveContext: true,
          fromNavigation: location.state?.fromNavigation,
          fromTestAccounts: location.state?.fromTestAccounts,
          accountType: location.state?.accountType
        } 
      });
    } else {
      navigate("/teacher/dashboard", { 
        state: { preserveContext: true } 
      });
    }
  };
  
  return (
    <TeacherLayout
      title="Student Management"
      subtitle="Manage your students, view their progress, and handle enrollments"
    >
      <div className="mb-6">
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center gap-1"
          onClick={handleBack}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>
      
      <StudentManagement />
    </TeacherLayout>
  );
};

export default TeacherStudents;
