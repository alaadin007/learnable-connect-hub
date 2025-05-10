
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, CheckCircle } from "lucide-react";
import { useSchoolCode } from "@/hooks/use-school-code";

// Define a proper onCodeGenerated prop type
interface SchoolCodeManagerProps {
  onCodeGenerated?: (code: string) => void;
}

const SchoolCodeManager = ({ onCodeGenerated }: SchoolCodeManagerProps) => {
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const { generateStudentInviteCode, codeHistory, loadCodeHistory, isGenerating } = useSchoolCode();
  
  useEffect(() => {
    loadCodeHistory();
  }, [loadCodeHistory]);
  
  const handleGenerateInviteCode = async () => {
    try {
      // Call the method without arguments
      const code = await generateStudentInviteCode();
      
      if (code) {
        setInviteCode(code);
        
        // Call the onCodeGenerated prop if provided
        if (onCodeGenerated) {
          onCodeGenerated(code);
        }
      }
    } catch (error: any) {
      console.error("Error generating invitation code:", error);
      toast.error("Failed to generate invitation code");
    }
  };
  
  const copyToClipboard = () => {
    if (inviteCode) {
      navigator.clipboard.writeText(inviteCode);
      setIsCopied(true);
      toast.success("Invite code copied to clipboard!");
      setTimeout(() => setIsCopied(false), 2000);
    }
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Student Invitation Code</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <p className="text-sm text-gray-500">
            Generate a unique code for students to join your school.
          </p>
        </div>
        <div className="flex items-center space-x-2 mb-4">
          <Input
            type="text"
            value={inviteCode || ""}
            readOnly
            placeholder="Generate an invite code"
            className="flex-grow"
          />
          <Button
            variant="outline"
            onClick={copyToClipboard}
            disabled={!inviteCode || isCopied}
          >
            {isCopied ? <CheckCircle className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
            {isCopied ? "Copied!" : "Copy"}
          </Button>
        </div>
        <Button
          className="w-full gradient-bg"
          onClick={handleGenerateInviteCode}
          disabled={isGenerating}
        >
          {isGenerating ? "Generating..." : "Generate Invite Code"}
        </Button>
        
        {codeHistory && codeHistory.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">Code History</h3>
            <ul>
              {codeHistory.map((code, index) => (
                <li key={index} className="py-2 border-b border-gray-200">
                  {code.code} - Generated on {new Date(code.generated_at).toLocaleDateString()}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SchoolCodeManager;
