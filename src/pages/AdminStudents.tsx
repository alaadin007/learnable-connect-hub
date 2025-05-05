
import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/landing/Footer";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Mail,
  ArrowLeft,
  Copy,
  UserPlus,
  RefreshCw,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useQuery } from "@tanstack/react-query";

// Define the schema for student invite form
const addStudentSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }).optional(),
  method: z.enum(["email", "code"], {
    required_error: "Please select a method",
  }),
});

type AddStudentFormValues = z.infer<typeof addStudentSchema>;

type StudentInvite = {
  id: string;
  email: string | null;
  code: string | null;
  created_at: string;
  expires_at: string;
  status: string;
};

const AdminStudents = () => {
  const { user, profile, schoolId: authSchoolId } = useAuth();
  const navigate = useNavigate();
  const [isSending, setIsSending] = useState(false);
  const [generatedCode, setGeneratedCode] = useState("");
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [codeGenerationError, setCodeGenerationError] = useState<string | null>(null);

  // Get the schoolId properly
  const schoolId = authSchoolId || profile?.organization?.id || null;

  const form = useForm<AddStudentFormValues>({
    resolver: zodResolver(addStudentSchema),
    defaultValues: {
      email: "",
      method: "code",
    },
  });

  const selectedMethod = form.watch("method");

  // Use React Query to fetch invites with better error handling and caching
  const { 
    data: invites = [], 
    refetch: refreshInvites, 
    isLoading: isLoadingInvites,
    isError: isInvitesError,
    error: invitesError
  } = useQuery({
    queryKey: ['studentInvites', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      
      try {
        // Try to fetch from student_invites table
        const { data: studentInvites, error: studentInviteError } = await supabase
          .from("student_invites")
          .select("*")
          .eq("school_id", schoolId)
          .order("created_at", { ascending: false })
          .limit(10);

        if (studentInviteError) throw studentInviteError;
        
        if (studentInvites && studentInvites.length > 0) {
          return studentInvites as StudentInvite[];
        }

        // Fallback to teacher_invitations table for display
        const { data, error } = await supabase
          .from("teacher_invitations")
          .select("*")
          .eq("school_id", schoolId)
          .order("created_at", { ascending: false })
          .limit(10);

        if (error) throw error;

        return (data || []).map((invite) => ({
          id: invite.id,
          email: invite.email,
          code: null,
          created_at: invite.created_at,
          expires_at: invite.expires_at,
          status: invite.status,
        })) as StudentInvite[];
      } catch (error: any) {
        console.error("Error fetching student invites:", error);
        throw error;
      }
    },
    enabled: !!schoolId,
    staleTime: 30000, // Cache for 30 seconds
    refetchOnWindowFocus: false,
  });

  const onSubmit = async (values: AddStudentFormValues) => {
    if (!user || !schoolId) {
      toast.error("You must be logged in with a school account to invite students");
      return;
    }

    setIsSending(true);

    try {
      if (values.method === "email" && values.email) {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          throw new Error("You must be logged in");
        }

        const { data, error } = await supabase.functions.invoke("invite-student", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: {
            method: "email",
            email: values.email,
          },
        });

        if (error) throw error;

        toast.success(`Invitation sent to ${values.email}`);
        form.reset();
        setGeneratedCode(""); // clear code if any previously generated
      }

      // Refresh invites list
      refreshInvites();
    } catch (error: any) {
      console.error("Error inviting student:", error);
      toast.error(error.message || "Failed to invite student");
    } finally {
      setIsSending(false);
    }
  };

  const copyInviteCode = () => {
    if (!generatedCode) {
      toast.error("No code available to copy");
      return;
    }
    
    navigator.clipboard.writeText(generatedCode);
    toast.success("Code copied to clipboard!");
  };

  const generateInviteCode = async () => {
    if (!user) {
      toast.error("You must be logged in to generate a code");
      return;
    }

    setIsGeneratingCode(true);
    setCodeGenerationError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("You must be logged in");
      }
      
      // Call the fixed edge function
      const { data, error } = await supabase.functions.invoke("generate-student-code", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        }
      });

      if (error || !data || data.error) {
        throw new Error(error?.message || data?.error || "Failed to generate invitation code");
      }
      
      setGeneratedCode(data.code);
      toast.success("Student invitation code generated");
      
      // Refresh the invites list
      refreshInvites();
    } catch (error: any) {
      console.error("Error generating invite code:", error);
      toast.error(error.message || "Failed to generate invitation code");
      setCodeGenerationError(error.message || "Unknown error occurred");
    } finally {
      setIsGeneratingCode(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow bg-learnable-super-light py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="outline" size="sm" className="flex items-center gap-1" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-4 w-4" />
              Back to Admin
            </Button>
            <h1 className="text-3xl font-bold gradient-text">Student Management</h1>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Add New Student</CardTitle>
              <CardDescription>Invite a student via email or generate a code</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="method"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Method</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="flex flex-col space-y-1"
                          >
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="email" />
                              </FormControl>
                              <FormLabel className="font-normal">Invite via Email</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="code" />
                              </FormControl>
                              <FormLabel className="font-normal">Generate Invitation Code</FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormDescription>
                          {selectedMethod === "email"
                            ? "The student will receive an email invitation to join your school."
                            : "You will receive a code that you can share with students."}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {selectedMethod === "email" && (
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="student@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {selectedMethod === "code" && (
                    <div>
                      <Button
                        type="button"
                        className="gradient-bg w-full"
                        onClick={generateInviteCode}
                        disabled={isGeneratingCode}
                      >
                        {isGeneratingCode ? (
                          <>
                            <span>Generating...</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="mr-2 h-4 w-4" />
                            Generate Code
                          </>
                        )}
                      </Button>

                      {codeGenerationError && (
                        <Alert variant="destructive" className="mt-4">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Error</AlertTitle>
                          <AlertDescription>{codeGenerationError}</AlertDescription>
                        </Alert>
                      )}

                      {generatedCode && (
                        <div className="p-4 mt-4 bg-muted rounded-lg">
                          <p className="font-semibold mb-2">Invitation Code:</p>
                          <div className="flex items-center gap-2">
                            <code className="bg-background p-2 rounded border flex-1 text-center text-lg font-mono">
                              {generatedCode}
                            </code>
                            <Button type="button" variant="outline" size="sm" onClick={copyInviteCode}>
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">
                            Share this code with students to join your school
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedMethod === "email" && (
                    <Button type="submit" className="gradient-bg" disabled={isSending}>
                      {isSending ? "Sending..." : (
                        <>
                          <Mail className="mr-2 h-4 w-4" />
                          Send Invitation
                        </>
                      )}
                    </Button>
                  )}
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Student Invitations</CardTitle>
                <CardDescription>Recent student invitations and codes</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => refreshInvites()} className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {isLoadingInvites && (
                <div className="flex justify-center items-center py-4">
                  <p>Loading invitations...</p>
                </div>
              )}
              
              {isInvitesError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>
                    {invitesError instanceof Error ? invitesError.message : "Failed to load invitations"}
                  </AlertDescription>
                </Alert>
              )}
              
              {!isLoadingInvites && !isInvitesError && invites.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email/Code</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invites.map((invite) => {
                        const isExpired = new Date(invite.expires_at) < new Date();
                        const status = isExpired && invite.status === 'pending' ? 'expired' : invite.status;
                        
                        return (
                          <TableRow key={invite.id}>
                            <TableCell>
                              {invite.email || (
                                <code className="bg-muted p-1 rounded text-xs font-mono">
                                  {invite.code || "N/A"}
                                </code>
                              )}
                            </TableCell>
                            <TableCell>{new Date(invite.created_at).toLocaleDateString()}</TableCell>
                            <TableCell>
                              {invite.expires_at ? (
                                <span>
                                  {new Date(invite.expires_at).toLocaleDateString()}
                                  {isExpired && invite.status === 'pending' && (
                                    <span className="ml-2 text-xs text-red-500">(Expired)</span>
                                  )}
                                </span>
                              ) : "N/A"}
                            </TableCell>
                            <TableCell>
                              <span
                                className={`text-xs font-medium px-2 py-0.5 rounded ${
                                  status === "pending"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : status === "accepted" || status === "used"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : !isLoadingInvites && !isInvitesError ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No invitations found. Create one above.</p>
                </div>
              ) : null}
            </CardContent>
            <CardFooter>
              <p className="text-xs text-muted-foreground">Student invitations expire after 7 days.</p>
            </CardFooter>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminStudents;
