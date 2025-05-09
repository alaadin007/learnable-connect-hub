
import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/landing/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import SchoolCodeManager from "@/components/school-admin/SchoolCodeManager";

interface SchoolData {
  id: string;
  name: string;
  code: string;
  created_at?: string;
  updated_at?: string;
  contact_email?: string;
  description?: string;
  notifications_enabled?: boolean;
}

const SchoolSettings = () => {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [schoolName, setSchoolName] = useState("");
  const [schoolCode, setSchoolCode] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [description, setDescription] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Load initial school data
    const fetchSchoolData = async () => {
      if (!profile?.organization?.id) return;
      
      setIsLoading(true);
      try {
        // First get basic school information from the RPC function
        const { data: schoolBasicData, error: basicDataError } = await supabase
          .rpc('get_school_by_id', {
            school_id_param: profile.organization.id
          });

        if (basicDataError) throw basicDataError;
        
        if (schoolBasicData && schoolBasicData.length > 0) {
          const basicData = schoolBasicData[0];
          setSchoolName(basicData.name || "");
          setSchoolCode(basicData.code || "");
          setContactEmail(basicData.contact_email || user?.email || "");
          
          // Now fetch the full school data with all fields we need
          const { data: fullSchoolData, error: fullDataError } = await supabase
            .from("schools")
            .select("*")
            .eq("id", profile.organization.id)
            .single();
            
          if (fullDataError) throw fullDataError;
          
          if (fullSchoolData) {
            // Update the additional fields from the full data
            setDescription(fullSchoolData.description || "");
            setNotificationsEnabled(fullSchoolData.notifications_enabled !== false); // Default to true if undefined
          }
        }
      } catch (error) {
        console.error("Error fetching school data:", error);
        toast.error("Could not load school information");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSchoolData();
  }, [profile, user]);

  const handleSaveSettings = async () => {
    if (!profile?.organization?.id) {
      toast.error("No school ID found. Please refresh the page or contact support.");
      return;
    }
    
    setIsSaving(true);
    try {
      // Update school information
      const { error } = await supabase
        .from("schools")
        .update({
          name: schoolName,
          contact_email: contactEmail,
          description: description,
          notifications_enabled: notificationsEnabled,
          updated_at: new Date().toISOString()
        })
        .eq("id", profile.organization.id);

      if (error) throw error;
      
      toast.success("School settings updated successfully!");
    } catch (error: any) {
      console.error("Error updating school settings:", error);
      toast.error(error.message || "Failed to update school settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCodeGenerated = (newCode: string) => {
    setSchoolCode(newCode);
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
            <h1 className="text-3xl font-bold gradient-text">School Settings</h1>
          </div>
          
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>School Information</CardTitle>
              <CardDescription>
                Update your school details and settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div>Loading school information...</div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="schoolName">School Name</Label>
                      <Input 
                        id="schoolName" 
                        value={schoolName} 
                        onChange={(e) => setSchoolName(e.target.value)}
                        placeholder="Your school's name" 
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="contactEmail">Contact Email</Label>
                      <Input 
                        id="contactEmail" 
                        type="email"
                        value={contactEmail} 
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="admin@yourschool.edu" 
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">School Description</Label>
                    <Textarea 
                      id="description" 
                      value={description} 
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Brief description of your school" 
                      rows={3}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>School Code</Label>
                    {profile?.organization?.id && (
                      <SchoolCodeManager 
                        schoolId={profile.organization.id} 
                        currentCode={schoolCode} 
                        onCodeGenerated={handleCodeGenerated}
                      />
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="notifications"
                      checked={notificationsEnabled}
                      onCheckedChange={setNotificationsEnabled}
                    />
                    <Label htmlFor="notifications">Enable email notifications</Label>
                  </div>
                  
                  <Button 
                    onClick={handleSaveSettings} 
                    disabled={isSaving}
                    className="gradient-bg"
                  >
                    {isSaving ? "Saving..." : "Save Settings"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Advanced Settings</CardTitle>
              <CardDescription>
                Danger zone - actions here cannot be easily reversed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border border-destructive rounded-lg">
                  <h3 className="text-lg font-semibold text-destructive mb-2">Delete School Account</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Permanently remove your school account and all associated data.
                    This action cannot be undone.
                  </p>
                  <Button variant="destructive">
                    Delete School Account
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SchoolSettings;
