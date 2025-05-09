
import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/landing/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, UserPlus } from "lucide-react";

const TestAccounts = () => {
  const { setTestUser } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleTestAccountClick = async (email: string) => {
    setIsLoading(true);
    try {
      await setTestUser(email);
      // Navigation will be handled in the setTestUser function
    } catch (error: any) {
      console.error("Error using test account:", error);
      toast.error(error.message || "Failed to use test account");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckTestAccounts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-test-accounts", {
        body: { createAccounts: false }
      });
      
      if (error) {
        console.error("Error checking test accounts:", error);
        toast.error(error.message || "Failed to check test accounts");
        return;
      }
      
      if (data?.recreate) {
        toast.info("Test accounts need to be recreated. Please click on a test account button to create them.");
      } else {
        toast.success("Test accounts are ready to use");
      }
      
      console.log("Check test accounts response:", data);
    } catch (error: any) {
      console.error("Error checking test accounts:", error);
      toast.error(error.message || "Failed to check test accounts");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow bg-learnable-super-light py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4 mb-6">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-1"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
            <h1 className="text-3xl font-bold gradient-text">Test Accounts</h1>
          </div>
          
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Test Accounts</CardTitle>
              <CardDescription>
                For development and testing purposes only. Click on a role to create and log in as a test user.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button 
                    onClick={() => handleTestAccountClick("school.test@learnable.edu")} 
                    disabled={isLoading}
                    className="h-auto py-4 flex flex-col items-center justify-center"
                    variant="outline"
                  >
                    <UserPlus className="h-6 w-6 mb-2" />
                    <span className="text-lg font-semibold">School Admin</span>
                    <span className="text-xs text-gray-500 mt-1">school.test@learnable.edu</span>
                    <span className="text-xs text-gray-500">Password: school123</span>
                  </Button>
                  
                  <Button 
                    onClick={() => handleTestAccountClick("teacher.test@learnable.edu")} 
                    disabled={isLoading}
                    className="h-auto py-4 flex flex-col items-center justify-center"
                    variant="outline"
                  >
                    <UserPlus className="h-6 w-6 mb-2" />
                    <span className="text-lg font-semibold">Teacher</span>
                    <span className="text-xs text-gray-500 mt-1">teacher.test@learnable.edu</span>
                    <span className="text-xs text-gray-500">Password: teacher123</span>
                  </Button>
                  
                  <Button 
                    onClick={() => handleTestAccountClick("student.test@learnable.edu")} 
                    disabled={isLoading}
                    className="h-auto py-4 flex flex-col items-center justify-center"
                    variant="outline"
                  >
                    <UserPlus className="h-6 w-6 mb-2" />
                    <span className="text-lg font-semibold">Student</span>
                    <span className="text-xs text-gray-500 mt-1">student.test@learnable.edu</span>
                    <span className="text-xs text-gray-500">Password: student123</span>
                  </Button>
                </div>

                <div className="pt-4 border-t">
                  <Button 
                    onClick={handleCheckTestAccounts} 
                    variant="secondary"
                    disabled={isLoading}
                    className="w-full"
                  >
                    {isLoading ? "Checking..." : "Check Test Accounts Status"}
                  </Button>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                  <h3 className="font-medium mb-2">Important Notes:</h3>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
                    <li>These accounts are for demonstration and testing only.</li>
                    <li>All test accounts belong to the same test school for easy testing.</li>
                    <li>Each account type has different permissions and views.</li>
                    <li>Test accounts are recreated each time you click on them.</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TestAccounts;
