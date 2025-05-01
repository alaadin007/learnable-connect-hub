
import React from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/landing/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import AnalyticsDashboard from "@/components/analytics/AnalyticsDashboard";

const AdminAnalytics = () => {
  const { profile } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow bg-learnable-super-light py-8">
        <div className="container mx-auto px-4">
          <div className="mb-6">
            <h1 className="text-3xl font-bold gradient-text mb-2">School Analytics Dashboard</h1>
            <p className="text-learnable-gray">
              Comprehensive analytics for your school
            </p>
          </div>
          
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>School Information</CardTitle>
              <CardDescription>Analytics for your school</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <span className="font-medium min-w-32">School Name:</span>
                  <span>{profile?.school_name || "Not available"}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <span className="font-medium min-w-32">School Code:</span>
                  <span className="font-mono">{profile?.school_code || "Not available"}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <AnalyticsDashboard userRole="school" />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminAnalytics;
