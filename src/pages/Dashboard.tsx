
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { MessageSquare, FileText, BarChart3, Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import Footer from "@/components/layout/Footer";
import { toast } from "sonner";

const Dashboard = () => {
  const { user, profile, userRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Enhanced debug logs to help understand what's happening
  useEffect(() => {
    console.log("Dashboard: User data:", { 
      userId: user?.id,
      email: user?.email,
      role: userRole,
      profileData: profile,
      locationState: location.state
    });
    
    // Set a maximum loading time to prevent infinite loading state
    const loadingTimeout = setTimeout(() => {
      if (isLoading) {
        console.log("Dashboard: Loading timeout reached, continuing anyway");
        setIsLoading(false);
      }
    }, 3000); // 3 seconds max loading time
    
    return () => clearTimeout(loadingTimeout);
  }, [user, profile, userRole, location.state, isLoading]);

  // Handle redirections with improved error handling
  useEffect(() => {
    try {
      setIsLoading(true);
      
      if (!user) {
        // Allow test accounts/navigation with preserved context to bypass this check
        if (location.state?.fromTestAccounts || location.state?.preserveContext) {
          console.log("Dashboard: Bypassing login check due to navigation context");
          setIsLoading(false);
          return;
        }
        
        console.log("Dashboard: No user found, redirecting to login");
        navigate("/login");
        return;
      }

      console.log("Dashboard: User role detected:", userRole);

      // Handle redirection logic with improved handling for school admin roles
      if (userRole === "school" || userRole === "school_admin") {
        console.log("Dashboard: School admin detected, redirecting to admin dashboard");
        navigate("/admin", { 
          state: { fromNavigation: true, preserveContext: true },
          replace: true 
        });
        return;
      }

      if (userRole === "teacher") {
        console.log("Dashboard: Teacher detected, redirecting to teacher analytics");
        navigate("/teacher/analytics", { 
          state: { fromNavigation: true, preserveContext: true },
          replace: true 
        });
        return;
      }

      // Handle test account (might have different role mapping) as a fallback
      const isTestAccount = user.email?.includes(".test@learnable.edu") || 
                          user.id?.startsWith("test-");
                            
      if (isTestAccount) {
        console.log("Dashboard: Test account detected, checking role from user metadata");
        const metadataRole = user.user_metadata?.user_type;
        
        if (metadataRole === "school" || metadataRole === "school_admin") {
          console.log("Dashboard: Test school admin detected from metadata, redirecting");
          navigate("/admin", { 
            state: { fromTestAccounts: true, preserveContext: true },
            replace: true 
          });
          return;
        } else if (metadataRole === "teacher") {
          console.log("Dashboard: Test teacher detected from metadata, redirecting");
          navigate("/teacher/analytics", { 
            state: { fromTestAccounts: true, preserveContext: true },
            replace: true 
          });
          return;
        }
      }

      console.log("Dashboard: User remaining on student dashboard");
      setIsLoading(false);
    } catch (error) {
      console.error("Dashboard: Error during redirection:", error);
      setHasError(true);
      setIsLoading(false);
      toast.error("Something went wrong. Please try refreshing the page.", {
        duration: 5000,
      });
    }
  }, [user, navigate, location.state, userRole]);

  // If there are issues with profile loading, show a more helpful message
  useEffect(() => {
    if (user && !profile && !location.state?.fromTestAccounts) {
      console.log("Dashboard: User exists but no profile data");
      toast.error("Unable to load your profile. Please try refreshing the page.", {
        duration: 5000,
      });
    }
  }, [user, profile, location.state]);

  // Show error state if something went wrong
  if (hasError) {
    return (
      <>
        <Navbar />
        <main className="container mx-auto px-4 py-8 min-h-screen flex flex-col items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-4">Something went wrong</h2>
            <p className="mb-6">We had trouble loading your dashboard. Please try again.</p>
            <Button 
              onClick={() => window.location.reload()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Refresh Page
            </Button>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  // Show loading state if user or profile data is not ready
  if (isLoading) {
    return (
      <>
        <Navbar />
        <main className="container mx-auto px-4 py-8 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-xl mb-4">Loading your dashboard...</p>
            <div className="w-16 h-1 bg-blue-600 animate-pulse mx-auto"></div>
          </div>
        </main>
      </>
    );
  }

  // This is now primarily for student users
  return (
    <>
      <Navbar />
      <main className="container mx-auto px-4 py-8 min-h-screen">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome, {profile?.full_name || "User"}</h1>
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
            onClick={() => navigate("/chat", { state: { fromNavigation: true, preserveContext: true } })}
          />
          
          <DashboardCard
            title="Assessments"
            description="View and complete your assigned assessments"
            icon={<FileText className="h-10 w-10" />}
            buttonText="Go to Assessments"
            onClick={() => navigate("/student/assessments", { state: { fromNavigation: true, preserveContext: true } })}
          />
          
          <DashboardCard
            title="My Progress"
            description="Track your performance and learning progress"
            icon={<BarChart3 className="h-10 w-10" />}
            buttonText="Go to My Progress"
            onClick={() => navigate("/student/progress", { state: { fromNavigation: true, preserveContext: true } })}
          />
          
          <DashboardCard
            title="Settings"
            description="Manage your profile and preferences"
            icon={<Settings className="h-10 w-10" />}
            buttonText="Go to Settings"
            onClick={() => navigate("/student/settings", { state: { fromNavigation: true, preserveContext: true } })}
          />
        </div>
      </main>
      <Footer />
    </>
  );
};

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
