
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const TestAccounts = () => {
  const [isLoading, setIsLoading] = useState<"school" | "teacher" | "student" | null>(null);
  const navigate = useNavigate();
  const { setTestUser } = useAuth();
  
  const handleCreateTestAccount = async (role: "school" | "teacher" | "student") => {
    setIsLoading(role);
    try {
      const success = await setTestUser(role);
      
      if (success) {
        // Store in localStorage for fast checks in protected routes
        localStorage.setItem('usingTestAccount', 'true');
        localStorage.setItem('testAccountType', role);
        
        // Store roles in localStorage for RBAC to use
        if (role === 'school') {
          localStorage.setItem('testAccountRoles', JSON.stringify(['school_admin']));
        } else if (role === 'teacher') {
          localStorage.setItem('testAccountRoles', JSON.stringify(['teacher']));
        } else {
          localStorage.setItem('testAccountRoles', JSON.stringify(['student']));
        }
        
        toast.success(`${role.charAt(0).toUpperCase() + role.slice(1)} test account created successfully!`);
        
        // Redirect based on role with navigation state
        const navState = { 
          fromTestAccounts: true,
          accountType: role
        };
        
        if (role === 'school') {
          navigate('/admin', { state: navState });
        } else if (role === 'teacher') {
          navigate('/teacher/analytics', { state: navState });
        } else {
          navigate('/dashboard', { state: navState });
        }
      } else {
        toast.error(`Failed to create ${role} test account`);
      }
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsLoading(null);
    }
  };
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-learnable-super-light py-12">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold gradient-text mb-2">Test Accounts</h1>
        <p className="text-gray-600">
          Quickly create test accounts for different user roles to explore the application.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>School Admin</CardTitle>
            <CardDescription>Create a test school administrator account.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Use this account to manage schools, teachers, and students.
            </p>
            <Button 
              onClick={() => handleCreateTestAccount("school")}
              disabled={isLoading === "school"}
              className="w-full gradient-bg"
            >
              {isLoading === "school" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create School Admin"
              )}
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Teacher</CardTitle>
            <CardDescription>Create a test teacher account.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Use this account to manage students and track their progress.
            </p>
            <Button 
              onClick={() => handleCreateTestAccount("teacher")}
              disabled={isLoading === "teacher"}
              className="w-full gradient-bg"
            >
              {isLoading === "teacher" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Teacher"
              )}
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Student</CardTitle>
            <CardDescription>Create a test student account.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Use this account to access assessments and track your learning progress.
            </p>
            <Button 
              onClick={() => handleCreateTestAccount("student")}
              disabled={isLoading === "student"}
              className="w-full gradient-bg"
            >
              {isLoading === "student" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Student"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TestAccounts;
