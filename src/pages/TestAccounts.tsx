import React, { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import Footer from "@/components/landing/Footer";
import { Link } from "react-router-dom";
import { AlertCircle, ChevronRight, LogOut } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Define pre-configured test accounts
const TEST_ACCOUNTS = {
  school: {
    email: "admin@testschool.edu",
    password: "password123",
    name: "School Admin"
  },
  teacher: {
    email: "teacher@testschool.edu",
    password: "password123",
    name: "Test Teacher"
  },
  student: {
    email: "student@testschool.edu",
    password: "password123",
    name: "Test Student"
  }
};

const TestAccounts = () => {
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({
    school: false,
    teacher: false,
    student: false
  });
  
  // Get auth context
  const auth = useAuth();
  const { signIn, signOut, user, profile } = auth;

  const handleLoginAs = async (type: 'school' | 'teacher' | 'student') => {
    const account = TEST_ACCOUNTS[type];
    setIsLoading(prev => ({ ...prev, [type]: true }));
    
    try {
      await signIn(account.email, account.password);
      toast.success(`Logged in as ${account.name}`);
    } catch (error: any) {
      if (error.message?.includes("Invalid login credentials")) {
        toast.error("Account not initialized yet. Please wait while we set it up...");
        
        // Wait 1 second and try again with a different message to the user
        setTimeout(async () => {
          try {
            // This will auto-create the account as implemented in AuthContext
            await signIn(account.email, account.password);
          } catch (innerError) {
            toast.error(`Error logging in: ${innerError instanceof Error ? innerError.message : "Unknown error"}`);
          } finally {
            setIsLoading(prev => ({ ...prev, [type]: false }));
          }
        }, 1000);
        
        return; // Exit early since we handle the loading state in the timeout
      } else {
        toast.error(`Error logging in: ${error.message || "Unknown error"}`);
      }
    } finally {
      setIsLoading(prev => ({ ...prev, [type]: false }));
    }
  };

  const isLoggedIn = !!user;
  const currentUserType = profile?.user_type;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow bg-learnable-super-light py-10">
        <div className="max-w-4xl mx-auto p-4">
          <Card className="w-full mb-8">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold">Test Accounts</CardTitle>
              <CardDescription>
                Quick access to pre-configured test accounts for different user roles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-blue-800 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-blue-800 font-semibold">
                      Development Mode: Instant Login Enabled
                    </p>
                    <p className="text-sm text-blue-700 mt-1">
                      The application is configured to automatically create and sign in with test accounts
                      using the <strong>@testschool.edu</strong> domain.
                    </p>
                    <p className="text-sm text-blue-700 mt-1">
                      {isLoggedIn
                        ? `Currently logged in as: ${profile?.full_name || user.email} (${currentUserType})`
                        : "Click any account button below to instantly log in"}
                    </p>
                  </div>
                </div>
              </div>

              {isLoggedIn && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-green-800 font-semibold">
                    Currently logged in as: {profile?.full_name || user.email}
                  </p>
                  <p className="text-sm text-green-700 mt-1">
                    User type: {currentUserType}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button 
                      onClick={() => signOut()}
                      variant="outline" 
                      className="border-green-300 text-green-700 hover:bg-green-100"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </Button>
                    <Button 
                      asChild
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Link to="/dashboard">
                        Go to Dashboard
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </Link>
                    </Button>
                  </div>
                </div>
              )}

              <Tabs defaultValue="school" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="school">School Admin</TabsTrigger>
                  <TabsTrigger value="teacher">Teacher</TabsTrigger>
                  <TabsTrigger value="student">Student</TabsTrigger>
                </TabsList>
                
                <TabsContent value="school" className="mt-4 space-y-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">School Administrator</CardTitle>
                      <CardDescription>
                        Access school-wide settings and manage teachers
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2">
                      <div>
                        <span className="font-semibold">Email:</span> {TEST_ACCOUNTS.school.email}
                      </div>
                      <div>
                        <span className="font-semibold">Password:</span> {TEST_ACCOUNTS.school.password}
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button
                        onClick={() => handleLoginAs('school')}
                        className="w-full gradient-bg"
                        disabled={isLoading.school || (isLoggedIn && currentUserType === 'school')}
                      >
                        {isLoading.school ? "Logging in..." : isLoggedIn && currentUserType === 'school' ? "Currently Active" : "Log in as School Admin"}
                      </Button>
                    </CardFooter>
                  </Card>
                </TabsContent>

                <TabsContent value="teacher" className="mt-4 space-y-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Teacher</CardTitle>
                      <CardDescription>
                        Manage student accounts and assignments
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2">
                      <div>
                        <span className="font-semibold">Email:</span> {TEST_ACCOUNTS.teacher.email}
                      </div>
                      <div>
                        <span className="font-semibold">Password:</span> {TEST_ACCOUNTS.teacher.password}
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button
                        onClick={() => handleLoginAs('teacher')}
                        className="w-full gradient-bg"
                        disabled={isLoading.teacher || (isLoggedIn && currentUserType === 'teacher')}
                      >
                        {isLoading.teacher ? "Logging in..." : isLoggedIn && currentUserType === 'teacher' ? "Currently Active" : "Log in as Teacher"}
                      </Button>
                    </CardFooter>
                  </Card>
                </TabsContent>

                <TabsContent value="student" className="mt-4 space-y-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Student</CardTitle>
                      <CardDescription>
                        Access learning materials and submit assignments
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2">
                      <div>
                        <span className="font-semibold">Email:</span> {TEST_ACCOUNTS.student.email}
                      </div>
                      <div>
                        <span className="font-semibold">Password:</span> {TEST_ACCOUNTS.student.password}
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button
                        onClick={() => handleLoginAs('student')}
                        className="w-full gradient-bg"
                        disabled={isLoading.student || (isLoggedIn && currentUserType === 'student')}
                      >
                        {isLoading.student ? "Logging in..." : isLoggedIn && currentUserType === 'student' ? "Currently Active" : "Log in as Student"}
                      </Button>
                    </CardFooter>
                  </Card>
                </TabsContent>
              </Tabs>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <div className="w-full p-4 bg-amber-50 border border-amber-200 rounded-md">
                <h3 className="font-semibold text-amber-800 mb-2">Test Account Information:</h3>
                <ol className="list-decimal list-inside text-amber-700 space-y-1.5">
                  <li>All test accounts are created automatically on first login.</li>
                  <li>The school admin account creates a school code that is shared with teachers and students.</li>
                  <li>Use the buttons above to switch between different user roles.</li>
                  <li>All data created with test accounts is isolated from production data.</li>
                </ol>
              </div>
              <p className="text-sm text-gray-600 text-center w-full">
                Return to{" "}
                <Link to="/login" className="text-learnable-blue hover:underline">
                  regular login
                </Link>{" "}
                for normal accounts
              </p>
            </CardFooter>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TestAccounts;
