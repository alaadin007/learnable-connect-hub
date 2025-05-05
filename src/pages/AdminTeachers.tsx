
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import TeacherManagement from "@/components/school-admin/TeacherManagement";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/landing/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const AdminTeachers = () => {
  const navigate = useNavigate();
  const { userRole, user } = useAuth();

  // Verify authentication first
  useEffect(() => {
    if (!user) {
      toast.error("You must be logged in to access this page");
      navigate("/login", { replace: true });
      return;
    }
  }, [user, navigate]);

  // Verify correct user role and redirect if needed - but with improved error handling
  useEffect(() => {
    if (userRole && userRole !== "school") {
      console.log(`AdminTeachers: Unauthorized access by user with role ${userRole}`);
      toast.error("You don't have permission to access this page");
      navigate("/dashboard", { replace: true });
    }
  }, [userRole, navigate]);
  
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
              onClick={() => navigate('/admin', { replace: true })}
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

export default AdminTeachers;
