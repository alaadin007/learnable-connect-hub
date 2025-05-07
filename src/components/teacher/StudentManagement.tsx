
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { supabase, asSupabaseParam } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { 
  isValidObject, 
  safelyHandleResponse, 
  toStringStateAction 
} from '@/utils/supabaseHelpers';
import { useAuth } from "@/contexts/AuthContext";

interface StudentInvite {
  id: string;
  code: string;
  expires_at: string;
  created_at: string;
}

const StudentManagement = ({ schoolId, isLoading: parentLoading, schoolInfo }: { 
  schoolId: string | null;
  isLoading?: boolean;
  schoolInfo?: { name: string; code: string } | null;
}) => {
  const [invites, setInvites] = useState<StudentInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (schoolId) {
      fetchInvites();
    }
  }, [schoolId]);

  const fetchInvites = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('student_invites')
        .select('*')
        .eq('school_id', asSupabaseParam(schoolId))
        .order('created_at', { ascending: false });

      if (error) {
        toast.error('Failed to load invitation codes');
        return;
      }

      // Transform data to ensure type safety
      const safeInvites: StudentInvite[] = Array.isArray(data) 
        ? data
            .filter(item => isValidObject(item, ['id', 'code', 'expires_at', 'created_at']))
            .map(item => ({
              id: String(item.id),
              code: String(item.code || ''),
              expires_at: String(item.expires_at || ''),
              created_at: String(item.created_at || '')
            }))
        : [];

      setInvites(safeInvites);
    } catch (error) {
      console.error('Error fetching invites:', error);
      toast.error('Failed to load invitation codes');
    } finally {
      setLoading(false);
    }
  };

  const createInvite = async () => {
    try {
      setCreating(true);
      
      // Use the RPC function to generate a new invitation code
      const { data, error } = await supabase
        .rpc('create_student_invitation', { 
          school_id_param: schoolId 
        });

      if (error) {
        console.error("Error creating invitation:", error);
        toast.error('Failed to create invitation code');
        return;
      }

      // Refresh the list of invites
      fetchInvites();
      toast.success('New invitation code created!');
      
    } catch (error) {
      console.error('Error creating invite:', error);
      toast.error('Failed to create invitation code');
    } finally {
      setCreating(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Student Invitations</CardTitle>
        <CardDescription>
          Create invitation codes for students to join your school
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Button
            onClick={createInvite}
            disabled={creating || loading || !schoolId}
            className="w-full"
          >
            {creating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                Creating Invitation...
              </>
            ) : (
              'Create New Invitation Code'
            )}
          </Button>

          <Separator className="my-4" />

          {loading || parentLoading ? (
            <div className="py-4 text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Loading invitations...</p>
            </div>
          ) : invites.length > 0 ? (
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Active Invitation Codes</h3>
              <div className="overflow-hidden border rounded-md">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr className="text-xs">
                      <th className="px-4 py-2 text-left">Code</th>
                      <th className="px-4 py-2 text-left">Created</th>
                      <th className="px-4 py-2 text-left">Expires</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {invites.map(invite => (
                      <tr key={invite.id} className="text-sm hover:bg-muted/50">
                        <td className="px-4 py-3 font-medium">{invite.code}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatDate(invite.created_at)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatDate(invite.expires_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground">
                Share these codes with students to let them register and join your school.
              </p>
            </div>
          ) : (
            <p className="text-center py-4 text-muted-foreground">
              No invitation codes found. Create one to get started!
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default StudentManagement;
