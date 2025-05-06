
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
import { getCurrentSchoolInfo } from "@/utils/databaseUtils";

const AdminStudents = () => {
  const { user, schoolId: authSchoolId } = useAuth();
  const { isAdmin } = useRBAC();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [schoolInfo, setSchoolInfo] = useState<{ name: string; code: string; id?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch school data when component mounts
  useEffect(() => {
    const fetchSchoolInfo = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        // Try to get complete school info from database
        const schoolData = await getCurrentSchoolInfo();
        
        if (schoolData) {
          setSchoolInfo({
            id: schoolData.id,
            name: schoolData.name,
            code: schoolData.code
          });
          setSchoolId(schoolData.id);
          setIsLoading(false);
          return;
        }
        
        // Fallback: Try to get school ID from auth context
        let schoolIdToUse = authSchoolId;
        
        // If not available, fetch it
        if (!schoolIdToUse) {
          const { data: fetchedSchoolId, error: schoolIdError } = await supabase
            .rpc('get_user_school_id');
          
          if (schoolIdError) {
            console.error('Error fetching school ID:', schoolIdError);
            toast.error("Failed to load school information");
            setError("Failed to load school information");
            setIsLoading(false);
            return;
          }
          
          schoolIdToUse = fetchedSchoolId;
        }
        
        if (schoolIdToUse) {
          console.log("AdminStudents: School ID retrieved:", schoolIdToUse);
          setSchoolId(schoolIdToUse);
          
          // Fetch school data
          const { data: schoolDetails, error: schoolError } = await supabase
            .from("schools")
            .select("name, code")
            .eq("id", schoolIdToUse)
            .single();
            
          if (schoolError) {
            console.error("Error fetching school details:", schoolError);
            toast.error("Failed to load school details");
            setError("Failed to load school details");
          } else if (schoolDetails) {
            setSchoolInfo({
              name: schoolDetails.name,
              code: schoolDetails.code
            });
          }
        }
      } catch (error) {
        console.error("Error in fetchSchoolId:", error);
        toast.error("Failed to load data");
        setError("Failed to load data");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSchoolInfo();
  }, [user, authSchoolId]);

  // Protect route - only admin users should access
  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }
    
    if (!isAdmin && !isLoading) {
      toast.error("You don't have permission to access this page");
      navigate("/dashboard", { replace: true });
    }
  }, [user, isAdmin, navigate, isLoading]);

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
          
          {error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-600 mb-4">
              <p>{error}</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2"
                onClick={() => window.location.reload()}
              >
                Retry
              </Button>
            </div>
          ) : (
            <AdminStudentsComponent />
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminStudents;
