
import React from "react";
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
  const { userRole } = useAuth();
  
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
