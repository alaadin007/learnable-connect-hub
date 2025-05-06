
import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRBAC } from "@/contexts/RBACContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import AdminStudentsComponent from "@/components/admin/AdminStudents";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Settings } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getCurrentSchoolInfo } from "@/utils/databaseUtils";

const AdminStudents = () => {
  const { user, profile } = useAuth();
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

  const goToSettings = () => {
    navigate("/admin/settings");
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
      
      // First try using the utility function for most reliable method
      const schoolData = await getCurrentSchoolInfo();
      if (schoolData) {
        console.log("School info retrieved from utility:", schoolData);
        setSchoolInfo({
          id: schoolData.school_id,
          name: schoolData.school_name,
          code: schoolData.school_code
        });
        setSchoolId(schoolData.school_id);
        setLoading(false);
        return;
      }
      
      // Try using profile data if it's available
      if (profile?.organization?.id && profile?.organization?.name && profile?.organization?.code) {
        console.log("Using profile data for school:", profile.organization);
        setSchoolInfo({
          id: profile.organization.id,
          name: profile.organization.name,
          code: profile.organization.code
        });
        setSchoolId(profile.organization.id);
        setLoading(false);
        return;
      }
      
      // Get user metadata from auth
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) {
        throw new Error("Authentication error");
      }
      
      // Try to extract school info from user metadata
      const userMeta = authData.user.user_metadata;
      console.log("User metadata:", userMeta);
      
      if (userMeta?.school_name && userMeta?.school_code) {
        // Get the school ID from the school code
        const { data: schoolDetails, error: schoolCodeError } = await supabase
          .from("schools")
          .select("id, name, code")
          .eq("code", userMeta.school_code)
          .single();
          
        if (!schoolCodeError && schoolDetails) {
          console.log("Found school by code:", schoolDetails);
          setSchoolInfo({
            id: schoolDetails.id,
            name: schoolDetails.name,
            code: schoolDetails.code
          });
          setSchoolId(schoolDetails.id);
          setLoading(false);
          return;
        } else {
          console.log("Error finding school by code:", schoolCodeError);
        }
      }
      
      throw new Error("Could not determine your school information. Please check your API configuration in School Settings.");
      
    } catch (err: any) {
      console.error("Error in fetchSchoolData:", err);
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchoolData();
  }, [user, profile]);

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
            <Alert variant="destructive" className="mb-6">
              <AlertTitle className="text-lg font-semibold">Error Determining School</AlertTitle>
              <AlertDescription className="mt-2">
                <p className="mb-4">{error}</p>
                <div className="flex flex-wrap gap-3 mt-2">
                  <Button variant="outline" size="sm" onClick={handleRetry}>
                    Retry
                  </Button>
                  <Button 
                    size="sm" 
                    className="flex items-center gap-1" 
                    onClick={goToSettings}
                  >
                    <Settings className="h-4 w-4" />
                    Go to School Settings
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
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
