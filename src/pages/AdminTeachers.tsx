
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import TeacherManagement from "@/components/school-admin/TeacherManagement";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/landing/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

const AdminTeachers = () => {
  const navigate = useNavigate();
  const { userRole, user, isLoading: authLoading } = useAuth();
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Verify authentication first
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      toast.error("You must be logged in to access this page");
      navigate("/login", { replace: true });
      return;
    }
    
    // Verify correct user role and redirect if needed - but with improved error handling
    if (userRole && userRole !== "school") {
      console.log(`AdminTeachers: Unauthorized access by user with role ${userRole}`);
      toast.error("You don't have permission to access this page");
      navigate("/dashboard", { replace: true });
      return;
    }
    
    setPageLoading(false);
  }, [user, userRole, navigate, authLoading]);
  
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
              onClick={() => navigate('/admin')}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Admin
            </Button>
            <h1 className="text-3xl font-bold gradient-text">Teacher Management</h1>
          </div>
          
          {pageLoading ? (
            <Card>
              <CardHeader>
                <CardTitle>Loading</CardTitle>
                <CardDescription>Please wait while we load the teacher management page...</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </CardContent>
            </Card>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
              <Button 
                onClick={() => navigate('/admin')} 
                className="mt-2"
                variant="outline"
                size="sm"
              >
                Return to Admin Dashboard
              </Button>
            </Alert>
          ) : (
            <TeacherManagement />
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminTeachers;
