import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { SchoolIcon, BookOpen, GraduationCap, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const TEST_ACCOUNTS = {
  school: {
    email: "school.test@learnable.edu",
    password: "school123",
    role: "School Admin",
    description: "Access the school administrator dashboard and manage teachers",
    redirectPath: "/admin",
    icon: SchoolIcon
  },
  teacher: {
    email: "teacher.test@learnable.edu",
    password: "teacher123",
    role: "Teacher",
    description: "Access teacher analytics and student management",
    redirectPath: "/teacher/analytics",
    icon: BookOpen
  },
  student: {
    email: "student.test@learnable.edu",
    password: "student123",
    role: "Student",
    description: "Access student dashboard with learning tools",
    redirectPath: "/dashboard",
    icon: GraduationCap
  }
};

type AccountType = "school" | "teacher" | "student";

const TestAccounts = () => {
  const navigate = useNavigate();
  const { signIn, setTestUser, userRole } = useAuth();
  const [loadingAccount, setLoadingAccount] = useState<AccountType | null>(null);

  const createTestAccounts = async () => {
    try {
      toast.loading("Checking test accounts status...");
      
      // Avoid excessive type instantiation by simplifying the query and using type assertion
      const { data: schoolData, error: schoolError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', TEST_ACCOUNTS.school.email)
        .maybeSingle();
        
      if (!schoolData) {
        // If not, invoke the edge function to create them
        toast.loading("Creating test accounts... (this may take a moment)");
        
        const { error } = await supabase.functions.invoke("create-test-accounts", {
          body: { createAccounts: true }
        });
        
        if (error) {
          toast.error("Failed to create test accounts");
          console.error("Error creating test accounts:", error);
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
      // Fix the type error by handling the return type properly
      const result = await signIn(account.email, account.password);
      
      if (!result) {
        // If signIn returns void or undefined/null, we handle accordingly
        console.log("Sign in completed without explicit return value");
        return;
      }
      
      const { data, error } = result;
      
      if (error) {
        console.error(`Login error for ${accountType} account:`, error);
        toast.error(`Could not log in as ${account.role}: ${error.message}`);
        return;
      }
      
      // Mark as test account for UI customization
      setTestUser(accountType);
      
      toast.success(`Logged in as ${account.role}`);
      
      // Redirect to the appropriate path based on role
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
            <h1 className="text-3xl font-bold gradient-text mb-4">Test Accounts</h1>
            <p className="text-gray-600 max-w-2xl mx-auto mb-6">
              Test the application using these pre-configured accounts for different user roles. 
              Each account provides access to a specific part of the platform.
            </p>
            <div className="flex justify-center gap-2 mb-8">
              <Button 
                variant="outline" 
                onClick={() => navigate("/")}
              >
                Back to Homepage
              </Button>
              <Button 
                variant="default" 
                onClick={createTestAccounts}
              >
                Refresh Test Accounts
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.entries(TEST_ACCOUNTS).map(([key, account]) => {
              const accountType = key as AccountType;
              const Icon = account.icon;
              
              return (
                <Card key={key} className="border-t-4 border-t-learnable-purple">
                  <CardHeader>
                    <div className="flex items-center mb-3">
                      <div className="bg-learnable-purple text-white rounded-full p-2 mr-3">
                        <Icon className="h-5 w-5" />
                      </div>
                      <CardTitle>{account.role}</CardTitle>
                    </div>
                    <CardDescription>{account.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <div className="pb-2">
                      <p className="text-gray-500 mb-1">Login credentials</p>
                      <p className="font-mono bg-gray-50 p-1 rounded text-xs">Email: {account.email}</p>
                      <p className="font-mono bg-gray-50 p-1 rounded text-xs">Password: {account.password}</p>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      className="w-full gradient-bg" 
                      onClick={() => handleUseAccount(accountType)}
                      disabled={loadingAccount !== null}
                    >
                      {loadingAccount === accountType ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Logging in...
                        </>
                      ) : (
                        `Login as ${account.role}`
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TestAccounts;
