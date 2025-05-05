
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Copy, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface StudentInvitationProps {
  onSuccess?: () => void;
}

export const StudentInvitation = ({ onSuccess }: StudentInvitationProps) => {
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

  const generateInviteCode = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("You must be logged in");
      }
      
      // Call the edge function to generate a new code
      const { data, error } = await supabase.functions.invoke("generate-student-code", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        }
      });

      if (error || !data || data.error) {
        throw new Error(error?.message || data?.error || "Failed to generate invitation code");
      }
      
      setGeneratedCode(data.code);
      toast.success("Student invitation code generated successfully");
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error("Error generating invite code:", error);
      toast.error("Failed to generate code");
    }
  };

  const copyInviteCode = () => {
    if (!generatedCode) return;
    
    navigator.clipboard.writeText(generatedCode);
    toast.success("Code copied to clipboard!");
  };

  return (
    <div className="space-y-4">
      {!generatedCode ? (
        <Button 
          onClick={generateInviteCode} 
          className="w-full gradient-bg"
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Generate Student Invite Code
        </Button>
      ) : (
        <div className="p-4 bg-muted rounded-lg">
          <p className="font-semibold mb-2">Invitation Code:</p>
          <div className="flex items-center gap-2">
            <code className="bg-background p-2 rounded border flex-1 text-center text-lg font-mono">
              {generatedCode}
            </code>
            <Button variant="outline" size="sm" onClick={copyInviteCode}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Share this code with students to join your school
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full mt-4"
            onClick={generateInviteCode}
          >
            Generate New Code
          </Button>
        </div>
      )}
    </div>
  );
};

export default StudentInvitation;
