
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
import { Plus, Copy, Mail, Loader2, AlertCircle } from "lucide-react";
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
  DialogClose,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase, isTestAccount } from "@/integrations/supabase/client";

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
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("teacher");
  const [customMessage, setCustomMessage] = useState("");
  const [open, setOpen] = useState(false);
  const [selectedInvitations, setSelectedInvitations] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  // Get the school ID from the profile
  const schoolId = profile?.organization?.id || null;
  // Check if this is a test account
  const isTestSchool = schoolId ? schoolId.startsWith('test-') : false;

  useEffect(() => {
    if (schoolId) {
      loadInvitations();
    } else {
      setInvitations([]);
      setIsLoading(false);
      setLoadingError("School ID is not available. Please make sure you are logged in as a school administrator.");
    }
  }, [schoolId]);

  const loadInvitations = async () => {
    if (!schoolId) {
      console.warn("School ID is not available.");
      setLoadingError("School ID is not available");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadingError(null);
    
    try {
      // Handle test accounts differently to prevent RLS policy issues
      if (isTestSchool || (profile && profile.email && isTestAccount(profile.email))) {
        console.log("Using mock data for test school:", schoolId);
        // For test accounts, return mock data instead of querying the database
        const mockInvitations: TeacherInvitation[] = [
          {
            id: "test-invitation-1",
            email: "test.teacher1@example.com",
            status: "pending",
            invitation_token: "test-token-1",
            school_id: schoolId,
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            created_by: "test-school-0"
          },
          {
            id: "test-invitation-2",
            email: "test.teacher2@example.com",
            status: "accepted",
            invitation_token: "test-token-2",
            school_id: schoolId,
            created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            expires_at: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
            created_by: "test-school-0"
          }
        ];
        
        setInvitations(mockInvitations);
        setIsLoading(false);
      } else {
        // For real accounts, query the database
        const { data, error } = await supabase
          .from("teacher_invitations")
          .select("id, email, status, invitation_token, school_id, created_at, expires_at, created_by")
          .eq("school_id", schoolId)
          .order("created_at", { ascending: false });

        if (error) {
          throw error;
        }

        console.log("Teacher invitations loaded:", data);
        setInvitations(data as TeacherInvitation[]);
        setIsLoading(false);
      }
    } catch (error: any) {
      console.error("Error loading invitations:", error);
      setLoadingError(error.message || "Failed to load invitations");
      setIsLoading(false);
      toast.error("Error loading teacher invitations. Please try refreshing the page.");
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
      // Handle test accounts differently
      if (isTestSchool || (profile && profile.email && isTestAccount(profile.email))) {
        // For test accounts, simulate invitation creation
        const newInvitation: TeacherInvitation = {
          id: `test-invitation-${Date.now()}`,
          email,
          status: "pending",
          invitation_token: `test-token-${Date.now()}`,
          school_id: schoolId,
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          created_by: profile?.id || "test-user",
          role
        };
        
        setInvitations(prev => [newInvitation, ...prev]);
        toast.success("Test invitation created successfully!");
      } else {
        // For real accounts, use the edge function
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
        // Reload invitations after a short delay to ensure DB consistency
        setTimeout(() => {
          loadInvitations();
        }, 1000);
      }
      
      setEmail("");
      setCustomMessage("");
      setOpen(false);
    } catch (error: any) {
      console.error("Error creating invitation:", error);
      toast.error(error.message || "Failed to create invitation");
    } finally {
      setIsCreating(false);
    }
  };

  const handleResendInvitation = async (invitation: TeacherInvitation) => {
    try {
      // Handle test accounts differently
      if (isTestSchool || (profile && profile.email && isTestAccount(profile.email))) {
        // For test accounts, just show a success message
        toast.success("Test invitation resent successfully!");
      } else {
        // For real accounts, use the edge function
        const { error } = await supabase.functions.invoke("resend-teacher-invitation", {
          body: {
            invitationId: invitation.id,
          },
        });

        if (error) {
          throw error;
        }

        toast.success("Invitation resent successfully!");
      }
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

    try {
      // Handle test accounts differently
      if (isTestSchool || (profile && profile.email && isTestAccount(profile.email))) {
        // For test accounts, filter out selected invitations from state
        setInvitations(prev => prev.filter(inv => !selectedInvitations.includes(inv.id)));
        toast.success("Selected test invitations deleted successfully!");
      } else {
        // For real accounts, delete from the database
        const { error } = await supabase
          .from("teacher_invitations")
          .delete()
          .in("id", selectedInvitations);

        if (error) {
          throw error;
        }

        toast.success("Selected invitations deleted successfully!");
        loadInvitations();
      }
      
      setSelectedInvitations([]);
      setSelectAll(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete invitations");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Teacher Management</CardTitle>
          <CardDescription>
            Loading teacher invitations...
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="mt-2 text-muted-foreground">Loading invitations...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Teacher Management</CardTitle>
        <CardDescription>
          Manage teacher invitations for your school
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex justify-between items-center flex-wrap gap-2">
          <div>
            <Label htmlFor="selectAll" className="mr-2 inline-flex items-center">
              <Checkbox
                id="selectAll"
                checked={selectAll}
                onCheckedChange={handleSelectAllChange}
                disabled={invitations.length === 0}
                className="mr-2"
              />
              <span>Select All</span>
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
                    placeholder="teacher@school.edu"
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
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
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
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error loading invitations</AlertTitle>
            <AlertDescription>{loadingError}</AlertDescription>
            <Button onClick={loadInvitations} className="mt-2" size="sm" variant="outline">
              Retry
            </Button>
          </Alert>
        )}
        
        {invitations.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableCaption>List of teacher invitations for your school</TableCaption>
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
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyInvitationLink(invitation)}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Copy Link
                        </Button>
                        {invitation.status === "pending" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResendInvitation(invitation)}
                          >
                            <Mail className="mr-2 h-4 w-4" />
                            Resend
                          </Button>
                        )}
                      </div>
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
