
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { asSupabaseParam, isValidObject, safelyCastData } from '@/utils/supabaseHelpers';
import { useAuth } from "@/contexts/AuthContext";

interface TeacherInvite {
  id: string;
  email: string;
  status: string;
  created_at: string;
  expires_at: string;
}

const TeacherManagement = () => {
  const [email, setEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [invitations, setInvitations] = useState<TeacherInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    try {
      setLoading(true);
      if (!user?.id) {
        toast.error("Could not determine user ID");
        return;
      }

      const { data: schoolId, error: schoolIdError } = await supabase
        .rpc("get_user_school_id");

      if (schoolIdError || !schoolId) {
        toast.error("Could not determine your school");
        return;
      }

      const response = await supabase
        .from('teacher_invitations')
        .select('*')
        .eq('school_id', asSupabaseParam(schoolId))
        .order('created_at', { ascending: false });

      if (response.error) {
        console.error('Error fetching invitations:', response.error);
        toast.error('Failed to load teacher invitations');
        setInvitations([]);
      } else {
        const validInvites: TeacherInvite[] = [];
        
        if (Array.isArray(response.data)) {
          for (const item of response.data) {
            // Safely check if each item is valid
            if (item && isValidObject(item, [
              'id', 'email', 'status', 'created_at', 'expires_at'
            ])) {
              validInvites.push({
                id: String(item.id),
                email: String(item.email),
                status: String(item.status),
                created_at: String(item.created_at),
                expires_at: String(item.expires_at)
              });
            }
          }
        }
        
        setInvitations(validInvites);
      }
    } catch (error) {
      console.error('Error fetching invitations:', error);
      toast.error('Failed to load teacher invitations');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!email) {
      toast.error("Please enter an email address");
      return;
    }

    setInviting(true);
    try {
      const { data, error } = await supabase
        .rpc("invite_teacher", {
          teacher_email: email
        });

      if (error) throw error;
      
      toast.success(`Invitation sent to ${email}`);
      setEmail('');
      await fetchInvitations(); // Refresh the invitations list
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "An error occurred");
    } finally {
      setInviting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Invite New Teacher</CardTitle>
        <CardDescription>
          Send an invitation to a teacher to join your school.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email Address
            </label>
            <Input
              id="email"
              type="email"
              placeholder="teacher@school.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>
      </CardContent>
      <Separator />
      <CardFooter className="flex justify-between pt-4">
        <Button variant="outline" onClick={() => setEmail('')}>
          Clear
        </Button>
        <Button 
          onClick={handleInvite} 
          disabled={!email || inviting}
        >
          {inviting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
              Sending Invitation...
            </>
          ) : (
            'Send Invitation'
          )}
        </Button>
      </CardFooter>

      <Separator className="my-4" />
      
      <CardHeader>
        <CardTitle>Teacher Invitations</CardTitle>
        <CardDescription>
          Pending and accepted teacher invitations
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-center py-4">Loading invitations...</p>
        ) : invitations.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-1">Email</th>
                  <th className="text-left py-2 px-1">Sent</th>
                  <th className="text-left py-2 px-1">Expires</th>
                  <th className="text-left py-2 px-1">Status</th>
                </tr>
              </thead>
              <tbody>
                {invitations.map((invite) => (
                  <tr key={invite.id} className="border-b hover:bg-muted/50">
                    <td className="py-2 px-1">{invite.email}</td>
                    <td className="py-2 px-1">{formatDate(invite.created_at)}</td>
                    <td className="py-2 px-1">{formatDate(invite.expires_at)}</td>
                    <td className="py-2 px-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                        invite.status === "pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : invite.status === "accepted"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}>
                        {invite.status.charAt(0).toUpperCase() + invite.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted-foreground">No invitations found.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default TeacherManagement;
