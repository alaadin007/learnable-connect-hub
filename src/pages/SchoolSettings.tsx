
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
import { ArrowLeft, Save } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import SchoolCodeManager from "@/components/school-admin/SchoolCodeManager";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle
} from "@/components/ui/alert-dialog";

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
  const { profile, user, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [schoolName, setSchoolName] = useState("");
  const [schoolCode, setSchoolCode] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [description, setDescription] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    // Load initial school data
    const fetchSchoolData = async () => {
      if (!profile?.organization?.id) return;
      
      setIsLoading(true);
      try {
        console.log("Fetching school data for ID:", profile.organization.id);
        
        // Direct database query to avoid RPC calls that might cause recursion
        const { data: schoolData, error } = await supabase
          .from("schools")
          .select("*")
          .eq("id", profile.organization.id)
          .single();
            
        if (error) throw error;
          
        console.log("Fetched school data:", schoolData);
        
        if (schoolData) {
          setSchoolName(schoolData.name || "");
          setSchoolCode(schoolData.code || "");
          setContactEmail(schoolData.contact_email || user?.email || "");
          setDescription(schoolData.description || "");
          setNotificationsEnabled(schoolData.notifications_enabled !== false); // Default to true if undefined
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
      const schoolId = profile.organization.id;
      console.log("Saving school settings for ID:", schoolId);
      
      // Update school information
      const { data, error } = await supabase
        .from("schools")
        .update({
          name: schoolName,
          contact_email: contactEmail,
          description: description,
          notifications_enabled: notificationsEnabled,
          updated_at: new Date().toISOString()
        })
        .eq("id", schoolId);

      if (error) {
        console.error("Error in supabase update:", error);
        throw error;
      }
      
      console.log("School settings update response:", data);
      
      // Refresh profile to get latest data
      await refreshProfile();
      
      toast.success("School settings updated successfully!");
    } catch (error: any) {
      console.error("Error updating school settings:", error);
      toast.error(error.message || "Failed to update school settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSchool = async () => {
    if (!profile?.organization?.id) {
      toast.error("No school ID found. Cannot delete account.");
      return;
    }
    
    setIsDeleting(true);
    try {
      // First, delete students and teachers associated with the school
      // This approach ensures we don't have orphaned records
      
      // 1. Delete students linked to the school
      const { error: studentsError } = await supabase
        .from("students")
        .delete()
        .eq("school_id", profile.organization.id);
      
      if (studentsError) throw studentsError;
      
      // 2. Delete teachers linked to the school
      const { error: teachersError } = await supabase
        .from("teachers")
        .delete()
        .eq("school_id", profile.organization.id);
      
      if (teachersError) throw teachersError;
      
      // 3. Delete the school itself
      const { error: schoolError } = await supabase
        .from("schools")
        .delete()
        .eq("id", profile.organization.id);
      
      if (schoolError) throw schoolError;
      
      // 4. Sign out the user after deletion is complete
      await signOut();
      
      toast.success("School account successfully deleted");
      navigate("/");
    } catch (error: any) {
      console.error("Error deleting school account:", error);
      toast.error(error.message || "Failed to delete school account");
    } finally {
      setShowDeleteDialog(false);
      setIsDeleting(false);
    }
  };

  const handleCodeGenerated = (newCode: string) => {
    console.log("New code generated:", newCode);
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
          
          {/* School Code Card - Moved to top for prominence */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>School Code Management</CardTitle>
              <CardDescription>
                Generate and manage the code teachers and students need to join your school
              </CardDescription>
            </CardHeader>
            <CardContent>
              {profile?.organization?.id && (
                <SchoolCodeManager 
                  schoolId={profile.organization.id} 
                  currentCode={schoolCode} 
                  onCodeGenerated={handleCodeGenerated}
                />
              )}
            </CardContent>
          </Card>
          
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>School Information</CardTitle>
              <CardDescription>
                Update your school details and settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-learnable-blue border-r-transparent align-[-0.125em]"></div>
                  <span className="ml-3">Loading school information...</span>
                </div>
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
                    className="gradient-bg flex items-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent align-[-0.125em]"></span>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Save Settings
                      </>
                    )}
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
                  <Button 
                    variant="destructive"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    Delete School Account
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />

      {/* Delete School Account Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete your school account and all associated data, including:
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>School profile information</li>
                <li>Teacher accounts connected to your school</li>
                <li>Student accounts connected to your school</li>
                <li>All assessments, documents, and learning sessions</li>
              </ul>
              <p className="mt-2 font-semibold">This action cannot be undone.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSchool}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Yes, Delete School Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SchoolSettings;
