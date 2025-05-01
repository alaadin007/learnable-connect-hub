
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
    name: "School Admin"
  },
  teacher: {
    email: "teacher@testschool.edu",
    name: "Test Teacher"
  },
  student: {
    email: "student@testschool.edu",
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
  const { signOut, user, profile, setTestUser } = auth;

  const handleLoginAs = async (type: 'school' | 'teacher' | 'student') => {
    setIsLoading(prev => ({ ...prev, [type]: true }));
    
    try {
      // Use our new direct login method
      await setTestUser(type);
      toast.success(`Logged in as ${TEST_ACCOUNTS[type].name}`);
    } catch (error: any) {
      toast.error(`Error logging in: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsLoading(prev => ({ ...prev, [type]: false }));
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Signed out successfully");
    } catch (error: any) {
      toast.error(`Error signing out: ${error instanceof Error ? error.message : "Unknown error"}`);
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
                Instant access to pre-configured test accounts for different user roles
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
                      Test accounts now work instantly without any authentication or database access.
                      These test accounts simulate different user roles for development purposes.
                    </p>
                    <p className="text-sm text-blue-700 mt-1">
                      {isLoggedIn
                        ? `Currently active as: ${profile?.full_name || user.email} (${currentUserType})`
                        : "Click any account button below to instantly access test accounts"}
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
                      onClick={handleSignOut}
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
                        <span className="font-semibold">Note:</span> No password required in test mode
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button
                        onClick={() => handleLoginAs('school')}
                        className="w-full gradient-bg"
                        disabled={isLoading.school || (isLoggedIn && currentUserType === 'school')}
                      >
                        {isLoading.school ? "Activating..." : isLoggedIn && currentUserType === 'school' ? "Currently Active" : "Access as School Admin"}
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
                        <span className="font-semibold">Note:</span> No password required in test mode
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button
                        onClick={() => handleLoginAs('teacher')}
                        className="w-full gradient-bg"
                        disabled={isLoading.teacher || (isLoggedIn && currentUserType === 'teacher')}
                      >
                        {isLoading.teacher ? "Activating..." : isLoggedIn && currentUserType === 'teacher' ? "Currently Active" : "Access as Teacher"}
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
                        <span className="font-semibold">Note:</span> No password required in test mode
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button
                        onClick={() => handleLoginAs('student')}
                        className="w-full gradient-bg"
                        disabled={isLoading.student || (isLoggedIn && currentUserType === 'student')}
                      >
                        {isLoading.student ? "Activating..." : isLoggedIn && currentUserType === 'student' ? "Currently Active" : "Access as Student"}
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
                  <li>Test accounts now work instantly without authentication or database access</li>
                  <li>All test users have access to the same simulated school environment</li>
                  <li>Test data is stored in session storage and is cleared when you sign out</li>
                  <li>No real database operations are performed with test accounts</li>
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
