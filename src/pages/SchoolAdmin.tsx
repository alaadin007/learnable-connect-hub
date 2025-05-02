
import React from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/landing/Footer";
import { useAuth } from "@/contexts/AuthContext";
import TeacherManagement from "@/components/school-admin/TeacherManagement";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Users, BarChart2 } from "lucide-react";
import { toast } from "sonner";

const SchoolAdmin = () => {
  const { profile } = useAuth();

  // Show error toast for failed teacher invitations API
  React.useEffect(() => {
    // Check if we're getting the API error shown in the image
    const displayErrorIfNeeded = async () => {
      try {
        const { error } = await fetch("/api/check-teacher-invitations-status");
        if (error) {
          toast.error("Failed to load teacher invitations", {
            id: "teacher-invitations-error" // Add ID to prevent duplicates
          });
        }
      } catch (e) {
        // Silent catch - we don't want to show error toasts about our error checker
      }
    };
    
    // Uncomment this to test the actual API integration
    // displayErrorIfNeeded();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow bg-learnable-super-light py-8">
        <div className="container mx-auto px-4">
          <div className="mb-6">
            <h1 className="text-3xl font-bold gradient-text mb-2">School Admin Panel</h1>
            <p className="text-learnable-gray">
              Manage your school settings, teachers, and students
            </p>
          </div>
          
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>School Information</CardTitle>
              <CardDescription>Your school details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <span className="font-medium min-w-32">School Name:</span>
                  <span>{profile?.school_name || "Not available"}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <span className="font-medium min-w-32">School Code:</span>
                  <span className="font-mono">{profile?.school_code || "Not available"}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Your school code is used to invite teachers and students to join your school.
                </p>
              </div>
            </CardContent>
          </Card>
          
          <div className="mb-6 flex flex-wrap gap-3 justify-between items-center">
            <h2 className="text-xl font-semibold">Quick Actions</h2>
            <div className="flex flex-wrap gap-3">
              <Link to="/admin/teacher-management">
                <Button className="gradient-bg">
                  <Users className="mr-2 h-4 w-4" />
                  Manage Teachers
                </Button>
              </Link>
              <Link to="/admin/analytics">
                <Button variant="outline" className="border-learnable-blue text-learnable-blue">
                  <BarChart2 className="mr-2 h-4 w-4" />
                  View Analytics
                </Button>
              </Link>
            </div>
          </div>
          
          <Tabs defaultValue="teachers" className="space-y-4">
            <TabsList>
              <TabsTrigger value="teachers">Teachers</TabsTrigger>
              <TabsTrigger value="students">Students</TabsTrigger>
              <TabsTrigger value="settings">School Settings</TabsTrigger>
            </TabsList>
            
            <TabsContent value="teachers" className="space-y-4">
              <TeacherManagement />
            </TabsContent>
            
            <TabsContent value="students" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Student Management</CardTitle>
                  <CardDescription>Manage students at your school</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Student management feature will be available in a future update.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="settings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>School Settings</CardTitle>
                  <CardDescription>Configure school-wide settings</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    School settings feature will be available in a future update.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SchoolAdmin;
