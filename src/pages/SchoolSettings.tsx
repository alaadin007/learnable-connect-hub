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
import { ArrowLeft, Save, Loader2, Check } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import SchoolCodeGenerator from "@/components/school-admin/SchoolCodeGenerator";
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
import AdminNavbar from "@/components/school-admin/AdminNavbar";
import { getSchoolIdWithFallback } from "@/utils/apiHelpers";

const SchoolSettings = () => {
  const { profile, user, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();

  // Form state
  const [schoolName, setSchoolName] = useState("");
  const [schoolCode, setSchoolCode] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [description, setDescription] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load initial school data
  useEffect(() => {
    const fetchSchoolData = async () => {
      const schoolId = getSchoolIdWithFallback();
      if (!schoolId) return;

      setIsLoading(true);
      try {
        // Try getting from localStorage first for instant loading
        const cachedName = localStorage.getItem('school_name');
        const cachedCode = localStorage.getItem(`school_code_${schoolId}`);
        const cachedEmail = localStorage.getItem('school_email');
        const cachedDesc = localStorage.getItem('school_description');
        
        // Set cached values if they exist
        if (cachedName) setSchoolName(cachedName);
        if (cachedCode) setSchoolCode(cachedCode);
        if (cachedEmail) setContactEmail(cachedEmail);
        if (cachedDesc) setDescription(cachedDesc);
        
        // Set some default values if nothing is found
        if (!cachedName) setSchoolName("Your School");
        if (!cachedCode) setSchoolCode("DEMO-CODE");
        if (!cachedEmail) setContactEmail(user?.email || "");
        
        if (process.env.NODE_ENV === 'production') {
          // Try to get from database in production
          const { data: schoolData, error } = await supabase
            .from("schools")
            .select("*")
            .eq("id", schoolId)
            .single();

          if (!error && schoolData) {
            setSchoolName(schoolData.name || "");
            setSchoolCode(schoolData.code || "");
            setContactEmail(schoolData.contact_email || user?.email || "");
            setDescription(schoolData.description || "");
            setNotificationsEnabled(schoolData.notifications_enabled !== false);
            
            // Cache the values
            localStorage.setItem('school_name', schoolData.name || "");
            localStorage.setItem(`school_code_${schoolId}`, schoolData.code || "");
            localStorage.setItem('school_email', schoolData.contact_email || user?.email || "");
            localStorage.setItem('school_description', schoolData.description || "");
          }
        }
        
        setInitialLoaded(true);
      } catch (error) {
        console.error("Error loading school data:", error);
        // No toast to avoid interrupting UX, we'll just use the cached/default values
      } finally {
        setIsLoading(false);
      }
    };

    fetchSchoolData();
  }, [profile, user]);

  const handleSaveSettings = async () => {
    const schoolId = getSchoolIdWithFallback();
    if (!schoolId) {
      toast.error("No school ID found. Please refresh the page or contact support.");
      return;
    }
    
    if (!schoolName.trim()) {
      toast.error("School name cannot be empty");
      return;
    }

    setSaveSuccess(false);
    setIsSaving(true);
    
    try {
      // Update localStorage immediately for instant UI update across the site
      localStorage.setItem('school_name', schoolName.trim());
      localStorage.setItem(`school_code_${schoolId}`, schoolCode);
      localStorage.setItem('school_email', contactEmail);
      localStorage.setItem('school_description', description);
      
      // Now update in database if in production
      if (process.env.NODE_ENV === 'production') {
        const { error } = await supabase
          .from("schools")
          .update({
            name: schoolName.trim(),
            contact_email: contactEmail,
            description: description,
            notifications_enabled: notificationsEnabled,
            updated_at: new Date().toISOString()
          })
          .eq("id", schoolId);

        if (error) throw error;
      }

      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Refresh profile to update the UI with new school info
      if (refreshProfile) {
        await refreshProfile();
      }

      setSaveSuccess(true);
      toast.success("School settings updated successfully!");
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (error: any) {
      console.error("Error saving school settings:", error);
      toast.error(error.message || "Failed to update school settings");
      // Even if DB update fails, we keep the localStorage values for better UX
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSchool = async () => {
    const schoolId = getSchoolIdWithFallback();
    if (!schoolId) {
      toast.error("No school ID found. Cannot delete account.");
      return;
    }

    setIsDeleting(true);
    try {
      if (process.env.NODE_ENV === 'production') {
        // Use the delete-school-data edge function to handle the complex deletion
        const { error } = await supabase.functions.invoke("delete-school-data", {
          body: { school_id: schoolId }
        });

        if (error) throw new Error(error.message || "Failed to delete school data");

        // Delete the school itself
        const { error: schoolError } = await supabase
          .from("schools")
          .delete()
          .eq("id", schoolId);

        if (schoolError) throw schoolError;
      }

      // Clean up localStorage
      localStorage.removeItem('school_name');
      localStorage.removeItem(`school_code_${schoolId}`);
      localStorage.removeItem('school_email');
      localStorage.removeItem('school_description');
      localStorage.removeItem('schoolId');
      
      if (signOut) {
        await signOut();
      }
      
      toast.success("School account successfully deleted");
      navigate("/");
    } catch (error: any) {
      console.error("Error deleting school:", error);
      toast.error(error.message || "Failed to delete school account");
    } finally {
      setShowDeleteDialog(false);
      setIsDeleting(false);
    }
  };

  const handleCodeGenerated = (newCode: string) => {
    setSchoolCode(newCode);
    
    // Save the new code to localStorage for immediate sync across the site
    const schoolId = getSchoolIdWithFallback();
    localStorage.setItem(`school_code_${schoolId}`, newCode);
    
    // Update in database if in production
    if (process.env.NODE_ENV === 'production' && schoolId) {
      supabase
        .from("schools")
        .update({ code: newCode })
        .eq("id", schoolId)
        .then(({ error }) => {
          if (error) console.error("Error updating school code:", error);
        });
    }
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
          <AdminNavbar className="mb-8" />

          {/* School Code Card */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>School Code Management</CardTitle>
              <CardDescription>
                Generate and manage the code teachers and students need to join your school
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SchoolCodeGenerator 
                onCodeGenerated={handleCodeGenerated}
              />
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
                  <Loader2 className="h-8 w-8 animate-spin text-learnable-blue" />
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
                        required
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
                    disabled={isSaving || !initialLoaded}
                    className="gradient-bg flex items-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : saveSuccess ? (
                      <>
                        <Check className="h-4 w-4" />
                        Saved!
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
