
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import DashboardLayout from '@/components/layout/DashboardLayout';
import TeacherList from '@/components/school-admin/TeacherList';
import TeacherInviteForm from '@/components/school-admin/TeacherInviteForm';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

const AdminTeachers = () => {
  const { user, profile, isSupervisor } = useAuth(); // Fix from isSuperviser to isSupervisor
  const [teachers, setTeachers] = useState<any[]>([]);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const fetchTeachers = async () => {
    if (!profile?.school_id) {
      toast.error("No school associated with your account");
      return;
    }
    
    setIsLoading(true);
    try {
      // Call the RPC to get teachers for a school
      const { data, error } = await supabase.rpc('get_teachers_for_school', {
        school_id_param: profile.school_id
      });
      
      if (error) throw error;
      
      setTeachers(data || []);
    } catch (error) {
      console.error("Error fetching teachers:", error);
      toast.error("Failed to load teachers");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleTeacherInvited = (email: string) => {
    toast.success(`Invitation sent to ${email}`);
    setShowInviteForm(false);
    fetchTeachers(); // Refresh the list to include the pending invitation
  };
  
  useEffect(() => {
    if (profile?.school_id) {
      fetchTeachers();
    }
  }, [profile?.school_id]);
  
  return (
    <DashboardLayout>
      <div className="container py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Teachers</h1>
          
          <Button 
            onClick={() => setShowInviteForm(!showInviteForm)}
            variant={showInviteForm ? "outline" : "default"}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            {showInviteForm ? "Cancel" : "Invite Teacher"}
          </Button>
        </div>
        
        {showInviteForm && (
          <div className="mb-6">
            <TeacherInviteForm 
              onInviteSent={handleTeacherInvited} 
              onCancel={() => setShowInviteForm(false)} 
            />
          </div>
        )}
        
        <Tabs defaultValue="active">
          <TabsList>
            <TabsTrigger value="active">Active Teachers</TabsTrigger>
            <TabsTrigger value="pending">Pending Invitations</TabsTrigger>
          </TabsList>
          
          <TabsContent value="active" className="pt-6">
            <TeacherList 
              teachers={teachers.filter(t => !t.is_invitation)} 
              onRefresh={fetchTeachers}
              isLoading={isLoading}
            />
          </TabsContent>
          
          <TabsContent value="pending" className="pt-6">
            <TeacherList 
              teachers={teachers.filter(t => t.is_invitation)} 
              onRefresh={fetchTeachers}
              isLoading={isLoading}
              isPending={true}
            />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AdminTeachers;
