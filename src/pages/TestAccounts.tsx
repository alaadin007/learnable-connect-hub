import React, { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Info, School, Users, GraduationCap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription } from "@/components/ui/alert";

const TEST_ACCOUNTS = {
  school: {
    email: "school.test@learnable.edu",
    password: "school123",
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
    password: "teacher123",
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
    password: "student123",
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
  const { setTestUser, signOut } = useAuth();
  const [loadingAccount, setLoadingAccount] = useState<AccountType | null>(null);
  const [dataCreationLoading, setDataCreationLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Clear any existing sessions when arriving at the test accounts page
  useEffect(() => {
    const clearPreviousSessions = async () => {
      try {
        console.log("TestAccounts: Beginning session cleanup");
        
        // First clear any auth state in Supabase
        await supabase.auth.signOut();
        
        // Clear any previous test account flags
        localStorage.removeItem('usingTestAccount');
        localStorage.removeItem('testAccountType');
        
        console.log("TestAccounts: Cleared previous sessions on page load");
        
        // Also clear out state in AuthContext
        await signOut();
      } catch (error) {
        console.error("Error clearing sessions:", error);
      }
    };

    clearPreviousSessions();
  }, [signOut]);

  const createTestAccounts = useCallback(async () => {
    try {
      setDataCreationLoading(true);
      toast.loading("Refreshing test accounts...", {
        id: "test-accounts-status",
      });

      // Check if create-test-accounts function is available in Supabase config
      const response = await supabase.functions.invoke("create-test-accounts", {
        body: { createAccounts: true },
      });

      if (response.error) {
        toast.error("Failed to refresh test accounts", {
          id: "test-accounts-status",
        });
        console.error("Error creating test accounts:", response.error);
        return false;
      }

      toast.success("Test accounts refreshed successfully!", {
        id: "test-accounts-status",
      });
      return true;
    } catch (error) {
      console.error("Error refreshing test accounts:", error);
      toast.error("An error occurred while refreshing test accounts", {
        id: "test-accounts-status",
      });
      return false;
    } finally {
      setDataCreationLoading(false);
    }
  }, []);

  const handleUseAccount = useCallback(
    async (accountType: AccountType) => {
      setErrorMessage(null);
      setLoadingAccount(accountType);

      try {
        console.log(`TestAccounts: Logging in as ${accountType} test account...`);

        // First make sure we're logged out and all test flags are cleared
        await supabase.auth.signOut();
        localStorage.removeItem('usingTestAccount');
        localStorage.removeItem('testAccountType');
        
        // Sign out from AuthContext to clear any existing state
        await signOut();

        // Set test user in auth context - this bypasses authentication
        const mockUser = await setTestUser(accountType);
        if (!mockUser) {
          throw new Error(`Failed to set up ${accountType} test account`);
        }

        // Mark in localStorage that we're using a test account
        localStorage.setItem('usingTestAccount', 'true');
        localStorage.setItem('testAccountType', accountType);

        // Define redirect paths based on account type
        let redirectPath = "/dashboard";

        if (accountType === "school") {
          redirectPath = "/admin";
        } else if (accountType === "teacher") {
          redirectPath = "/teacher/analytics";
        }

        toast.success(`Logged in as ${
          accountType === "school" 
            ? "School Admin" 
            : accountType === "teacher" 
            ? "Teacher" 
            : "Student"
        }`);

        console.log(`TestAccounts: Navigating to ${redirectPath} for ${accountType}`);

        // Navigate with important state parameters for persistence
        navigate(redirectPath, {
          replace: true,
          state: { 
            fromTestAccounts: true,
            accountType,
            preserveContext: true,
            timestamp: Date.now()
          }
        });
      } catch (error: any) {
        console.error(`Error setting up ${accountType} test account:`, error);
        setErrorMessage(`Setup failed: ${error.message || "Unknown error"}`);
        toast.error(`Account setup failed: ${error.message || "Unknown error"}`);

        // Clear any partial test account state on error
        localStorage.removeItem('usingTestAccount');
        localStorage.removeItem('testAccountType');
      } finally {
        setLoadingAccount(null);
      }
    },
    [navigate, setTestUser, signOut]
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main
        className="flex-grow flex flex-col items-center justify-center py-8 px-4"
        aria-live="polite"
      >
        <div className="max-w-4xl w-full mx-auto">
          {errorMessage && (
            <div
              className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
              role="alert"
              aria-live="assertive"
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
              Select a test account to instantly access the platform as that role. Only one test account can be active at a time.
            </AlertDescription>
          </Alert>

          <div className="flex justify-center space-x-4 mb-6">
            <Button variant="outline" onClick={() => navigate("/")} className="border-gray-300" disabled={loadingAccount !== null || dataCreationLoading}>
              Back to Homepage
            </Button>
            <Button
              variant="default"
              className="bg-learnable-blue hover:bg-learnable-blue/90"
              onClick={createTestAccounts}
              disabled={dataCreationLoading || loadingAccount !== null}
            >
              {dataCreationLoading ? (
                "Refreshing Test Data..."
              ) : (
                "Refresh Test Data"
              )}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.entries(TEST_ACCOUNTS).map(([type, account]) => {
              const accountType = type as AccountType;
              const isActive = localStorage.getItem('testAccountType') === accountType;

              return (
                <div
                  key={type}
                  className={`border rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow ${
                    isActive ? "ring-2 ring-offset-2 ring-learnable-blue bg-blue-50" : ""
                  }`}
                >
                  <div className="flex items-start mb-4">
                    {accountType === "school" && <School className="h-5 w-5 text-blue-600 mt-1 mr-2" aria-hidden="true" />}
                    {accountType === "teacher" && <Users className="h-5 w-5 text-green-600 mt-1 mr-2" aria-hidden="true" />}
                    {accountType === "student" && <GraduationCap className="h-5 w-5 text-purple-600 mt-1 mr-2" aria-hidden="true" />}
                    <div>
                      <h2 className="text-xl font-semibold">{account.role}</h2>
                      <p className="text-gray-600 text-sm mt-1">{account.description}</p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="font-medium text-sm mb-1">Features:</p>
                    <ul className="space-y-1">
                      {account.features.map((feature, index) => (
                        <li key={index} className="flex items-center text-sm">
                          <svg
                            className="w-3 h-3 mr-2 text-green-500 flex-shrink-0"
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
                  </div>

                  <div className="bg-green-50 p-2 rounded-md mb-4">
                    <p className="text-green-700 text-xs">
                      Direct access - no authentication required
                    </p>
                  </div>

                  <Button
                    className={`w-full ${
                      accountType === "school" 
                        ? "bg-blue-600 hover:bg-blue-700" 
                        : accountType === "teacher" 
                        ? "bg-green-600 hover:bg-green-700" 
                        : "bg-purple-600 hover:bg-purple-700"
                    } text-white`}
                    onClick={() => handleUseAccount(accountType)}
                    disabled={loadingAccount !== null}
                  >
                    {loadingAccount === accountType ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true" >
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Logging in...
                      </span>
                    ) : isActive ? (
                      `Already Active - Continue as ${account.role}`
                    ) : (
                      `Login as ${account.role}`
                    )}
                  </Button>
                </div>
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
