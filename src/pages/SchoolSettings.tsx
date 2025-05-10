import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import Footer from '@/components/landing/Footer';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import SchoolCodeGenerator from '@/components/school-admin/SchoolCodeGenerator';
import SchoolCodeManager from '@/components/school-admin/SchoolCodeManager';

const SchoolSettings = () => {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    contactEmail: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate('/login');
        return;
      }
      
      if (profile?.user_type !== 'school_admin' && profile?.user_type !== 'teacher_supervisor') {
        toast.error("You don't have access to this page");
        navigate('/dashboard');
        return;
      }
      
      // Load school data
      loadSchoolData();
    }
  }, [loading, user, profile, navigate]);

  const loadSchoolData = async () => {
    try {
      // Get school information
      const schoolId = profile?.school_id;
      if (!schoolId) {
        throw new Error("No school associated with this account");
      }
      
      // Call the RPC to get school info
      const { data: schoolInfo, error: schoolError } = await supabase.rpc(
        'get_school_by_id',
        { school_id_param: schoolId }
      );
      
      if (schoolError) throw schoolError;
      
      if (schoolInfo && schoolInfo.length > 0) {
        const schoolData = schoolInfo[0];
        setFormData({
          name: schoolData.name || '',
          code: schoolData.code || '',
          contactEmail: schoolData.contact_email || ''
        });
      }
    } catch (error) {
      console.error("Error loading school data:", error);
      toast.error("Failed to load school data");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      // Update school information
      const schoolId = profile?.school_id;
      if (!schoolId) {
        throw new Error("No school associated with this account");
      }
      
      const { error: updateError } = await supabase
        .from('schools')
        .update({
          name: formData.name,
          contact_email: formData.contactEmail
        })
        .eq('id', schoolId);
      
      if (updateError) throw updateError;
      
      toast.success("School settings updated successfully");
    } catch (error) {
      console.error("Error updating school settings:", error);
      toast.error("Failed to update school settings");
    } finally {
      setIsSaving(false);
    }
  };

  // Function to handle code generation
  const handleCodeGenerated = (newCode: string) => {
    // Add the code to the UI or show a toast
    toast.success(`New school code generated: ${newCode}`);
    // Update the school code in the form
    setFormData(prev => ({ ...prev, code: newCode }));
  };

  return (
    <DashboardLayout>
      <div className="container py-6">
        <h1 className="text-2xl font-bold mb-6">School Settings</h1>
        
        <div className="grid gap-6">
          {/* School Information Form */}
          <Card>
            <CardHeader>
              <CardTitle>School Information</CardTitle>
              <CardDescription>
                Update your school's information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">School Name</Label>
                  <Input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter school name"
                  />
                </div>
                <div>
                  <Label htmlFor="contactEmail">Contact Email</Label>
                  <Input
                    type="email"
                    id="contactEmail"
                    name="contactEmail"
                    value={formData.contactEmail}
                    onChange={handleInputChange}
                    placeholder="Enter contact email"
                  />
                </div>
                <Button onClick={handleSaveSettings} disabled={isSaving} className="w-full">
                  {isSaving ? "Saving..." : "Save Settings"}
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* School Code Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pass the onCodeGenerated prop properly */}
            <SchoolCodeGenerator onCodeGenerated={handleCodeGenerated} />
            <SchoolCodeManager onCodeGenerated={handleCodeGenerated} />
          </div>
          
          {/* Additional Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Advanced Settings</CardTitle>
              <CardDescription>
                Configure advanced settings for your school
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center py-6 text-gray-500">
                Advanced settings coming soon. You'll be able to configure domain settings, integrations, and more.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SchoolSettings;
