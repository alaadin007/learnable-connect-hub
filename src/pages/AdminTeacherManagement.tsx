
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import TeacherManagement from "@/components/school-admin/TeacherManagement";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/landing/Footer";
import { useAuth } from "@/contexts/AuthContext";

const AdminTeacherManagement = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userRole, isLoading } = useAuth();

  // Verify correct user role when auth is loaded
  React.useEffect(() => {
    console.log("AdminTeacherManagement: Auth check", { userRole, isLoading });
    
    if (!isLoading && userRole && userRole !== "school") {
      console.log(`AdminTeacherManagement: Redirecting user with role ${userRole} to dashboard`);
      navigate("/dashboard", { state: { fromRoleRedirect: true } });
    }
  }, [userRole, navigate, isLoading]);
  
  // Show loading state during authentication
  if (isLoading) {
    return (
      <>
        <Navbar />
        <main className="flex-grow bg-learnable-super-light py-8">
          <div className="container mx-auto px-4 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-xl">Verifying your admin access...</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }
  
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
              onClick={() => navigate('/admin', { state: { fromNavigation: true, preserveContext: true } })}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Admin
            </Button>
            <h1 className="text-3xl font-bold gradient-text">Teacher Management</h1>
          </div>
          
          <TeacherManagement />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminTeacherManagement;
