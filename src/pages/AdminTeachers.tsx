
import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/landing/Footer";
import TeacherInvitation from "@/components/admin/TeacherInvitation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Mail, UserPlus } from "lucide-react";

// Define the schema for teacher form
const addTeacherSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  method: z.enum(["invite", "create"], {
    required_error: "Please select a method",
  }),
  full_name: z.string().optional(),
});

type AddTeacherFormValues = z.infer<typeof addTeacherSchema>;

type TeacherInvite = {
  id: string;
  email: string;
  created_at: string;
  expires_at: string;
  status: string;
};

const AdminTeachers = () => {
  const { user, profile, isSupervisor } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [invites, setInvites] = useState<TeacherInvite[]>([]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow bg-learnable-super-light py-8">
        <div className="container mx-auto px-4">
          <div className="mb-6">
            <h1 className="text-3xl font-bold gradient-text mb-2">Teacher Management</h1>
            <p className="text-learnable-gray">
              Add or invite teachers to join your school
            </p>
          </div>
          
          <TeacherInvitation />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminTeachers;
