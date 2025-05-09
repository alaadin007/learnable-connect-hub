
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Copy, CheckCircle, Loader2 } from "lucide-react";
import { useSchoolCode } from "@/hooks/use-school-code";
import { useAuth } from "@/contexts/AuthContext";

interface SchoolCodeGeneratorProps {
  onCodeGenerated?: (code: string) => void;
  className?: string;
  variant?: 'school' | 'student';
  label?: string;
  description?: string;
}

const SchoolCodeGenerator: React.FC<SchoolCodeGeneratorProps> = ({ 
  onCodeGenerated, 
  className,
  variant = 'school',
  label = variant === 'school' ? 'School Code' : 'Student Invitation Code',
  description = variant === 'school' 
    ? 'This code can be used by teachers and students to join your school.'
    : 'Share this code with students to join your class.'
}) => {
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const { schoolId: contextSchoolId } = useAuth();
  const { 
    generateCode, 
    generateStudentInviteCode,
    isGenerating, 
    fetchCurrentCode 
  } = useSchoolCode();

  // Fetch current code on component mount
  useEffect(() => {
    const getExistingCode = async () => {
      const schoolId = contextSchoolId;
      if (!schoolId) {
        console.warn("No school ID available in context");
        return;
      }

      if (variant === 'school') {
        try {
          console.log("Fetching existing school code for school ID:", schoolId);
          const currentCode = await fetchCurrentCode(schoolId);
          
          if (currentCode) {
            console.log("Found existing code:", currentCode);
            setGeneratedCode(currentCode);
            if (onCodeGenerated) onCodeGenerated(currentCode);
          } else {
            console.log("No existing code found");
          }
        } catch (error) {
          console.error("Error fetching existing code:", error);
        }
      }
    };

    getExistingCode();
  }, [contextSchoolId, fetchCurrentCode, onCodeGenerated, variant]);

  const handleGenerateCode = async () => {
    const schoolId = contextSchoolId;
    if (!schoolId) {
      console.error("No school ID found in context");
      toast.error("Could not determine your school ID");
      return;
    }

    console.log("Generating code for variant:", variant, "school ID:", schoolId);
    
    let newCode: string | null = null;
    
    if (variant === 'school') {
      newCode = await generateCode(schoolId);
    } else {
      newCode = await generateStudentInviteCode(schoolId);
    }
    
    if (newCode) {
      console.log(`New ${variant} code generated:`, newCode);
      setGeneratedCode(newCode);
      toast.success(`New ${variant} code generated successfully`);
      if (onCodeGenerated) onCodeGenerated(newCode);
    } else {
      console.error("Failed to generate code");
    }
  };

  const copyCode = () => {
    if (!generatedCode) return;

    navigator.clipboard.writeText(generatedCode)
      .then(() => {
        setCodeCopied(true);
        toast.success("Code copied to clipboard");
        setTimeout(() => setCodeCopied(false), 2000);
      })
      .catch(err => {
        console.error("Failed to copy:", err);
        toast.error("Failed to copy code");
      });
  };

  return (
    <div className={className}>
      {generatedCode ? (
        <div className="space-y-3">
          <div className="p-4 bg-blue-50 rounded-md border border-blue-200 flex items-center justify-between">
            <code className="font-mono text-lg font-bold text-blue-700">{generatedCode}</code>
            <Button
              size="sm"
              variant="ghost"
              onClick={copyCode}
              className={`ml-2 ${codeCopied ? "text-green-600" : ""}`}
            >
              {codeCopied ? <CheckCircle className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
              {codeCopied ? "Copied!" : "Copy"}
            </Button>
          </div>
          <Button
            onClick={handleGenerateCode}
            disabled={isGenerating}
            variant="outline"
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Generating...
              </>
            ) : (
              `Generate New ${variant === 'school' ? 'School' : 'Student'} Code`
            )}
          </Button>
        </div>
      ) : (
        <Button
          onClick={handleGenerateCode}
          disabled={isGenerating}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Generating...
            </>
          ) : (
            `Generate ${label}`
          )}
        </Button>
      )}
      <p className="text-xs text-muted-foreground mt-2">
        {description}
        {variant === 'school' && " Generating a new code will invalidate the previous one."}
      </p>
    </div>
  );
};

export default SchoolCodeGenerator;
