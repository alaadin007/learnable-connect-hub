
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/landing/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, PlusCircle, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Define the schema for our form
const studentProfileSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  date_of_birth: z.date({
    required_error: "Please select a date",
  }),
  subjects: z.array(
    z.object({
      name: z.string().min(2, "Subject name must be at least 2 characters"),
      board: z.string().optional(),
      level: z.string().optional(),
    })
  ).min(1, "Please add at least one subject"),
});

type StudentProfileFormValues = z.infer<typeof studentProfileSchema>;

const StudentSettings = () => {
  const { user, profile, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  // Create a form instance with default values
  const form = useForm<StudentProfileFormValues>({
    resolver: zodResolver(studentProfileSchema),
    defaultValues: {
      full_name: profile?.full_name || "",
      email: user?.email || "",
      date_of_birth: undefined,
      subjects: [{ name: "", board: "", level: "" }],
    },
  });

  // Fetch existing profile data if available
  useEffect(() => {
    const fetchStudentProfile = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from("student_profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (error) throw error;

        if (data) {
          form.reset({
            full_name: data.full_name || profile?.full_name || "",
            email: user?.email || "",
            date_of_birth: data.date_of_birth ? new Date(data.date_of_birth) : undefined,
            subjects: data.subjects || [{ name: "", board: "", level: "" }],
          });
        }
      } catch (error) {
        console.error("Error fetching student profile:", error);
      }
    };

    fetchStudentProfile();
  }, [user, profile, form]);

  // Redirect if user is not logged in
  useEffect(() => {
    if (!user) {
      navigate("/login", { state: { from: "/student/settings" } });
    }
  }, [user, navigate]);

  const onSubmit = async (data: StudentProfileFormValues) => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Update the student_profiles table
      const { error } = await supabase
        .from("student_profiles")
        .upsert({
          id: user.id,
          full_name: data.full_name,
          date_of_birth: data.date_of_birth.toISOString().split('T')[0],
          subjects: data.subjects,
        });

      if (error) throw error;

      // Also update the general profiles table for the name
      await updateProfile({ full_name: data.full_name });

      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const addSubject = () => {
    const subjects = form.getValues().subjects;
    form.setValue("subjects", [...subjects, { name: "", board: "", level: "" }]);
  };

  const removeSubject = (index: number) => {
    const subjects = form.getValues().subjects;
    if (subjects.length > 1) {
      form.setValue("subjects", subjects.filter((_, i) => i !== index));
    } else {
      toast.error("You need at least one subject");
    }
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow bg-learnable-super-light py-8">
        <div className="container mx-auto px-4">
          <div className="mb-6">
            <h1 className="text-3xl font-bold gradient-text mb-2">Student Settings</h1>
            <p className="text-learnable-gray">
              Update your personal information and study subjects
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>
                    Update your profile details and preferences
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <FormField
                        control={form.control}
                        name="full_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Your full name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input placeholder="Your email" {...field} disabled />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="date_of_birth"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Date of Birth</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      "pl-3 text-left font-normal",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    {field.value ? (
                                      format(field.value, "PPP")
                                    ) : (
                                      <span>Pick a date</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  disabled={(date) =>
                                    date > new Date() || date < new Date("1900-01-01")
                                  }
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h3 className="text-lg font-medium">Subjects</h3>
                          <Button 
                            type="button" 
                            onClick={addSubject} 
                            variant="outline"
                            size="sm"
                          >
                            <PlusCircle className="h-4 w-4 mr-2" />
                            Add Subject
                          </Button>
                        </div>
                        
                        {form.getValues().subjects.map((_, index) => (
                          <div key={index} className="p-4 border rounded-md space-y-3">
                            <div className="flex justify-between items-center">
                              <h4 className="font-medium">Subject {index + 1}</h4>
                              {form.getValues().subjects.length > 1 && (
                                <Button 
                                  type="button"
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => removeSubject(index)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              )}
                            </div>
                            
                            <FormField
                              control={form.control}
                              name={`subjects.${index}.name`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Subject Name</FormLabel>
                                  <FormControl>
                                    <Input placeholder="e.g., Biology" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name={`subjects.${index}.board`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Exam Board (if applicable)</FormLabel>
                                  <FormControl>
                                    <Input placeholder="e.g., AQA, Edexcel, AP" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name={`subjects.${index}.level`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Course Level (if applicable)</FormLabel>
                                  <FormControl>
                                    <Input placeholder="e.g., A-Level, GCSE, AP, IB" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        ))}
                      </div>

                      <Button 
                        type="submit" 
                        disabled={isLoading} 
                        className="w-full"
                      >
                        {isLoading ? "Updating..." : "Save Changes"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Account Information</CardTitle>
                  <CardDescription>Your account details</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Account Type</p>
                      <p>Student</p>
                    </div>
                    
                    {profile?.organization && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">School</p>
                        <p>{profile.organization.name}</p>
                      </div>
                    )}
                    
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Member Since</p>
                      <p>{user?.created_at ? format(new Date(user.created_at), 'PP') : 'N/A'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default StudentSettings;
