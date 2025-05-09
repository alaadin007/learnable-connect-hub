
import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { persistUserRoleToDatabase } from "@/utils/apiHelpers"; 
import { toast } from "sonner";

const TestAccounts = () => {
  const { setTestUser } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState<string | null>(null);

  // Helper to use test accounts with proper database persistence
  const handleUseTestAccount = useCallback(async (accountType: "school" | "teacher" | "student") => {
    try {
      setIsLoading(accountType);
      
      // First set the test user in auth context
      await setTestUser(accountType);
      
      // Store in sessionStorage for recovery during page reloads
      sessionStorage.setItem('testAccountType', accountType);
      
      // Determine test user ID and school ID based on account type
      const userId = accountType === 'school' 
        ? 'test-school-admin' 
        : accountType === 'teacher' 
          ? 'test-teacher' 
          : 'test-student';
          
      const schoolId = 'test-school-id';
      
      // Persist the role to database for proper functioning
      await persistUserRoleToDatabase(userId, accountType, schoolId);
      
      // Success message
      toast.success(`Logged in as ${accountType}`);
      
      // Navigate to the appropriate dashboard based on the account type
      if (accountType === "school") {
        navigate("/admin", { state: { fromTestAccounts: true, preserveContext: true } });
      } else if (accountType === "teacher") {
        navigate("/teacher/analytics", { state: { fromTestAccounts: true, preserveContext: true } });
      } else {
        navigate("/dashboard", { state: { fromTestAccounts: true, preserveContext: true } });
      }
    } catch (error) {
      console.error(`Error setting up test ${accountType} account:`, error);
      toast.error(`Failed to set up test ${accountType} account`);
    } finally {
      setIsLoading(null);
    }
  }, [navigate, setTestUser]);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
      <div className="max-w-3xl w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Test Accounts</h1>
          <p className="text-gray-600">
            Use these test accounts to explore different user experiences without creating a real account.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* School Admin Card */}
          <Card>
            <CardHeader className="bg-blue-50 border-b">
              <CardTitle>School Admin</CardTitle>
              <CardDescription>
                Manage school, teachers and students
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <ul className="list-disc list-inside space-y-2 mb-6 text-sm text-gray-700">
                <li>View analytics dashboard</li>
                <li>Manage teachers</li>
                <li>Configure school settings</li>
                <li>Generate invite codes</li>
              </ul>
              <Button
                className="w-full"
                onClick={() => handleUseTestAccount("school")}
                disabled={!!isLoading}
              >
                {isLoading === "school" ? "Loading..." : "Use School Admin Account"}
              </Button>
            </CardContent>
          </Card>

          {/* Teacher Card */}
          <Card>
            <CardHeader className="bg-green-50 border-b">
              <CardTitle>Teacher</CardTitle>
              <CardDescription>
                Manage students and assessments
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <ul className="list-disc list-inside space-y-2 mb-6 text-sm text-gray-700">
                <li>View student progress</li>
                <li>Create assessments</li>
                <li>Review student work</li>
                <li>Track performance metrics</li>
              </ul>
              <Button
                className="w-full"
                onClick={() => handleUseTestAccount("teacher")}
                disabled={!!isLoading}
              >
                {isLoading === "teacher" ? "Loading..." : "Use Teacher Account"}
              </Button>
            </CardContent>
          </Card>

          {/* Student Card */}
          <Card>
            <CardHeader className="bg-purple-50 border-b">
              <CardTitle>Student</CardTitle>
              <CardDescription>
                Learn and complete assignments
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <ul className="list-disc list-inside space-y-2 mb-6 text-sm text-gray-700">
                <li>Chat with AI assistant</li>
                <li>Complete assessments</li>
                <li>Track learning progress</li>
                <li>Access study materials</li>
              </ul>
              <Button
                className="w-full"
                onClick={() => handleUseTestAccount("student")}
                disabled={!!isLoading}
              >
                {isLoading === "student" ? "Loading..." : "Use Student Account"}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-center mt-8">
          <Button
            variant="outline"
            onClick={() => navigate("/")}
          >
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TestAccounts;
