import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const TEST_ACCOUNTS = {
  school: {
    email: "school.test@learnable.edu",
    password: "school123",
    role: "School Admin",
    description: "Access the school administrator dashboard and manage teachers",
    redirectPath: "/admin",
  },
  teacher: {
    email: "teacher.test@learnable.edu",
    password: "teacher123",
    role: "Teacher",
    description: "Access teacher analytics and student management",
    redirectPath: "/teacher/analytics",
  },
  student: {
    email: "student.test@learnable.edu",
    password: "student123",
    role: "Student",
    description: "Access student dashboard with learning tools",
    redirectPath: "/dashboard",
  }
};

type AccountType = "school" | "teacher" | "student";

const TestAccounts = () => {
  const navigate = useNavigate();
  const { setTestUser } = useAuth();
  const [loadingAccount, setLoadingAccount] = useState<AccountType | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const createTestAccounts = async () => {
    try {
      // Add toast ID to prevent duplicate toasts
      toast.loading("Checking test accounts status...", { 
        id: "test-accounts-status" 
      });
      
      // Use the verify_school_code RPC function which returns boolean
      const { data: exists, error: verifyError } = await supabase.rpc('verify_school_code', { 
        code: "TESTCODE"
      });
      
      // Check if there was an error or the code doesn't exist
      if (verifyError || !exists) {
        // If not, invoke the edge function to create them
        toast.loading("Creating test accounts... (this may take a moment)", {
          id: "test-accounts-creation"
        });
        
        const response = await supabase.functions.invoke("create-test-accounts", {
          body: { createAccounts: true }
        });
        
        if (response.error) {
          toast.error("Failed to create test accounts", {
            id: "test-accounts-error"
          });
          console.error("Error creating test accounts:", response.error);
          return false;
        }
        
        toast.success("Test accounts created successfully!", {
          id: "test-accounts-success"
        });
        return true;
      }
      
      toast.success("Test accounts are ready to use!", {
        id: "test-accounts-ready"
      });
      return true;
    } catch (error) {
      console.error("Error checking/creating test accounts:", error);
      toast.error("An error occurred while preparing test accounts", {
        id: "test-accounts-general-error"
      });
      return false;
    } finally {
      toast.dismiss("test-accounts-status");
    }
  };

  const handleUseAccount = async (accountType: AccountType) => {
    setErrorMessage(null);
    setLoadingAccount(accountType);
    const account = TEST_ACCOUNTS[accountType];
    
    try {
      // Use test mode directly without trying real authentication
      await setTestUser(accountType);
      toast.success(`Logged in as ${account.role} (test mode)`, {
        id: `login-success-${accountType}`
      });
      navigate(account.redirectPath);
    } catch (error: any) {
      console.error(`Error signing in as ${accountType}:`, error);
      setErrorMessage(`Login failed: ${error.message || "Unknown error"}`);
    } finally {
      setLoadingAccount(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow flex flex-col items-center justify-center py-8 px-4">
        <div className="max-w-4xl w-full mx-auto">
          {errorMessage && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
              <span className="inline-flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {errorMessage}
              </span>
            </div>
          )}
          
          <h1 className="text-3xl font-bold text-center text-learnable-blue mb-2">Test Accounts</h1>
          <p className="text-center text-gray-600 mb-6">
            Test the application using these pre-configured accounts for different user roles. Each 
            account provides access to a specific part of the platform.
          </p>
          
          <div className="flex justify-center space-x-4 mb-6">
            <Button 
              variant="outline" 
              onClick={() => navigate("/")}
              className="border-gray-300"
            >
              Back to Homepage
            </Button>
            <Button 
              variant="default" 
              className="bg-learnable-blue hover:bg-learnable-blue/90"
              onClick={createTestAccounts}
            >
              Refresh Test Accounts
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* School Admin Card */}
            <div className="border rounded shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-2">School Admin</h2>
              <p className="text-gray-600 text-sm mb-4">
                Access the school administrator dashboard and manage teachers
              </p>
              <div className="mb-4">
                <p className="font-medium mb-1 text-sm">Login credentials</p>
                <p className="text-xs font-mono bg-gray-50 p-1 rounded mb-1">Email: school.test@learnable.edu</p>
                <p className="text-xs font-mono bg-gray-50 p-1 rounded">Password: school123</p>
              </div>
              <Button 
                className="w-full bg-blue-700 hover:bg-blue-800" 
                onClick={() => handleUseAccount("school")}
                disabled={loadingAccount !== null}
              >
                {loadingAccount === "school" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  "Login as School Admin"
                )}
              </Button>
            </div>

            {/* Teacher Card */}
            <div className="border rounded shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-2">Teacher</h2>
              <p className="text-gray-600 text-sm mb-4">
                Access teacher analytics and student management
              </p>
              <div className="mb-4">
                <p className="font-medium mb-1 text-sm">Login credentials</p>
                <p className="text-xs font-mono bg-gray-50 p-1 rounded mb-1">Email: teacher.test@learnable.edu</p>
                <p className="text-xs font-mono bg-gray-50 p-1 rounded">Password: teacher123</p>
              </div>
              <Button 
                className="w-full bg-blue-700 hover:bg-blue-800" 
                onClick={() => handleUseAccount("teacher")}
                disabled={loadingAccount !== null}
              >
                {loadingAccount === "teacher" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  "Login as Teacher"
                )}
              </Button>
            </div>

            {/* Student Card */}
            <div className="border rounded shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-2">Student</h2>
              <p className="text-gray-600 text-sm mb-4">
                Access student dashboard with learning tools
              </p>
              <div className="mb-4">
                <p className="font-medium mb-1 text-sm">Login credentials</p>
                <p className="text-xs font-mono bg-gray-50 p-1 rounded mb-1">Email: student.test@learnable.edu</p>
                <p className="text-xs font-mono bg-gray-50 p-1 rounded">Password: student123</p>
              </div>
              <Button 
                className="w-full bg-blue-700 hover:bg-blue-800" 
                onClick={() => handleUseAccount("student")}
                disabled={loadingAccount !== null}
              >
                {loadingAccount === "student" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  "Login as Student"
                )}
              </Button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TestAccounts;
