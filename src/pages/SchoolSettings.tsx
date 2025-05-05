import React, { useState, useEffect } from "react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { ArrowLeft, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// Define the schema for school settings form
const schoolSettingsSchema = z.object({
  name: z.string().min(2, {
    message: "School name must be at least 2 characters.",
  }),
  description: z.string().optional(),
  contactEmail: z.string().email({
    message: "Please enter a valid email address.",
  }),
});

type SchoolSettingsFormValues = z.infer<typeof schoolSettingsSchema>;

const SchoolSettings = () => {
  const { user, profile, schoolId } = useAuth();
  const navigate = useNavigate();
  const [isUpdating, setIsUpdating] = useState(false);
  const [initialValues, setInitialValues] = useState<SchoolSettingsFormValues | null>(null);

  const form = useForm<SchoolSettingsFormValues>({
    resolver: zodResolver(schoolSettingsSchema),
    defaultValues: {
      name: "",
      description: "",
      contactEmail: "",
    },
    mode: "onChange",
  });

  useEffect(() => {
    // Set initial values when the component mounts and schoolId is available
    if (schoolId) {
      const loadSchoolInfo = async () => {
        try {
          const { data, error } = await supabase
            .from("schools")
            .select("*")
            .eq("id", schoolId)
            .single();

          if (error) throw error;

          if (data) {
            const initialData: SchoolSettingsFormValues = {
              name: data.name || "",
              description: data.description || "",
              contactEmail: data.contact_email || "",
            };
            form.reset(initialData);
            setInitialValues(initialData);
          }
        } catch (error: any) {
          console.error("Error fetching school info:", error);
          toast.error(error.message || "Failed to load school information");
        }
      };

      loadSchoolInfo();
    }
  }, [schoolId, form]);

  const refreshSchoolInfo = async () => {
    try {
      const { data, error } = await supabase
        .from("schools")
        .select("*")
        .eq("id", schoolId)
        .single();

      if (error) throw error;

      if (data) {
        const initialData: SchoolSettingsFormValues = {
          name: data.name || "",
          description: data.description || "",
          contactEmail: data.contact_email || "",
        };
        form.reset(initialData);
        setInitialValues(initialData);
      }
    } catch (error: any) {
      console.error("Error fetching school info:", error);
      toast.error(error.message || "Failed to load school information");
    }
  };

  const handleUpdateBasicInfo = async () => {
    try {
      setIsUpdating(true);
      
      // Update school info
      const { error } = await supabase
        .from("schools")
        .update({
          name: form.getValues().name,
          description: form.getValues().description,
          contact_email: form.getValues().contactEmail,
        })
        .eq("id", schoolId);
        
      if (error) throw error;
      
      toast.success("School information updated successfully");
      
      // Refresh the school info
      refreshSchoolInfo(); // Call without arguments
    } catch (error: any) {
      console.error("Error updating school:", error);
      toast.error(error.message || "Failed to update school information");
    } finally {
      setIsUpdating(false);
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
            <h1 className="text-3xl font-bold gradient-text">School Settings</h1>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Update your school's basic information</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleUpdateBasicInfo)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>School Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Learnable Academy" {...field} />
                        </FormControl>
                        <FormDescription>
                          This is the name that will be displayed to students and teachers.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="A brief description of your school"
                            className="resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Briefly describe your school to give students and teachers an overview.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contactEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Email</FormLabel>
                        <FormControl>
                          <Input placeholder="info@learnable.com" type="email" {...field} />
                        </FormControl>
                        <FormDescription>
                          This email will be used for communication purposes.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="gradient-bg" disabled={isUpdating}>
                    {isUpdating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      "Update Information"
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SchoolSettings;
