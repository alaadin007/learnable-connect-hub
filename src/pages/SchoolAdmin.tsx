import React, { useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/landing/Footer";
import { useAuth } from "@/contexts/AuthContext";
import TeacherManagement from "@/components/school-admin/TeacherManagement";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { Users, BarChart2, ChevronDown, Settings, User } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Define the basic type for teacher invitations
export type TeacherInvitation = {
  id: string;
  email: string;
  status: "pending" | "accepted" | "rejected";
  school_id: string;
  invitation_token: string;
  created_by: string;
  created_at: string;
  expires_at: string;
};

const SchoolAdmin = () => {
  const { profile, userRole } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("teachers");
  
  // Use optional chaining for organization properties
  const schoolId = profile?.organization?.id || null;
  
  // Verify correct user role
  useEffect(() => {
    if (userRole && userRole !== "school") {
      navigate("/dashboard");
    }
  }, [userRole, navigate]);

  // Show error toast for failed teacher invitations API
  React.useEffect(() => {
    // Check if we're getting the API error shown in the image
    const displayErrorIfNeeded = async () => {
      try {
        // Try to get the user's role from the profiles table
        const { data: existingInvites } = await supabase
          .from("teacher_invitations")
          .select("id")
          .limit(1);
            
        // If no invitations exist, create mock data
        if (!existingInvites || existingInvites.length === 0) {
          const mockInvites = [
            {
              email: "teacher1@example.com",
              status: "pending",
              school_id: schoolId,
              invitation_token: "mock-token-1",
              created_by: profile?.id,
            },
            {
              email: "teacher2@example.com",
              status: "accepted",
              school_id: schoolId,
              invitation_token: "mock-token-2",
              created_by: profile?.id,
            }
          ];
            
          // Insert mock invitations
          await supabase.from("teacher_invitations").insert(mockInvites);
            
          console.log("Created mock teacher invitations");
        }
        
        // For the API error simulation, we'll now use the proper Response type
        const response = await fetch("/api/check-teacher-invitations-status");
        
        if (!response.ok) {
          const errorData = await response.json();
          if (errorData.error) {
            toast.error("Failed to load teacher invitations", {
              id: "teacher-invitations-error" // Add ID to prevent duplicates
            });
          }
        }
      } catch (e) {
        // Silent catch - we don't want to show error toasts about our error checker
        console.log("Error checking teacher invitations status:", e);
      }
    };
    
    // Comment this out for now as we're using mock data instead
    // displayErrorIfNeeded();
  }, [profile, schoolId]);

  // Quick actions dropdown handler with fixed routes
  const handleQuickActionSelect = (action: string) => {
    switch (action) {
      case "manage-teachers":
        navigate("/admin/teacher-management");
        break;
      case "view-analytics":
        navigate("/admin/analytics");
        break;
      case "school-settings":
        setActiveTab("settings");
        break;
      case "student-management":
        setActiveTab("students");
        break;
      default:
        break;
    }
  };

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
                  <span>{profile?.organization?.name || "Not available"}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <span className="font-medium min-w-32">School Code:</span>
                  <span className="font-mono">{profile?.organization?.code || "Not available"}</span>
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    Quick Actions
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-white">
                  <DropdownMenuItem onClick={() => handleQuickActionSelect("manage-teachers")}>
                    <Users className="mr-2 h-4 w-4" />
                    <span>Manage Teachers</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleQuickActionSelect("view-analytics")}>
                    <BarChart2 className="mr-2 h-4 w-4" />
                    <span>View Analytics</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleQuickActionSelect("school-settings")}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>School Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleQuickActionSelect("student-management")}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Student Management</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          <Tabs defaultValue="teachers" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="w-full border-b">
              <TabsTrigger value="teachers" className="flex-1">
                Teachers
              </TabsTrigger>
              <TabsTrigger value="students" className="flex-1">
                Students
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex-1">
                School Settings
              </TabsTrigger>
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
