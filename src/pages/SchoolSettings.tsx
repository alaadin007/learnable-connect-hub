
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/landing/Footer";
import AdminNavbar from '@/components/school-admin/AdminNavbar';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Save, Trash2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SchoolCodeGenerator from '@/components/school-admin/SchoolCodeGenerator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Define schema for form validation
const schoolSettingsSchema = z.object({
  name: z.string().min(2, { message: 'School name must be at least 2 characters' }),
  contact_email: z.string().email({ message: 'Please enter a valid email address' }),
  description: z.string().optional(),
});

type SchoolSettingsFormValues = z.infer<typeof schoolSettingsSchema>;

// Define school info type
interface SchoolInfo {
  id: string;
  name: string;
  code: string;
  contact_email: string;
  description: string | null;
  notifications_enabled: boolean;
}

// Define proper SchoolCodeGenerator props
interface SchoolCodeGeneratorProps {
  onCodeGenerated?: (code: string) => void;
}

const SchoolSettings = () => {
  const { user, profile } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRegeneratingCode, setIsRegeneratingCode] = useState(false);
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const navigate = useNavigate();

  // React-hook-form setup
  const form = useForm<SchoolSettingsFormValues>({
    resolver: zodResolver(schoolSettingsSchema),
    defaultValues: {
      name: '',
      contact_email: '',
      description: '',
    }
  });

  // Load school data on component mount
  useEffect(() => {
    // Redirect if not logged in or not a school admin
    if (!user || !profile || profile.user_type !== 'school_admin') {
      toast.error('You must be a school administrator to access this page.');
      navigate('/login');
      return;
    }

    const fetchSchoolData = async () => {
      setIsLoading(true);
      try {
        const schoolId = profile.school_id;

        if (!schoolId) {
          throw new Error('School ID not found');
        }

        // Get school info
        const { data, error } = await supabase
          .from('schools')
          .select('*')
          .eq('id', schoolId)
          .single();

        if (error) throw error;

        setSchoolInfo(data);
        setNotificationsEnabled(data.notifications_enabled !== false); // Default to true if field is null

        // Set form default values
        form.reset({
          name: data.name,
          contact_email: data.contact_email || '',
          description: data.description || '',
        });

      } catch (error: any) {
        console.error('Error fetching school data:', error);
        toast.error('Failed to load school settings');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSchoolData();
  }, [user, profile, navigate, form]);

  // Handle form submission
  const onSubmit = async (values: SchoolSettingsFormValues) => {
    if (!schoolInfo) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('schools')
        .update({
          name: values.name,
          contact_email: values.contact_email,
          description: values.description || null,
        })
        .eq('id', schoolInfo.id);

      if (error) throw error;

      toast.success('School settings updated successfully');
      
      // Update local state
      setSchoolInfo(prev => prev ? {
        ...prev,
        name: values.name,
        contact_email: values.contact_email,
        description: values.description || null,
      } : null);

    } catch (error: any) {
      console.error('Error updating school settings:', error);
      toast.error('Failed to update school settings');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle notifications toggle
  const handleNotificationsToggle = async (enabled: boolean) => {
    if (!schoolInfo) return;
    
    try {
      const { error } = await supabase
        .from('schools')
        .update({
          notifications_enabled: enabled,
        })
        .eq('id', schoolInfo.id);

      if (error) throw error;

      setNotificationsEnabled(enabled);
      toast.success(`Notifications ${enabled ? 'enabled' : 'disabled'} successfully`);
      
      // Update local state
      setSchoolInfo(prev => prev ? {
        ...prev,
        notifications_enabled: enabled,
      } : null);

    } catch (error: any) {
      console.error('Error updating notification settings:', error);
      toast.error('Failed to update notification settings');
      // Revert UI state since the API call failed
      setNotificationsEnabled(!enabled);
    }
  };

  // Handle school code regeneration
  const handleRegenerateCode = async () => {
    if (!schoolInfo) return;
    
    setIsRegeneratingCode(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-school-code', {
        body: {}
      });

      if (error) throw error;

      const newCode = data?.code;
      
      if (newCode) {
        toast.success('School code regenerated successfully');
        
        // Update local state
        setSchoolInfo(prev => prev ? {
          ...prev,
          code: newCode,
        } : null);
      }
    } catch (error: any) {
      console.error('Error regenerating school code:', error);
      toast.error('Failed to regenerate school code');
    } finally {
      setIsRegeneratingCode(false);
    }
  };

  // Handle school account deletion
  const handleDeleteSchool = async () => {
    if (!schoolInfo) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase.functions.invoke('delete-school-data', {
        body: { school_id: schoolInfo.id }
      });

      if (error) throw error;

      toast.success('School account and all associated data deleted successfully');
      
      // Sign out user and redirect to home
      await supabase.auth.signOut();
      navigate('/');

    } catch (error: any) {
      console.error('Error deleting school account:', error);
      toast.error('Failed to delete school account');
    } finally {
      setIsDeleting(false);
    }
  };

  // Properly typed handler for school code generation
  const handleCodeGenerated = (newCode: string) => {
    toast.success('School code updated successfully');
    
    // Update local state
    setSchoolInfo(prev => prev ? {
      ...prev,
      code: newCode,
    } : null);
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
              onClick={() => navigate('/admin', { state: { preserveContext: true } })}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Admin
            </Button>
            <h1 className="text-3xl font-bold gradient-text">School Settings</h1>
          </div>

          <AdminNavbar />

          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <p className="text-lg text-gray-500">Loading school settings...</p>
            </div>
          ) : (
            <Tabs defaultValue="general">
              <TabsList className="mb-6">
                <TabsTrigger value="general">General Settings</TabsTrigger>
                <TabsTrigger value="access">Access Control</TabsTrigger>
                <TabsTrigger value="danger">Danger Zone</TabsTrigger>
              </TabsList>

              <TabsContent value="general">
                <Card>
                  <CardHeader>
                    <CardTitle>School Information</CardTitle>
                    <CardDescription>
                      Update your school's basic information and settings
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>School Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter school name" {...field} />
                              </FormControl>
                              <FormDescription>
                                This is the name that will appear on all reports and communications.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="contact_email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Contact Email</FormLabel>
                              <FormControl>
                                <Input placeholder="contact@school.edu" {...field} />
                              </FormControl>
                              <FormDescription>
                                This email will be used for official communications.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>School Description (Optional)</FormLabel>
                              <FormControl>
                                <Input placeholder="Brief description of your school" {...field} />
                              </FormControl>
                              <FormDescription>
                                A short description that might appear in reports or dashboards.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex items-center justify-between space-y-0 pt-4">
                          <div className="space-y-0.5">
                            <Label htmlFor="notifications">Email Notifications</Label>
                            <FormDescription>
                              Receive email notifications about important events.
                            </FormDescription>
                          </div>
                          <Switch
                            id="notifications"
                            checked={notificationsEnabled}
                            onCheckedChange={handleNotificationsToggle}
                          />
                        </div>

                        <Button type="submit" disabled={isSaving} className="w-full gradient-bg">
                          {isSaving ? (
                            <>
                              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="mr-2 h-4 w-4" />
                              Save Changes
                            </>
                          )}
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="access">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <SchoolCodeGenerator onCodeGenerated={handleCodeGenerated} />
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>School Code</CardTitle>
                      <CardDescription>
                        Manage your school's access code
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="currentCode">Current School Code</Label>
                          <div className="flex mt-2">
                            <Input 
                              id="currentCode"
                              value={schoolInfo?.code || ''} 
                              readOnly
                              className="font-mono"
                            />
                          </div>
                          <p className="text-sm text-gray-500 mt-2">
                            This code is used by teachers and students to join your school.
                          </p>
                        </div>
                        
                        <Button 
                          onClick={handleRegenerateCode} 
                          variant="secondary" 
                          className="w-full"
                          disabled={isRegeneratingCode}
                        >
                          {isRegeneratingCode ? (
                            <>
                              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                              Regenerating...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="mr-2 h-4 w-4" />
                              Regenerate School Code
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="danger">
                <Card>
                  <CardHeader className="border-b border-red-100">
                    <CardTitle className="text-red-600">Danger Zone</CardTitle>
                    <CardDescription>
                      Actions here can permanently delete data and cannot be undone
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <Alert variant="destructive" className="mb-6">
                      <AlertTitle>Warning</AlertTitle>
                      <AlertDescription>
                        Deleting your school account will permanently remove all associated data, including teachers, students, courses, and assessments. This action cannot be undone.
                      </AlertDescription>
                    </Alert>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="w-full" disabled={isDeleting}>
                          {isDeleting ? (
                            <>
                              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                              Deleting...
                            </>
                          ) : (
                            <>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete School Account
                            </>
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete your school account and all associated data from our servers.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDeleteSchool} className="bg-red-600 hover:bg-red-700">
                            Delete School Account
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SchoolSettings;
