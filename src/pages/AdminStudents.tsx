
import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/landing/Footer";
import {
  Card,
  CardContent,
  CardDescription,
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
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import StudentInviteList from "@/components/school-admin/StudentInviteList";
import { useQuery } from "@tanstack/react-query";
import { generateStudentInviteCode, getStudentInvites } from "@/utils/schoolUtils";
import { supabase } from "@/integrations/supabase/client";

// Define the schema for student invite form
const addStudentSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }).optional(),
  method: z.enum(["email", "code"], {
    required_error: "Please select a method",
  }),
});

type AddStudentFormValues = z.infer<typeof addStudentSchema>;

const AdminStudents = () => {
  const { user, profile, schoolId: authSchoolId } = useAuth();
  const navigate = useNavigate();
  const [isSending, setIsSending] = useState(false);
  const [generatedCode, setGeneratedCode] = useState("");

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
      const { data, error } = await getStudentInvites();
      
      if (error) {
        throw new Error(error);
      }
      
      return data || [];
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
        // Direct database operation to add email invitation
        const { error } = await supabase
          .from("student_invites")
          .insert({
            school_id: schoolId,
            email: values.email,
            status: "pending",
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
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

    try {
      // Use the database function to generate a code
      const { code, error } = await generateStudentInviteCode();
      
      if (error) {
        throw new Error(error);
      }
      
      setGeneratedCode(code);
      toast.success("Student invitation code generated");
      
      // Refresh the invites list
      refreshInvites();
    } catch (error: any) {
      console.error("Error generating invite code:", error);
      toast.error(error.message || "Failed to generate invitation code");
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
                      >
                        <UserPlus className="mr-2 h-4 w-4" />
                        Generate Code
                      </Button>

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
                      {isSending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
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

          <div className="mt-6">
            <StudentInviteList
              invites={invites}
              isLoading={isLoadingInvites}
              isError={isInvitesError}
              error={invitesError instanceof Error ? invitesError : null}
              onRefresh={refreshInvites}
            />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminStudents;
