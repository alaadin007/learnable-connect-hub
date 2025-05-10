
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
import { Plus, Copy, Mail, Loader2, Trash, Check, AlertCircle } from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { TeacherInvitation } from "@/utils/supabaseHelpers";

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
  const [isDeleting, setIsDeleting] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [activeTeachers, setActiveTeachers] = useState<any[]>([]);

  // Get the school ID from the profile
  const schoolId = profile?.school_id || profile?.organization?.id || localStorage.getItem('schoolId') || null;

  useEffect(() => {
    if (schoolId) {
      loadInvitations();
      loadActiveTeachers();
    }
  }, [schoolId]);

  const loadInvitations = async () => {
    if (!schoolId) {
      console.warn("School ID is not available.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("teacher_invitations")
        .select("*")
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      console.log("Teacher invitations:", data);
      setInvitations(data as TeacherInvitation[]);
    } catch (error: any) {
      toast.error(error.message || "Failed to load invitations");
    } finally {
      setIsLoading(false);
    }
  };

  const loadActiveTeachers = async () => {
    if (!schoolId) return;

    try {
      // Use the database function to get teachers for the school
      const { data, error } = await supabase.rpc('get_teachers_for_school', {
        school_id_param: schoolId
      });

      if (error) {
        throw error;
      }

      console.log("Active teachers:", data);
      setActiveTeachers(data || []);
    } catch (error: any) {
      console.error("Error loading teachers:", error);
      toast.error("Failed to load active teachers");
    }
  };

  const handleCreateInvitation = async () => {
    if (!schoolId) {
      toast.error("School ID is not available.");
      return;
    }

    // Basic email validation
    if (!email || !email.includes('@') || !email.includes('.')) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("invite-teacher", {
        body: {
          email,
          role,
          customMessage,
          schoolId
        },
      });

      if (error) {
        throw error;
      }

      toast.success("Invitation sent successfully!");
      loadInvitations(); // Reload invitations to reflect the new one
      setOpen(false); // Close the dialog
      setEmail(""); // Reset the email input
      setCustomMessage(""); // Reset the custom message
      setRole("teacher"); // Reset the role
    } catch (error: any) {
      console.error("Failed to create invitation:", error);
      toast.error(error.message || "Failed to create invitation");
    } finally {
      setIsCreating(false);
    }
  };

  const handleResendInvitation = async (invitation: TeacherInvitation) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("resend-teacher-invitation", {
        body: {
          invitationId: invitation.id,
        },
      });

      if (error) {
        throw error;
      }

      toast.success("Invitation resent successfully!");
      loadInvitations(); // Reload to update the expiration date
    } catch (error: any) {
      toast.error(error.message || "Failed to resend invitation");
    } finally {
      setIsLoading(false);
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

    setAlertOpen(true);
  };

  const confirmDeleteSelected = async () => {
    setIsDeleting(true);
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
      setIsDeleting(false);
      setAlertOpen(false);
    }
  };

  const getRoleBadgeClass = (role?: string) => {
    switch (role) {
      case 'admin':
        return "bg-blue-100 text-blue-800 border-blue-200";
      case 'teacher_supervisor':
        return "bg-purple-100 text-purple-800 border-purple-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getRoleDisplay = (role?: string) => {
    switch (role) {
      case 'admin':
        return "Admin";
      case 'teacher_supervisor':
        return "Supervisor";
      default:
        return "Teacher";
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Teacher Invitations</CardTitle>
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
                <Trash className="h-4 w-4 mr-1" />
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
                      placeholder="teacher@example.com"
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
                        <SelectItem value="teacher_supervisor">Teacher Supervisor</SelectItem>
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
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Loading invitations...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Select</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        No invitations found. Invite a teacher to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    invitations.map((invitation) => (
                      <TableRow key={invitation.id}>
                        <TableCell className="w-[50px]">
                          <Checkbox
                            checked={selectedInvitations.includes(invitation.id)}
                            onCheckedChange={() => handleCheckboxChange(invitation.id)}
                          />
                        </TableCell>
                        <TableCell>{invitation.email}</TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline"
                            className={getRoleBadgeClass(invitation.role)}
                          >
                            {getRoleDisplay(invitation.role)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={invitation.status === "accepted" ? "success" : 
                                  invitation.status === "expired" ? "destructive" : 
                                  "secondary"}
                            className={invitation.status === "accepted" ? "bg-green-100 text-green-800" : 
                                      invitation.status === "expired" ? "bg-red-100 text-red-800" : 
                                      "bg-yellow-100 text-yellow-800"}
                          >
                            {invitation.status === "pending" ? "Pending" : 
                            invitation.status === "accepted" ? "Accepted" : 
                            invitation.status === "expired" ? "Expired" : 
                            invitation.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(invitation.expires_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopyInvitationLink(invitation)}
                            >
                              <Copy className="h-4 w-4 mr-1" />
                              Copy Link
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleResendInvitation(invitation)}
                              disabled={invitation.status === "accepted" || isLoading}
                            >
                              <Mail className="h-4 w-4 mr-1" />
                              Resend
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active Teachers</CardTitle>
          <CardDescription>
            Teachers who have accepted invitations and joined your school
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeTeachers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No active teachers found. Teachers will appear here after they accept invitations.
                    </TableCell>
                  </TableRow>
                ) : (
                  activeTeachers.map((teacher) => (
                    <TableRow key={teacher.id}>
                      <TableCell>{teacher.full_name || "Unknown"}</TableCell>
                      <TableCell>{teacher.email}</TableCell>
                      <TableCell>
                        {teacher.is_supervisor ? (
                          <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200">
                            Supervisor
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-50 text-gray-800 border-gray-200">
                            Teacher
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(teacher.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-green-100 text-green-800">
                          <Check className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the selected invitations. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteSelected} disabled={isDeleting}>
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TeacherManagement;
