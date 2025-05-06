
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
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentSchoolInfo } from "@/utils/databaseUtils";

const AdminStudents = () => {
  const { user } = useAuth();
  const { isAdmin } = useRBAC();
  const navigate = useNavigate();

  const [error, setError] = useState<string | null>(null);
  const [schoolInfo, setSchoolInfo] = useState<{ name: string; code: string; id?: string } | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    fetchSchoolData();
  };

  const fetchSchoolData = async () => {
    try {
      if (!user) {
        setError("You must be logged in to access this page");
        setLoading(false);
        return;
      }

      console.log("Fetching school data...");
      setError(null);
      
      // Try to get school info using the improved utility function
      const schoolData = await getCurrentSchoolInfo();
      
      if (schoolData) {
        console.log("School data retrieved:", schoolData);
        setSchoolInfo({
          id: schoolData.id,
          name: schoolData.name,
          code: schoolData.code
        });
        setSchoolId(schoolData.id);
        setLoading(false);
        return;
      }
      
      // If we couldn't get the school info, try a direct query
      const { data: authUser } = await supabase.auth.getUser();
      if (!authUser?.user?.id) {
        throw new Error("Authentication error");
      }
      
      // Try direct query to get school_id from teachers table
      const { data: teacherData, error: teacherError } = await supabase
        .from("teachers")
        .select("school_id")
        .eq("id", authUser.user.id)
        .single();
        
      if (teacherError) {
        console.error("Error fetching teacher data:", teacherError);
        throw new Error("Failed to determine your school");
      }
      
      const resolvedSchoolId = teacherData?.school_id;
      
      if (!resolvedSchoolId) {
        throw new Error("No school associated with your account");
      }
      
      setSchoolId(resolvedSchoolId);
      
      // Fetch school details
      const { data: schoolDetails, error: schoolError } = await supabase
        .from("schools")
        .select("id, name, code")
        .eq("id", resolvedSchoolId)
        .single();
        
      if (schoolError || !schoolDetails) {
        console.error("Error fetching school details:", schoolError);
        throw new Error("Failed to load school details");
      }
      
      setSchoolInfo({
        id: schoolDetails.id,
        name: schoolDetails.name,
        code: schoolDetails.code
      });
      
    } catch (err: any) {
      console.error("Error in fetchSchoolData:", err);
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchoolData();
  }, [user]);

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

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow bg-learnable-super-light py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="outline" size="sm" className="flex items-center gap-1" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-4 w-4" />
              Back to Admin
            </Button>
            <h1 className="text-3xl font-bold gradient-text">Student Management</h1>
          </div>

          {loading ? (
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <Skeleton className="h-8 w-1/3" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-20 w-full" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-32 w-full" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-600 mb-4">
              <p>{error}</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={handleRetry}>Retry</Button>
            </div>
          ) : schoolId ? (
            <AdminStudentsComponent schoolId={schoolId} schoolInfo={schoolInfo} />
          ) : (
            <p className="text-center text-gray-500">No school information available.</p>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminStudents;
