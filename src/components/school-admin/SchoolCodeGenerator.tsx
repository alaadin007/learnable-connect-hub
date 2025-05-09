
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Copy, CheckCircle } from "lucide-react";
import { useSchoolCode } from "@/hooks/use-school-code";
import { useAuth } from "@/contexts/AuthContext";
import { getUserSchoolId } from "@/utils/apiHelpers";

interface SchoolCodeGeneratorProps {
  onCodeGenerated?: (code: string) => void;
  className?: string;
  variant?: 'school' | 'student';
  label?: string;
  description?: string;
}

const SchoolCodeGenerator: React.FC<SchoolCodeGeneratorProps> = ({ 
  onCodeGenerated, 
  className = "",
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
    fetchCurrentCode 
  } = useSchoolCode();

  // Fetch current code on component mount
  useEffect(() => {
    const getExistingCode = async () => {
      const schoolId = contextSchoolId || await getUserSchoolId();
      
      if (!schoolId) {
        console.log("No school ID available to fetch code");
        return;
      }

      if (variant === 'school') {
        try {
          const currentCode = await fetchCurrentCode(schoolId);
          
          if (currentCode) {
            setGeneratedCode(currentCode);
            if (onCodeGenerated) onCodeGenerated(currentCode);
          }
        } catch (error) {
          console.error("Error fetching existing code:", error);
        }
      }
    };

    getExistingCode();
  }, [contextSchoolId, fetchCurrentCode, onCodeGenerated, variant]);

  const handleGenerateCode = async () => {
    const schoolId = contextSchoolId || await getUserSchoolId();
    
    if (!schoolId) {
      toast.error("Could not determine your school ID");
      return;
    }
    
    let newCode: string | null = null;
    
    if (variant === 'school') {
      newCode = await generateCode(schoolId);
    } else {
      newCode = await generateStudentInviteCode(schoolId);
    }
    
    if (newCode) {
      setGeneratedCode(newCode);
      toast.success(`New ${variant} code generated successfully`);
      if (onCodeGenerated) onCodeGenerated(newCode);
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
    <div className={`${className} space-y-6`}>
      {!generatedCode ? (
        <Button
          onClick={handleGenerateCode}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {`Generate ${label}`}
        </Button>
      ) : (
        <div className="space-y-6">
          <div className="rounded-md overflow-hidden border border-gray-200">
            <div className="bg-gray-50 p-3 border-b flex justify-between items-center">
              <h3 className="font-medium text-gray-700">{label}</h3>
              <Button
                size="sm"
                variant="ghost"
                onClick={copyCode}
                className={codeCopied ? "text-green-600" : ""}
              >
                {codeCopied ? <CheckCircle className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                {codeCopied ? "Copied!" : "Copy"}
              </Button>
            </div>
            
            <div className="p-6">
              <div className="p-4 bg-blue-50 rounded-md border border-blue-200 flex items-center justify-center">
                <code className="font-mono text-xl font-bold text-blue-700">{generatedCode}</code>
              </div>
            </div>
          </div>

          <Button
            onClick={handleGenerateCode}
            variant="outline"
            className="w-full"
          >
            {`Generate New ${variant === 'school' ? 'School' : 'Student'} Code`}
          </Button>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        {description}
        {variant === 'school' && " Generating a new code will invalidate the previous one."}
      </p>
    </div>
  );
};

export default SchoolCodeGenerator;
