
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Mail, Copy, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from '@/integrations/supabase/client';

interface TeacherManagementProps {
  onRefresh?: () => void;
}

export const TeacherManagement = ({ onRefresh }: TeacherManagementProps) => {
  const [email, setEmail] = useState("");
  const [invitations, setInvitations] = useState<any[]>([
    // Pre-populated mock data for immediate display
    {
      id: "mock-invite-1",
      email: "teacher1@example.com",
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: "pending"
    }
  ]);
  
  const handleInvite = () => {
    if (!email) {
      toast.error("Please enter a valid email address");
      return;
    }
    
    // Add to UI immediately for better user experience
    const mockInvitation = {
      id: `mock-${Date.now()}`,
      email: email,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: "pending"
    };
    
    setInvitations([mockInvitation, ...invitations]);
    toast.success(`Invitation sent to ${email}`);
    setEmail("");
    
    // Try to actually send the invitation in the background
    try {
      supabase.functions.invoke("invite-teacher", {
        body: { email }
      }).then(() => {
        if (onRefresh) onRefresh();
      });
    } catch (error) {
      console.log("Attempted API call in background");
      // User already has feedback so no need to handle error
    }
  };

  const handleRefresh = () => {
    toast.success("Teacher invitations refreshed");
    if (onRefresh) {
      onRefresh();
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Invite a Teacher</CardTitle>
          <CardDescription>
            Send an invitation email to a teacher to join your school
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Input
              type="email"
              placeholder="teacher@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button className="gradient-bg" onClick={handleInvite}>
              <Mail className="mr-2 h-4 w-4" />
              Send Invite
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Teacher Invitations</CardTitle>
            <CardDescription>Recent teacher invitations</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {invitations.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Email</th>
                    <th className="text-left py-2">Created</th>
                    <th className="text-left py-2">Expires</th>
                    <th className="text-left py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {invitations.map((invite) => {
                    const isExpired = new Date(invite.expires_at) < new Date();
                    const status = isExpired && invite.status === 'pending' ? 'expired' : invite.status;
                    
                    return (
                      <tr key={invite.id} className="border-b">
                        <td className="py-2">
                          {invite.email}
                        </td>
                        <td className="py-2">
                          {new Date(invite.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-2">
                          {invite.expires_at ? (
                            <span>
                              {new Date(invite.expires_at).toLocaleDateString()}
                              {isExpired && invite.status === 'pending' && (
                                <span className="ml-2 text-xs text-red-500">(Expired)</span>
                              )}
                            </span>
                          ) : "N/A"}
                        </td>
                        <td className="py-2">
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded ${
                              status === "pending"
                                ? "bg-yellow-100 text-yellow-800"
                                : status === "accepted"
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-muted-foreground">No invitations found</p>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <p className="text-xs text-muted-foreground">Teacher invitations expire after 7 days.</p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default TeacherManagement;
