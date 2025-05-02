
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  const { signIn, setTestUser } = useAuth();
  const [loadingAccount, setLoadingAccount] = useState<AccountType | null>(null);

  const createTestAccounts = async () => {
    try {
      toast.loading("Checking test accounts status...");
      
      // Use the verify_school_code RPC function which returns boolean
      const { data: exists, error: verifyError } = await supabase.rpc('verify_school_code', { 
        code: "TESTCODE"
      });
      
      // Check if there was an error or the code doesn't exist
      if (verifyError || !exists) {
        // If not, invoke the edge function to create them
        toast.loading("Creating test accounts... (this may take a moment)");
        
        const response = await supabase.functions.invoke("create-test-accounts", {
          body: { createAccounts: true }
        });
        
        if (response.error) {
          toast.error("Failed to create test accounts");
          console.error("Error creating test accounts:", response.error);
          return false;
        }
        
        toast.success("Test accounts created successfully!");
        return true;
      }
      
      toast.success("Test accounts are ready to use!");
      return true;
    } catch (error) {
      console.error("Error checking/creating test accounts:", error);
      toast.error("An error occurred while preparing test accounts");
      return false;
    } finally {
      toast.dismiss();
    }
  };

  const handleUseAccount = async (accountType: AccountType) => {
    setLoadingAccount(accountType);
    const account = TEST_ACCOUNTS[accountType];
    
    try {
      // First try to sign in using real credentials
      const response = await signIn(account.email, account.password);
      
      if (response.error) {
        console.error(`Login error for ${accountType} account:`, response.error);
        
        // If real login fails, fall back to test user mode
        await setTestUser(accountType);
        toast.success(`Logged in as ${account.role} (test mode)`);
        navigate(account.redirectPath);
        return;
      }
      
      // If we got here, we successfully signed in with real credentials
      toast.success(`Logged in as ${account.role}`);
      navigate(account.redirectPath);
    } catch (error: any) {
      console.error(`Error signing in as ${accountType}:`, error);
      toast.error(`Login failed: ${error.message || "Unknown error"}`);
    } finally {
      setLoadingAccount(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow bg-gray-50 flex flex-col items-center justify-center py-12">
        <div className="max-w-5xl w-full mx-auto px-4">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-learnable-blue mb-4">Test Accounts</h1>
            <p className="text-gray-600 max-w-2xl mx-auto mb-6">
              Test the application using these pre-configured accounts for different user roles. Each 
              account provides access to a specific part of the platform.
            </p>
            <div className="flex justify-center gap-4 mb-8">
              <Button 
                variant="outline" 
                onClick={() => navigate("/")}
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
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* School Admin Card */}
            <Card className="border shadow-sm">
              <CardContent className="pt-6">
                <h2 className="text-xl font-bold text-center mb-4">School Admin</h2>
                <p className="text-gray-600 text-center text-sm mb-4">
                  Access the school administrator dashboard and manage teachers
                </p>
                <div className="mb-6 space-y-1">
                  <p className="text-sm font-medium">Login credentials</p>
                  <p className="text-xs font-mono bg-gray-50 p-1 rounded">Email: school.test@learnable.edu</p>
                  <p className="text-xs font-mono bg-gray-50 p-1 rounded">Password: school123</p>
                </div>
                <Button 
                  className="w-full bg-learnable-blue hover:bg-learnable-blue/90" 
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
              </CardContent>
            </Card>

            {/* Teacher Card */}
            <Card className="border shadow-sm">
              <CardContent className="pt-6">
                <h2 className="text-xl font-bold text-center mb-4">Teacher</h2>
                <p className="text-gray-600 text-center text-sm mb-4">
                  Access teacher analytics and student management
                </p>
                <div className="mb-6 space-y-1">
                  <p className="text-sm font-medium">Login credentials</p>
                  <p className="text-xs font-mono bg-gray-50 p-1 rounded">Email: teacher.test@learnable.edu</p>
                  <p className="text-xs font-mono bg-gray-50 p-1 rounded">Password: teacher123</p>
                </div>
                <Button 
                  className="w-full bg-learnable-blue hover:bg-learnable-blue/90" 
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
              </CardContent>
            </Card>

            {/* Student Card */}
            <Card className="border shadow-sm">
              <CardContent className="pt-6">
                <h2 className="text-xl font-bold text-center mb-4">Student</h2>
                <p className="text-gray-600 text-center text-sm mb-4">
                  Access student dashboard with learning tools
                </p>
                <div className="mb-6 space-y-1">
                  <p className="text-sm font-medium">Login credentials</p>
                  <p className="text-xs font-mono bg-gray-50 p-1 rounded">Email: student.test@learnable.edu</p>
                  <p className="text-xs font-mono bg-gray-50 p-1 rounded">Password: student123</p>
                </div>
                <Button 
                  className="w-full bg-learnable-blue hover:bg-learnable-blue/90" 
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
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TestAccounts;
