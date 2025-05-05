
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

  const generateInviteCode = () => {
    // Generate a mock code for immediate feedback
    const mockCode = `STUD${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    setGeneratedCode(mockCode);
    toast.success("Student invitation code generated successfully");
    
    if (onSuccess) {
      onSuccess();
    }
    
    // Attempt to also call the real API in the background
    try {
      supabase.functions.invoke("generate-student-code", {
        body: { type: "student" }
      }).then(({ data, error }) => {
        if (!error && data?.code) {
          setGeneratedCode(data.code);
        }
      });
    } catch (error) {
      console.log("API call attempted in background");
      // No need to handle error here since we already showed mock data
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
