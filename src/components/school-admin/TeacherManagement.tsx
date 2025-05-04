
import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plus, Copy, Mail, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";

// Define TeacherInvitation type if not imported
export interface TeacherInvitation {
  id: string;
  email: string;
  status: string;
  invitation_token: string;
  school_id: string;
  created_at: string;
  expires_at: string;
  created_by: string;
  role?: string;
  error?: any;
}

// Update component to use TeacherInvitation type
const TeacherManagement = () => {
  const { profile } = useAuth();
  const [invitations, setInvitations] = useState<TeacherInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("teacher");
  const [customMessage, setCustomMessage] = useState("");
  const [open, setOpen] = useState(false);
  const [selectedInvitations, setSelectedInvitations] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  // Get the school ID from the profile
  const schoolId = profile?.organization?.id || null;

  useEffect(() => {
    if (schoolId) {
      loadInvitations();
    } else {
      setIsLoading(false);
      setInvitations([]);
    }
  }, [schoolId]);

  const loadInvitations = async () => {
    if (!schoolId) {
      console.warn("School ID is not available.");
      setIsLoading(false);
      setLoadingError("School ID is not available");
      return;
    }

    setIsLoading(true);
    setLoadingError(null);
    
    try {
      // Modify the query to NOT include 'role' since it doesn't exist in the table
      const { data, error } = await supabase
        .from("teacher_invitations")
        .select("id, email, status, invitation_token, school_id, created_at, expires_at, created_by")
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      // Safely cast the data to our TeacherInvitation type
      setInvitations(data as TeacherInvitation[]);
    } catch (error: any) {
      console.error("Error loading invitations:", error);
      setLoadingError(error.message || "Failed to load invitations");
      toast.error("Error loading teacher invitations. Please try refreshing the page.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateInvitation = async () => {
    if (!schoolId) {
      toast.error("School ID is not available.");
      return;
    }

    if (!email) {
      toast.error("Email is required");
      return;
    }

    setIsCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("invite-teacher", {
        body: {
          email,
          role,
          schoolId,
          customMessage,
        },
      });

      if (error) {
        throw error;
      }

      toast.success("Invitation sent successfully!");
      setEmail("");
      setCustomMessage("");
      setOpen(false);
      
      // Reload invitations after a short delay to ensure DB consistency
      setTimeout(() => {
        loadInvitations();
      }, 1000);
      
    } catch (error: any) {
      console.error("Error creating invitation:", error);
      toast.error(error.message || "Failed to create invitation");
    } finally {
      setIsCreating(false);
    }
  };

  const handleResendInvitation = async (invitation: TeacherInvitation) => {
    try {
      const { error } = await supabase.functions.invoke("resend-teacher-invitation", {
        body: {
          invitationId: invitation.id,
        },
      });

      if (error) {
        throw error;
      }

      toast.success("Invitation resent successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to resend invitation");
    }
  };

  const handleCopyInvitationLink = (invitation: TeacherInvitation) => {
    const invitationLink = `${window.location.origin}/accept-invitation/${invitation.invitation_token}`;
    navigator.clipboard.writeText(invitationLink);
    toast.success("Invitation link copied to clipboard!");
  };

  const handleCheckboxChange = (invitationId: string) => {
    setSelectedInvitations((prevSelected) => {
      if (prevSelected.includes(invitationId)) {
        return prevSelected.filter((id) => id !== invitationId);
      } else {
        return [...prevSelected, invitationId];
      }
    });
  };

  const handleSelectAllChange = () => {
    setSelectAll((prevSelectAll) => {
      if (!prevSelectAll) {
        const allInvitationIds = invitations.map((invitation) => invitation.id);
        setSelectedInvitations(allInvitationIds);
        return true;
      } else {
        setSelectedInvitations([]);
        return false;
      }
    });
  };

  const handleDeleteSelected = async () => {
    if (selectedInvitations.length === 0) {
      toast.error("No invitations selected.");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("teacher_invitations")
        .delete()
        .in("id", selectedInvitations);

      if (error) {
        throw error;
      }

      toast.success("Selected invitations deleted successfully!");
      loadInvitations();
      setSelectedInvitations([]);
      setSelectAll(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete invitations");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Teacher Management</CardTitle>
        <CardDescription>
          Manage teacher invitations for your school
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex justify-between items-center">
          <div>
            <Label htmlFor="selectAll" className="mr-2">
              <Checkbox
                id="selectAll"
                checked={selectAll}
                onCheckedChange={handleSelectAllChange}
                disabled={invitations.length === 0}
              />
              <span className="ml-2">Select All</span>
            </Label>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteSelected}
              disabled={selectedInvitations.length === 0}
              className="ml-4"
            >
              Delete Selected
            </Button>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Invite Teacher
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Invite a Teacher</DialogTitle>
                <DialogDescription>
                  Send an invitation to a teacher to join your school.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">
                    Email
                  </Label>
                  <Input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="role" className="text-right">
                    Role
                  </Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="teacher">Teacher</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label htmlFor="message" className="text-right mt-2">
                    Custom Message
                  </Label>
                  <Textarea
                    id="message"
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    className="col-span-3"
                    placeholder="Add a personal message to the invitation"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" onClick={handleCreateInvitation} disabled={isCreating}>
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Send Invitation"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        
        {loadingError && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-4">
            <p className="text-red-700 font-medium">Error loading invitations</p>
            <p className="text-red-600 text-sm mt-1">{loadingError}</p>
            <Button onClick={loadInvitations} className="mt-2" size="sm" variant="outline">
              Retry
            </Button>
          </div>
        )}
        
        {isLoading ? (
          <div className="py-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p>Loading invitations...</p>
          </div>
        ) : invitations.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Select</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell className="w-[50px]">
                      <Checkbox
                        checked={selectedInvitations.includes(invitation.id)}
                        onCheckedChange={() => handleCheckboxChange(invitation.id)}
                      />
                    </TableCell>
                    <TableCell>{invitation.email}</TableCell>
                    <TableCell>{invitation.role || "teacher"}</TableCell>
                    <TableCell>
                      {invitation.status === "pending" ? (
                        <Badge variant="secondary">Pending</Badge>
                      ) : invitation.status === "accepted" ? (
                        <Badge variant="default">Accepted</Badge>
                      ) : (
                        <Badge variant="destructive">Rejected</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyInvitationLink(invitation)}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Copy Link
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleResendInvitation(invitation)}
                        disabled={invitation.status !== "pending"}
                      >
                        <Mail className="mr-2 h-4 w-4" />
                        Resend
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 border border-dashed rounded-md">
            <p className="text-muted-foreground mb-4">No teacher invitations found.</p>
            <p className="text-sm text-muted-foreground mb-4">
              Invite teachers to join your school by clicking the "Invite Teacher" button.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TeacherManagement;
