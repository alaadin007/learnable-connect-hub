
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { MessageSquare, FileText, BarChart3, Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import Footer from "@/components/layout/Footer";
import { isSchoolAdmin, getUserRoleWithFallback } from "@/utils/apiHelpers";
import { toast } from "sonner";

const Dashboard = () => {
  const { user, profile, userRole } = useAuth();
  const navigate = useNavigate();
  const [isRedirecting, setIsRedirecting] = useState(false);
  
  // Redirect check for admin/teacher users with proper dependency array
  useEffect(() => {
    const checkAndRedirect = () => {
      // Get both context role and fallback role to ensure we catch all cases
      const fallbackRole = getUserRoleWithFallback();
      const effectiveRole = userRole || fallbackRole;
      
      console.log("Dashboard detected user role:", effectiveRole);
      
      // More comprehensive check for school admin roles
      if (isSchoolAdmin(effectiveRole)) {
        console.log(`DASHBOARD REDIRECT: School admin (${effectiveRole}) detected, redirecting to /admin`);
        setIsRedirecting(true);
        
        // Show toast notification
        toast.info("Redirecting to School Admin Dashboard...");
        
        // Use navigate instead of window.location for smoother experience
        navigate("/admin", { state: { preserveContext: true, adminRedirect: true }, replace: true });
        return true;
      } else if (effectiveRole === 'teacher') {
        console.log(`DASHBOARD REDIRECT: Teacher (${effectiveRole}) detected, redirecting to /teacher/students`);
        setIsRedirecting(true);
        
        // Show toast notification
        toast.info("Redirecting to Teacher Dashboard...");
        
        // Redirect to teacher dashboard
        navigate("/teacher/students", { state: { preserveContext: true }, replace: true });
        return true;
      } else {
        console.log(`Dashboard component rendering for student user: ${effectiveRole}`);
        return false;
      }
    };
    
    // Only redirect if we haven't started redirecting yet
    if (!isRedirecting) {
      checkAndRedirect();
    }
  }, [userRole, navigate, isRedirecting]); // Add isRedirecting to dependencies to prevent multiple redirections

  // If we're redirecting or user is a school admin/teacher, show loading state
  if (isRedirecting || isSchoolAdmin(userRole) || isSchoolAdmin(getUserRoleWithFallback()) || userRole === 'teacher') {
    return (
      <div className="h-screen flex flex-col items-center justify-center">
        <p className="text-xl mb-4">Redirecting to appropriate dashboard...</p>
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Standard student dashboard below - always include Navbar
  return (
    <>
      <Navbar />
      <main className="container mx-auto px-4 py-8 min-h-screen">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome, {profile?.full_name || user?.user_metadata?.full_name || "Student"}</h1>
          <p className="text-gray-600">
            Access your learning resources and complete your assessments
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <DashboardCard
            title="Chat with AI"
            description="Get help with your studies from our AI learning assistant"
            icon={<MessageSquare className="h-10 w-10" />}
            buttonText="Go to Chat with AI"
            onClick={() => navigate("/chat", { state: { preserveContext: true } })}
          />
          
          <DashboardCard
            title="Assessments"
            description="View and complete your assigned assessments"
            icon={<FileText className="h-10 w-10" />}
            buttonText="Go to Assessments"
            onClick={() => navigate("/student/assessments", { state: { preserveContext: true } })}
          />
          
          <DashboardCard
            title="My Progress"
            description="Track your performance and learning progress"
            icon={<BarChart3 className="h-10 w-10" />}
            buttonText="Go to My Progress"
            onClick={() => navigate("/student/progress", { state: { preserveContext: true } })}
          />
          
          <DashboardCard
            title="Settings"
            description="Manage your profile and preferences"
            icon={<Settings className="h-10 w-10" />}
            buttonText="Go to Settings"
            onClick={() => navigate("/student/settings", { state: { preserveContext: true } })}
          />
        </div>
      </main>
      <Footer />
    </>
  );
};

// Keep the DashboardCard component
interface DashboardCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  buttonText: string;
  onClick: () => void;
}

const DashboardCard: React.FC<DashboardCardProps> = ({ title, description, icon, buttonText, onClick }) => {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6 pb-6">
        <div className="flex items-start mb-4">
          <div className="text-learnable-blue mr-4">{icon}</div>
          <div>
            <h3 className="text-xl font-semibold mb-2">{title}</h3>
            <p className="text-gray-600 mb-4">{description}</p>
          </div>
        </div>
        <Button 
          onClick={onClick} 
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {buttonText}
        </Button>
      </CardContent>
    </Card>
  );
};

export default Dashboard;
