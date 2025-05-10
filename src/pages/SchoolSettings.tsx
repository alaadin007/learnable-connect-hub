import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import Sidebar from '@/components/layout/Sidebar';
import DashboardLayout from '@/components/layout/DashboardLayout';
import SchoolCodeGenerator from '@/components/school-admin/SchoolCodeGenerator';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { CheckCircle } from "lucide-react";

const SchoolSettings = () => {
  const { user, profile } = useAuth();
  const [schoolName, setSchoolName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isCodeGenerated, setIsCodeGenerated] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (profile?.school_name) {
      setSchoolName(profile.school_name);
    }
  }, [profile?.school_name]);

  const handleSaveSchoolName = async () => {
    setIsSaving(true);
    try {
      if (!user?.id) {
        throw new Error("User ID not found");
      }

      const { error } = await supabase
        .from('schools')
        .update({ name: schoolName })
        .eq('id', profile?.school_id);

      if (error) {
        throw error;
      }

      // Update the profile as well
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ school_name: schoolName })
        .eq('id', user.id);

      if (profileError) {
        throw profileError;
      }

      toast.success("School name updated successfully!");
    } catch (error: any) {
      console.error("Error updating school name:", error);
      toast.error(error.message || "Failed to update school name");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCodeGenerated = (code: string) => {
    setGeneratedCode(code);
    setIsCodeGenerated(true);
  };

  const copyToClipboard = () => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode);
      setIsCopied(true);
      toast.success("School code copied to clipboard");
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <DashboardLayout>
      <div className="container py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-1">
            <Sidebar />
          </div>
          <div className="md:col-span-3 space-y-6">
            <Card className="w-full">
              <CardHeader>
                <CardTitle>School Information</CardTitle>
                <CardDescription>
                  Update your school's information here.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="schoolName">School Name</Label>
                  <Input
                    id="schoolName"
                    placeholder="Learnable Academy"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                  />
                </div>
                <Button
                  className="w-full gradient-bg"
                  onClick={handleSaveSchoolName}
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Save School Name"}
                </Button>
              </CardContent>
            </Card>

            <SchoolCodeGenerator onCodeGenerated={handleCodeGenerated} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SchoolSettings;
