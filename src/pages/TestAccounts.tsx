
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/landing/Footer';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { School, GraduationCap, User, Loader2, LogOut } from 'lucide-react';
import { toast } from 'sonner';

const TestAccounts = () => {
  const { setTestUser, user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleSelectAccount = async (type: 'school' | 'teacher' | 'student') => {
    try {
      setIsLoading(type);
      await setTestUser(type);
      
      // Navigate to the appropriate dashboard
      setTimeout(() => {
        if (type === 'school') {
          navigate('/admin', { state: { fromTestAccounts: true }, replace: true });
        } else if (type === 'teacher') {
          navigate('/teacher/analytics', { state: { fromTestAccounts: true }, replace: true });
        } else {
          navigate('/dashboard', { state: { fromTestAccounts: true }, replace: true });
        }
      }, 1000);
      
      toast.success(`Logged in as ${type} test account`);
    } catch (error) {
      console.error(`Error using ${type} test account:`, error);
      toast.error(`Failed to access ${type} test account`);
    } finally {
      setIsLoading(null);
    }
  };
  
  const handleLogout = async () => {
    try {
      setIsLoading('logout');
      await signOut();
      toast.success('Logged out from test account');
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Failed to log out');
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-indigo-50">
      <Navbar />
      
      <div className="flex-grow flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-4xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold gradient-text mb-4">Test Accounts</h1>
            <p className="text-gray-600 max-w-xl mx-auto">
              Access the platform with different user roles to explore features available to each type of user.
              No password needed - just click on the account you want to use.
            </p>
            
            {user && (
              <div className="mt-6">
                <Card className="border-amber-300 bg-amber-50">
                  <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="text-left">
                        <p className="text-amber-800 font-medium">
                          You are currently using a test account: <span className="font-bold">{user.email}</span>
                        </p>
                        <p className="text-amber-700 text-sm mt-1">
                          You can switch to a different test account or log out below.
                        </p>
                      </div>
                      <Button 
                        variant="outline" 
                        onClick={handleLogout}
                        disabled={isLoading === 'logout'}
                        className="border-amber-400 text-amber-800 hover:bg-amber-100 min-w-[120px]"
                      >
                        {isLoading === 'logout' ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <LogOut className="h-4 w-4 mr-2" />
                        )}
                        Log Out
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
          
          <Tabs defaultValue="school" className="w-full">
            <TabsList className="grid grid-cols-3 mb-8">
              <TabsTrigger value="school" className="py-3">
                <School className="h-5 w-5 mr-2" />
                <span>School Admin</span>
              </TabsTrigger>
              <TabsTrigger value="teacher">
                <GraduationCap className="h-5 w-5 mr-2" />
                <span>Teacher</span>
              </TabsTrigger>
              <TabsTrigger value="student">
                <User className="h-5 w-5 mr-2" />
                <span>Student</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="school" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <School className="h-5 w-5 mr-2 text-blue-600" />
                    School Administrator
                  </CardTitle>
                  <CardDescription>
                    Access school-wide features, manage teachers and students, and view analytics.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      <p className="font-semibold">Email:</p>
                      <p className="col-span-2">school.test@learnable.edu</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <p className="font-semibold">Permissions:</p>
                      <p className="col-span-2">Full access to school management, analytics, and teacher management</p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    onClick={() => handleSelectAccount('school')} 
                    className="w-full"
                    disabled={isLoading !== null}
                  >
                    {isLoading === 'school' ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Accessing...
                      </>
                    ) : (
                      'Access School Admin Account'
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="teacher" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <GraduationCap className="h-5 w-5 mr-2 text-green-600" />
                    Teacher
                  </CardTitle>
                  <CardDescription>
                    Manage your students, create assessments, and view student performance.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      <p className="font-semibold">Email:</p>
                      <p className="col-span-2">teacher.test@learnable.edu</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <p className="font-semibold">Permissions:</p>
                      <p className="col-span-2">Student management, assessment creation, analytics for assigned students</p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    onClick={() => handleSelectAccount('teacher')} 
                    className="w-full bg-green-600 hover:bg-green-700"
                    disabled={isLoading !== null}
                  >
                    {isLoading === 'teacher' ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Accessing...
                      </>
                    ) : (
                      'Access Teacher Account'
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="student" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="h-5 w-5 mr-2 text-purple-600" />
                    Student
                  </CardTitle>
                  <CardDescription>
                    Access learning materials, take assessments, and track your progress.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      <p className="font-semibold">Email:</p>
                      <p className="col-span-2">student.test@learnable.edu</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <p className="font-semibold">Permissions:</p>
                      <p className="col-span-2">View assignments, submit assessments, chat with AI, track personal progress</p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    onClick={() => handleSelectAccount('student')} 
                    className="w-full bg-purple-600 hover:bg-purple-700"
                    disabled={isLoading !== null}
                  >
                    {isLoading === 'student' ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Accessing...
                      </>
                    ) : (
                      'Access Student Account'
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="mt-8 text-center">
            <p className="text-gray-500 text-sm">
              These are test accounts with simulated data. In a production environment, users would need to register and be authenticated.
            </p>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default TestAccounts;
