
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/landing/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, BarChart2, Users, BookOpen } from "lucide-react";

type UserRole = 'school' | 'teacher' | 'student';

interface MenuItem {
  title: string;
  description: string;
  link: string;
  icon: React.ReactNode;
}

const Dashboard = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // If user is not logged in, redirect to login page
    if (!user && !isLoading) {
      navigate("/login");
    }
    
    // Set loading to false once we've checked auth state
    setIsLoading(false);
  }, [user, navigate, isLoading]);
  
  if (isLoading) {
    return <div>Loading...</div>;
  }
  
  // Function to determine user role and appropriate links
  const getRoleBasedLinks = () => {
    if (!profile) return [];
    
    const userType = profile.user_type as string;
    
    if (userType === 'school' || userType === 'school_admin') {
      return [
        { 
          title: "School Management", 
          description: "Manage your school settings and configuration", 
          link: "/admin", 
          icon: <Users className="h-6 w-6" /> 
        },
        { 
          title: "Teacher Management", 
          description: "Add, remove, and manage teachers in your school", 
          link: "/admin/teacher-management", 
          icon: <Users className="h-6 w-6" /> 
        },
        { 
          title: "Analytics Dashboard", 
          description: "View detailed analytics about your school", 
          link: "/admin/analytics", 
          icon: <BarChart2 className="h-6 w-6" /> 
        }
      ];
    } else if (userType === 'teacher') {
      return [
        { 
          title: "Student Management", 
          description: "Manage your students and their access", 
          link: "/teacher/students", 
          icon: <Users className="h-6 w-6" /> 
        },
        { 
          title: "Analytics Dashboard", 
          description: "View analytics about your students' learning", 
          link: "/teacher/analytics", 
          icon: <BarChart2 className="h-6 w-6" /> 
        }
      ];
    } else if (userType === 'student') {
      return [
        { 
          title: "Chat with AI", 
          description: "Get AI-powered help with your studies", 
          link: "/chat", 
          icon: <MessageSquare className="h-6 w-6" /> 
        },
        { 
          title: "Study Materials", 
          description: "Access your learning resources", 
          link: "/materials", 
          icon: <BookOpen className="h-6 w-6" /> 
        }
      ];
    }
    return [];
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow bg-learnable-super-light py-8">
        <div className="container mx-auto px-4">
          <div className="mb-6">
            <h1 className="text-3xl font-bold gradient-text mb-2">Welcome, {profile?.full_name || user?.email}</h1>
            <p className="text-learnable-gray">
              {profile?.user_type === 'school' || profile?.user_type === 'school_admin' ? 'School Admin Dashboard' : 
               profile?.user_type === 'teacher' ? 'Teacher Dashboard' : 
               'Student Dashboard'}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* User Info Card */}
            <Card>
              <CardHeader>
                <CardTitle>Your Information</CardTitle>
                <CardDescription>Your account details</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">Email</span>
                    <span>{user?.email}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">Name</span>
                    <span>{profile?.full_name || 'Not set'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">Role</span>
                    <span className="capitalize">{profile?.user_type?.replace('_', ' ') || 'Not set'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">School</span>
                    <span>{profile?.school_name || 'Not associated with a school'}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" onClick={signOut}>Sign Out</Button>
              </CardFooter>
            </Card>
            
            {/* Role-based cards */}
            {getRoleBasedLinks().map((item, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{item.title}</CardTitle>
                    <div className="p-2 bg-primary/10 rounded-full">
                      {item.icon}
                    </div>
                  </div>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Click below to access this feature
                  </p>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full">
                    <Link to={item.link}>Go to {item.title}</Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Dashboard;
