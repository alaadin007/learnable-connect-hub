
import React from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/landing/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import AnalyticsDashboard from "@/components/analytics/AnalyticsDashboard";

const TeacherAnalytics = () => {
  const { profile } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow bg-learnable-super-light py-8">
        <div className="container mx-auto px-4">
          <div className="mb-6">
            <h1 className="text-3xl font-bold gradient-text mb-2">Teacher Analytics</h1>
            <p className="text-learnable-gray">
              Track student progress and learning analytics
            </p>
          </div>
          
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Teacher Information</CardTitle>
              <CardDescription>View analytics for your students</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <span className="font-medium min-w-32">Name:</span>
                  <span>{profile?.full_name || "Not available"}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <span className="font-medium min-w-32">School:</span>
                  <span>{profile?.school_name || "Not available"}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <AnalyticsDashboard userRole="teacher" />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TeacherAnalytics;
