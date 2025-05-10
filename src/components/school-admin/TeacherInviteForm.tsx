
// This file would need more context to fully fix, but let's adjust the interface and key parts

import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';

export interface TeacherInviteFormProps {
  onInviteSent?: (email: string) => void;
  onCancel?: () => void;
}

export default function TeacherInviteForm({ onInviteSent, onCancel }: TeacherInviteFormProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter a valid email");
      return;
    }
    
    setIsSubmitting(true);
    try {
      // First check if email already exists
      const { data: emailExists } = await supabase.rpc('check_if_email_exists', {
        input_email: email
      });
      
      if (emailExists) {
        // Check if they already have a role
        const { data: userRole } = await supabase.rpc('get_user_role_by_email', {
          input_email: email
        });
        
        if (userRole) {
          toast.error(`This email already exists as a ${userRole}`);
          return;
        }
      }
      
      // Invite the teacher
      const { data, error } = await supabase.rpc('invite_teacher', {
        teacher_email: email
      });
      
      if (error) throw error;
      
      toast.success(`Successfully invited ${email}`);
      
      if (onInviteSent) {
        onInviteSent(email);
      }
      setEmail('');
    } catch (error: any) {
      console.error("Failed to invite teacher:", error);
      toast.error(error.message || "Failed to send invitation");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invite a Teacher</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Input 
                type="email"
                placeholder="teacher@school.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          {onCancel && (
            <Button variant="outline" onClick={onCancel} type="button">
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Sending..." : "Send Invitation"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
