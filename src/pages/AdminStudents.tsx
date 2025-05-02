
import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/landing/Footer";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Mail, UserPlus, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

// Define the schema for student invite form
const addStudentSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  method: z.enum(["invite", "code"], {
    required_error: "Please select a method",
  }),
});

type AddStudentFormValues = z.infer<typeof addStudentSchema>;

type StudentInvite = {
  id: string;
  email: string;
  code: string;
  created_at: string;
  expires_at: string;
  status: string;
};

const AdminStudents = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [invites, setInvites] = useState<StudentInvite[]>([]);
  const [generatedCode, setGeneratedCode] = useState("");

  const form = useForm<AddStudentFormValues>({
    resolver: zodResolver(addStudentSchema),
    defaultValues: {
      email: "",
      method: "invite",
    },
  });
  
  const selectedMethod = form.watch("method");

  // Load student invites
  useEffect(() => {
    const fetchInvites = async () => {
      try {
        const { data, error } = await supabase
          .from("student_invites")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setInvites(data || []);
      } catch (error: any) {
        console.error("Error fetching student invites:", error);
        toast.error("Failed to load student invites");
      }
    };

    fetchInvites();
  }, []);

  const onSubmit = async (values: AddStudentFormValues) => {
    if (!user) return;
    
    setIsLoading(true);
    
    try {
      if (values.method === "invite") {
        // Call the invite-student edge function
        const { data, error } = await supabase.functions.invoke("generate-student-invite", {
          body: { method: "email", email: values.email }
        });

        if (error) throw new Error(error.message);
        
        toast.success(`Invitation sent to ${values.email}`);
        form.reset();
      } else {
        // Generate invite code
        const { data, error } = await supabase.functions.invoke("generate-student-invite", {
          body: { method: "code" }
        });

        if (error) throw new Error(error.message);
        
        setGeneratedCode(data.code);
        toast.success("Student invitation code generated");
      }
      
      // Refresh the invites list
      const { data: updatedInvites } = await supabase
        .from("student_invites")
        .select("*")
        .order("created_at", { ascending: false });

      if (updatedInvites) {
        setInvites(updatedInvites);
      }
      
    } catch (error: any) {
      console.error("Error inviting student:", error);
      toast.error(error.message || "Failed to invite student");
    } finally {
      setIsLoading(false);
    }
  };

  const copyInviteCode = () => {
    navigator.clipboard.writeText(generatedCode);
    toast.success("Code copied to clipboard!");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow bg-learnable-super-light py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4 mb-6">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-1"
              onClick={() => navigate('/admin')}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Admin
            </Button>
            <h1 className="text-3xl font-bold gradient-text">Student Management</h1>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Add New Student</CardTitle>
              <CardDescription>
                Invite a student via email or generate a code
              </CardDescription>
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
                            defaultValue={field.value}
                            className="flex flex-col space-y-1"
                          >
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="invite" />
                              </FormControl>
                              <FormLabel className="font-normal">
                                Invite via Email
                              </FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="code" />
                              </FormControl>
                              <FormLabel className="font-normal">
                                Generate Invitation Code
                              </FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormDescription>
                          {selectedMethod === "invite" 
                            ? "The student will receive an email invitation to join your school." 
                            : "You will receive a code that you can share with students."}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {selectedMethod === "invite" && (
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
                  
                  {generatedCode && selectedMethod === "code" && (
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="font-semibold mb-2">Invitation Code:</p>
                      <div className="flex items-center gap-2">
                        <code className="bg-background p-2 rounded border flex-1 text-center text-lg font-mono">
                          {generatedCode}
                        </code>
                        <Button type="button" variant="outline" size="sm" onClick={copyInviteCode}>
                          Copy
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        Share this code with students to join your school
                      </p>
                    </div>
                  )}
                  
                  <Button 
                    type="submit" 
                    className="gradient-bg" 
                    disabled={isLoading}
                  >
                    {selectedMethod === "invite" ? (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        {isLoading ? "Sending..." : "Send Invitation"}
                      </>
                    ) : (
                      <>
                        <UserPlus className="mr-2 h-4 w-4" />
                        {isLoading ? "Generating..." : "Generate Code"}
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
          
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Student Invitations</CardTitle>
              <CardDescription>
                Recent student invitations and codes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {invites.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-1">Email/Code</th>
                        <th className="text-left py-2 px-1">Created</th>
                        <th className="text-left py-2 px-1">Expires</th>
                        <th className="text-left py-2 px-1">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invites.map((invite) => (
                        <tr key={invite.id} className="border-b hover:bg-muted/50">
                          <td className="py-2 px-1">
                            {invite.email || 
                             <code className="bg-muted p-1 rounded text-xs font-mono">
                               {invite.code}
                             </code>
                            }
                          </td>
                          <td className="py-2 px-1">
                            {new Date(invite.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-2 px-1">
                            {new Date(invite.expires_at).toLocaleDateString()}
                          </td>
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
            <CardFooter>
              <p className="text-xs text-muted-foreground">
                Student invitations expire after 7 days.
              </p>
            </CardFooter>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminStudents;
