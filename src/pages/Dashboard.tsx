
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { MessageSquare, FileText, BarChart3, Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import Footer from "@/components/layout/Footer";

const Dashboard = () => {
  const { user, profile, userRole } = useAuth();
  const navigate = useNavigate();
  
  // Add redirect for school/school_admin users to the admin dashboard
  useEffect(() => {
    if (userRole === 'school' || userRole === 'school_admin') {
      navigate('/admin', { state: { preserveContext: true }, replace: true });
      return;
    }
  }, [userRole, navigate]);

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
