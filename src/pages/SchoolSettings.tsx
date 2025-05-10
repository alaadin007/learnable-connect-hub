// Add the toast import at the top
import { toast } from "sonner";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const SchoolSettings = () => {
  const { user, profile } = useAuth();
  const [schoolName, setSchoolName] = useState('');
  const [schoolCode, setSchoolCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setSchoolName(profile.school_name || '');
      setSchoolCode(profile.school_code || '');
    }
  }, [profile]);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      const updates = {
        school_name: schoolName,
        school_code: schoolCode
      };

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) {
        console.error("Error updating school settings:", error);
        toast.error("Failed to update school settings");
        return;
      }

      // Optimistically update the local profile
      // setProfile({ ...profile, ...updates });

      toast.success("School settings updated successfully!");
    } catch (error: any) {
      console.error("Error updating school settings:", error);
      toast.error(error.message || "Failed to update school settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="container py-6">
        <Card>
          <CardHeader>
            <CardTitle>School Settings</CardTitle>
            <CardDescription>
              Manage your school's information and settings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="schoolName">School Name</Label>
                <Input
                  type="text"
                  id="schoolName"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="schoolCode">School Code</Label>
                <Input
                  type="text"
                  id="schoolCode"
                  value={schoolCode}
                  onChange={(e) => setSchoolCode(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
          <div className="p-6">
            <Button onClick={handleSaveSettings} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default SchoolSettings;
