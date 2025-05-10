
import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/landing/Footer";
import AdminNavbar from "@/components/school-admin/AdminNavbar";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AnalyticsDashboard from "@/components/analytics/AnalyticsDashboard";

// Define types for analytics data
interface AnalyticsData {
  studentMetrics: any[];
  teacherMetrics: any[];
}

const AdminAnalytics = () => {
  const { user, profile } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    studentMetrics: [],
    teacherMetrics: [],
  });
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || !profile?.school_id) {
      toast.error("Please log in to access this page");
      navigate("/login");
      return;
    }
    
    const fetchAnalyticsData = async () => {
      setIsLoading(true);
      try {
        // Fetch student metrics for school
        // Updated to use student_performance_metrics instead of student_engagement_metrics
        const { data: studentMetrics, error: studentError } = await supabase
          .from("student_performance_metrics")
          .select("*")
          .eq("school_id", profile.school_id);

        if (studentError) throw studentError;

        // Fetch teacher metrics for school
        // Updated to use teacher_performance_metrics instead of teacher_activity_metrics
        const { data: teacherMetrics, error: teacherError } = await supabase
          .from("teacher_performance_metrics")
          .select("*")
          .eq("school_id", profile.school_id);

        if (teacherError) throw teacherError;

        setAnalyticsData({
          studentMetrics: studentMetrics || [],
          teacherMetrics: teacherMetrics || []
        });

      } catch (error: any) {
        console.error("Error fetching analytics data:", error);
        toast.error("Failed to load analytics data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalyticsData();
  }, [user, profile, navigate]);

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
              onClick={() => navigate('/admin', { state: { preserveContext: true } })}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Admin
            </Button>
            <h1 className="text-3xl font-bold gradient-text">School Analytics</h1>
          </div>

          <AdminNavbar />

          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <p className="text-lg text-gray-500">Loading analytics data...</p>
            </div>
          ) : (
            <AnalyticsDashboard 
              studentMetrics={analyticsData.studentMetrics}
              teacherMetrics={analyticsData.teacherMetrics}
              schoolId={profile?.school_id}
            />
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminAnalytics;
