
import React, { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Loader2, Info, School, Users, GraduationCap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription } from "@/components/ui/alert";

const TEST_ACCOUNTS = {
  school: {
    email: "school.test@learnable.edu",
    password: "test123456",
    role: "School Admin",
    description: "Access the school administrator dashboard and manage teachers",
    features: [
      "School analytics dashboard",
      "Teacher management",
      "Invite new teachers",
      "School-wide statistics",
      "Student performance metrics",
    ],
  },
  teacher: {
    email: "teacher.test@learnable.edu",
    password: "test123456",
    role: "Teacher",
    description: "Access teacher analytics and student management",
    features: [
      "Student management",
      "Class analytics",
      "Assessment creation",
      "Learning materials management",
      "AI chat assistance",
    ],
  },
  student: {
    email: "student.test@learnable.edu",
    password: "test123456",
    role: "Student",
    description: "Access student dashboard with learning tools",
    features: [
      "AI learning assistant",
      "Document management",
      "Assessment submission",
      "Learning materials access",
      "Performance tracking",
    ],
  },
};

type AccountType = "school" | "teacher" | "student";

const TestAccounts = () => {
  const navigate = useNavigate();
  const { setTestUser } = useAuth();
  const [loadingAccount, setLoadingAccount] = useState<AccountType | null>(null);
  const [dataCreationLoading, setDataCreationLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Clear any existing sessions when arriving at the test accounts page
  useEffect(() => {
    const clearPreviousSessions = async () => {
      try {
        await supabase.auth.signOut();
        localStorage.removeItem("testUser");
        localStorage.removeItem("testUserRole");
        localStorage.removeItem("testUserIndex");
        console.log("TestAccounts: Cleared previous sessions on page load");
      } catch (error) {
        console.error("Error clearing sessions:", error);
      }
    };
    
    clearPreviousSessions();
  }, []);

  const createTestAccounts = useCallback(async () => {
    try {
      setDataCreationLoading(true);
      setErrorMessage(null);
      setRefreshing(true);
      toast.loading("Refreshing test accounts...", {
        id: "test-accounts-status",
      });

      // Check if create-test-accounts function exists in Supabase
      const response = await supabase.functions.invoke("create-test-accounts", {
        body: { 
          refresh: true,
          types: ["school", "teacher", "student"] 
        },
      });

      if (response.error) {
        const errorMsg = `Failed to refresh test accounts: ${response.error.message}`;
        toast.error(errorMsg, {
          id: "test-accounts-error",
        });
        console.error("Error creating test accounts:", response.error);
        setErrorMessage(errorMsg);
        return false;
      }

      toast.success("Test accounts refreshed successfully!", {
        id: "test-accounts-success",
      });
      return true;
    } catch (error: any) {
      const errorMsg = `Error refreshing test accounts: ${error.message || "Unknown error"}`;
      console.error(errorMsg, error);
      toast.error(errorMsg, {
        id: "test-accounts-general-error",
      });
      setErrorMessage(errorMsg);
      return false;
    } finally {
      setDataCreationLoading(false);
      setRefreshing(false);
      toast.dismiss("test-accounts-status");
    }
  }, []);

  // Updated for instant login with timeout handling
  const handleUseAccount = useCallback(
    async (accountType: AccountType) => {
      setErrorMessage(null);
      setLoadingAccount(accountType);
      
      try {
        console.log(`TestAccounts: Setting up instant login for ${accountType} test account...`);
        
        // Add timeout to reset loading state if setTestUser takes too long
        const loginTimeout = setTimeout(() => {
          console.warn("Login timeout reached - resetting loading state");
          setLoadingAccount(null);
          toast.error("Login attempt timed out. Please try again.");
        }, 5000);
        
        // Set test user in auth context for instant login
        await setTestUser(accountType);
        
        // Clear timeout if login was successful
        clearTimeout(loginTimeout);
        
        // Navigation is handled in setTestUser for faster experience
      } catch (error: any) {
        console.error(`Error setting up ${accountType} test account:`, error);
        setErrorMessage(`Setup failed: ${error.message || "Unknown error"}`);
        toast.error(`Account setup failed: ${error.message || "Unknown error"}`);
        setLoadingAccount(null);
      }
    },
    [setTestUser]
  );

  const getAccountIcon = (accountType: AccountType) => {
    switch (accountType) {
      case "school":
        return <School className="h-8 w-8 text-blue-600" aria-hidden="true" />;
      case "teacher":
        return <Users className="h-8 w-8 text-green-600" aria-hidden="true" />;
      case "student":
        return <GraduationCap className="h-8 w-8 text-purple-600" aria-hidden="true" />;
    }
  };

  const getButtonLabel = (accountType: AccountType) => {
    switch (accountType) {
      case "school":
        return "Login as School Admin";
      case "teacher": 
        return "Login as Teacher";
      case "student":
        return "Login as Student";
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main
        className="flex-grow flex flex-col items-center justify-center py-8 px-4"
        aria-live="polite"
        aria-busy={dataCreationLoading || loadingAccount !== null}
      >
        <div className="max-w-4xl w-full mx-auto">
          {errorMessage && !refreshing && (
            <div
              className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
              role="alert"
            >
              <span className="inline-flex items-center">
                <svg
                  className="w-5 h-5 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                {errorMessage}
              </span>
            </div>
          )}

          <h1 className="text-3xl font-bold text-center text-learnable-blue mb-2">
            Test Accounts
          </h1>
          <p className="text-center text-gray-600 mb-6">
            Test the application using these pre-configured accounts for different user roles. Each{" "}
            account provides access to a specific part of the platform with fully functional features.
          </p>

          <Alert className="mb-6 bg-amber-50" role="region" aria-label="Test accounts information">
            <Info className="h-4 w-4" aria-hidden="true" />
            <AlertDescription>
              <strong>Instant Login:</strong> Test accounts login instantly with no authentication required - just click to access the platform with your selected role!
            </AlertDescription>
          </Alert>

          <div className="flex justify-center space-x-4 mb-6">
            <Button variant="outline" onClick={() => navigate("/")} className="border-gray-300">
              Back to Homepage
            </Button>
            <Button
              variant="default"
              className="bg-learnable-blue hover:bg-learnable-blue/90"
              onClick={createTestAccounts}
              disabled={dataCreationLoading}
            >
              {dataCreationLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Refreshing Test Data...
                </>
              ) : (
                "Refresh Test Data"
              )}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.entries(TEST_ACCOUNTS).map(([type, account]) => (
              <div
                key={type}
                className="border rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center mb-4">
                  {getAccountIcon(type as AccountType)}
                  <h2 className="text-xl font-semibold ml-3">{account.role}</h2>
                </div>
                <p className="text-gray-600 text-sm mb-4">{account.description}</p>
                <div className="mb-4">
                  <p className="font-medium mb-2 text-sm">Features:</p>
                  <ul className="text-xs space-y-1 mb-4">
                    {account.features.map((feature, index) => (
                      <li key={index} className="flex items-center">
                        <svg
                          className="w-3 h-3 mr-1 text-green-500"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                          aria-hidden="true"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <div className="bg-green-50 p-2 rounded-md">
                    <p className="text-green-700 text-xs font-semibold">
                      Instant access - no authentication required
                    </p>
                  </div>
                </div>
                <Button
                  className="w-full bg-blue-700 hover:bg-blue-800"
                  onClick={() => handleUseAccount(type as AccountType)}
                  disabled={loadingAccount !== null}
                >
                  {loadingAccount === type ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Accessing...
                    </>
                  ) : (
                    getButtonLabel(type as AccountType)
                  )}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TestAccounts;
