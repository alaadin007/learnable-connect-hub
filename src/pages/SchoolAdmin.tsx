
import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, School, BarChart, Settings, FileText } from "lucide-react";

const SchoolAdmin = () => {
  const { user, profile, userRole } = useAuth();
  const navigate = useNavigate();

  if (!user || !profile || userRole !== "school") {
    return (
      <>
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-xl">Access restricted. Please login with a school administrator account.</p>
        </div>
        <Footer />
      </>
    );
  }

  const schoolName = profile.organization?.name || "Your School";

  return (
    <>
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">School Administration</h1>
          <p className="text-gray-600">Manage {schoolName}</p>
        </div>

        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid grid-cols-5 mb-8">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="teachers">Teachers</TabsTrigger>
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="dashboard">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AdminCard 
                title="Teachers" 
                description="Manage teacher accounts"
                icon={<Users className="h-10 w-10" />}
                onClick={() => navigate("/admin/teachers")}
              />
              <AdminCard 
                title="Students" 
                description="View and manage student accounts"
                icon={<Users className="h-10 w-10" />}
                onClick={() => navigate("/admin/students")}
              />
              <AdminCard 
                title="Analytics" 
                description="View school performance metrics"
                icon={<BarChart className="h-10 w-10" />}
                onClick={() => navigate("/admin/analytics")}
              />
              <AdminCard 
                title="Settings" 
                description="Configure school settings"
                icon={<Settings className="h-10 w-10" />}
                onClick={() => navigate("/admin/settings")}
              />
            </div>
          </TabsContent>

          <TabsContent value="teachers">
            <Button 
              onClick={() => navigate("/admin/teacher-management")} 
              className="mb-6"
            >
              Manage Teachers
            </Button>
            <p>Quick access to teacher management functions.</p>
          </TabsContent>

          <TabsContent value="students">
            <Button 
              onClick={() => navigate("/admin/students")} 
              className="mb-6"
            >
              Manage Students
            </Button>
            <p>Quick access to student management functions.</p>
          </TabsContent>

          <TabsContent value="analytics">
            <Button 
              onClick={() => navigate("/admin/analytics")} 
              className="mb-6"
            >
              View Analytics
            </Button>
            <p>Quick access to school analytics dashboard.</p>
          </TabsContent>

          <TabsContent value="settings">
            <Button 
              onClick={() => navigate("/admin/settings")} 
              className="mb-6"
            >
              School Settings
            </Button>
            <p>Configure school settings and preferences.</p>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </>
  );
};

interface AdminCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}

const AdminCard: React.FC<AdminCardProps> = ({ title, description, icon, onClick }) => {
  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={onClick}>
      <CardHeader>
        <CardTitle className="flex items-center">
          <div className="text-primary mr-4">{icon}</div>
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent></CardContent>
      <CardFooter>
        <Button onClick={onClick} className="w-full">Manage {title}</Button>
      </CardFooter>
    </Card>
  );
};

export default SchoolAdmin;
