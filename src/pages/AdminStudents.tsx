
import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRBAC } from "@/contexts/RBACContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/landing/Footer";
import AdminStudentsComponent from "@/components/admin/AdminStudents";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const AdminStudents = () => {
  const { user, profile } = useAuth();
  const { isAdmin } = useRBAC();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [schoolInfo, setSchoolInfo] = useState<{ name: string; code: string; id?: string } | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Fetch school data directly when component mounts
  useEffect(() => {
    const fetchSchoolInfo = async () => {
      if (!user) return;
      
      try {
        setError(null);
        setLoading(true);
        
        // Try to get school info directly from the RPC function
        const { data: schoolIdData, error: schoolIdError } = await supabase
          .rpc('get_user_school_id');
          
        if (schoolIdError) {
          console.error("Error fetching school ID from RPC function:", schoolIdError);
          
          // Fallback: Get the school ID from teachers table since the current user is an admin
          const { data: teacherData, error: teacherError } = await supabase
            .from("teachers")
            .select("school_id")
            .eq("id", user.id)
            .single();
            
          if (teacherError) {
            console.error("Error fetching school ID from teachers table:", teacherError);
            setError("Unable to determine your school. Please refresh the page.");
            setLoading(false);
            return;
          }
          
          if (teacherData?.school_id) {
            setSchoolId(teacherData.school_id);
            
            // Fetch school details using the school ID
            const { data: schoolDetails, error: schoolError } = await supabase
              .from("schools")
              .select("id, name, code")
              .eq("id", teacherData.school_id)
              .single();
              
            if (schoolError) {
              console.error("Error fetching school details:", schoolError);
              setError("Failed to load school details");
              setLoading(false);
              return;
            } 
            
            if (schoolDetails) {
              setSchoolInfo({
                id: schoolDetails.id,
                name: schoolDetails.name,
                code: schoolDetails.code
              });
            }
          } else {
            setError("No school associated with your account");
          }
        } else if (schoolIdData) {
          // RPC function worked, use the returned school ID
          setSchoolId(schoolIdData);
          
          // Fetch school details using the school ID
          const { data: schoolDetails, error: schoolError } = await supabase
            .from("schools")
            .select("id, name, code")
            .eq("id", schoolIdData)
            .single();
            
          if (schoolError) {
            console.error("Error fetching school details:", schoolError);
            setError("Failed to load school details");
          } else if (schoolDetails) {
            setSchoolInfo({
              id: schoolDetails.id,
              name: schoolDetails.name,
              code: schoolDetails.code
            });
          }
        } else {
          setError("No school associated with your account");
        }
      } catch (error) {
        console.error("Error in fetchSchoolInfo:", error);
        setError("Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    
    fetchSchoolInfo();
  }, [user]);

  // Protect route - redirect if not authenticated or not admin
  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true, state: { returnUrl: "/admin/students" } });
      return;
    }
    
    if (!isAdmin) {
      toast.error("You don't have permission to access this page");
      navigate("/dashboard", { replace: true });
    }
  }, [user, isAdmin, navigate]);

  const handleRetry = () => {
    window.location.reload();
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
              onClick={() => navigate('/admin')}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Admin
            </Button>
            <h1 className="text-3xl font-bold gradient-text">Student Management</h1>
          </div>
          
          {loading ? (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-md flex justify-center items-center h-32">
              <div className="animate-spin h-6 w-6 border-2 border-primary rounded-full border-t-transparent"></div>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-600 mb-4">
              <p>{error}</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2"
                onClick={handleRetry}
              >
                Retry
              </Button>
            </div>
          ) : (
            schoolId && <AdminStudentsComponent schoolId={schoolId} schoolInfo={schoolInfo} />
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminStudents;
