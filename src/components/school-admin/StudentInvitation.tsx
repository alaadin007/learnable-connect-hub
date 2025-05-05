
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Copy, UserPlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { generateStudentInviteCode } from '@/utils/schoolUtils';

interface StudentInvitationProps {
  onSuccess?: () => void;
}

export const StudentInvitation = ({ onSuccess }: StudentInvitationProps) => {
  const [generatedCode, setGeneratedCode] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateInviteCode = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { code, error } = await generateStudentInviteCode();
      
      if (error) {
        setError(error);
        toast.error("Failed to generate code: " + error);
        return;
      }
      
      if (code) {
        setGeneratedCode(code);
        toast.success("Student invitation code generated successfully");
        
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (err: any) {
      console.error("Error generating code:", err);
      setError(err.message || "Failed to generate invitation code");
      toast.error("Error generating code");
    } finally {
      setIsLoading(false);
    }
  };

  const copyInviteCode = () => {
    if (!generatedCode) return;
    
    navigator.clipboard.writeText(generatedCode);
    toast.success("Code copied to clipboard!");
  };

  return (
    <div className="space-y-4">
      <div className="p-4 bg-muted rounded-lg">
        {generatedCode ? (
          <>
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
          </>
        ) : (
          <p className="text-sm text-muted-foreground mb-2">
            Generate a code to invite students to your school
          </p>
        )}
        
        {error && (
          <div className="mt-2 text-sm text-red-500">
            Error: {error}
          </div>
        )}
        
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full mt-4"
          onClick={generateInviteCode}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <UserPlus className="mr-2 h-4 w-4" />
              Generate New Code
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default StudentInvitation;
