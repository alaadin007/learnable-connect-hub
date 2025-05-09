
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Copy, CheckCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getUserSchoolId } from "@/utils/apiHelpers";

interface SchoolCodeGeneratorProps {
  onCodeGenerated?: (code: string) => void;
  className?: string;
}

const SchoolCodeGenerator: React.FC<SchoolCodeGeneratorProps> = ({ onCodeGenerated, className }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const { schoolId: contextSchoolId } = useAuth();
  
  // Fetch current code on component mount
  useEffect(() => {
    const fetchCurrentCode = async () => {
      try {
        const schoolId = contextSchoolId || await getUserSchoolId();
        if (!schoolId) return;
        
        const { data, error } = await supabase
          .from("schools")
          .select("code")
          .eq("id", schoolId)
          .single();
        
        if (error) throw error;
        
        if (data?.code) {
          setGeneratedCode(data.code);
          if (onCodeGenerated) onCodeGenerated(data.code);
        }
      } catch (error) {
        console.error("Error fetching current code:", error);
      }
    };
    
    fetchCurrentCode();
  }, [contextSchoolId, onCodeGenerated]);

  const handleGenerateCode = async () => {
    setIsGenerating(true);
    
    try {
      // First check if we have a school ID
      const schoolId = contextSchoolId || await getUserSchoolId();
      if (!schoolId) {
        toast.error("Could not determine your school ID");
        return;
      }
      
      console.log("Generating code for school ID:", schoolId);
      
      // Try to use the Supabase Edge Function first
      try {
        const { data, error } = await supabase.functions.invoke('generate-school-code', {
          body: { schoolId }
        });
        
        if (error) throw error;
        
        if (data && data.code) {
          setGeneratedCode(data.code);
          toast.success("New school code generated successfully");
          if (onCodeGenerated) onCodeGenerated(data.code);
          return;
        }
      } catch (edgeFnError) {
        console.error("Edge function error:", edgeFnError);
      }
      
      // Fallback to RPC function
      const { data, error } = await supabase.rpc('generate_new_school_code', {
        school_id_param: schoolId
      });
      
      if (error) {
        console.error("Error generating code:", error);
        throw error;
      }
      
      console.log("Generated code:", data);
      
      if (data) {
        setGeneratedCode(data);
        toast.success("New school code generated successfully");
        if (onCodeGenerated) onCodeGenerated(data);
      } else {
        throw new Error("No code was generated");
      }
    } catch (error: any) {
      console.error("Error generating code:", error);
      toast.error(error.message || "Failed to generate code");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyCode = () => {
    if (!generatedCode) return;
    
    navigator.clipboard.writeText(generatedCode)
      .then(() => {
        setCodeCopied(true);
        toast.success("Code copied to clipboard");
        
        // Reset the copy state after 2 seconds
        setTimeout(() => setCodeCopied(false), 2000);
      })
      .catch(err => {
        console.error("Failed to copy:", err);
        toast.error("Failed to copy code");
      });
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>School Invitation Code</CardTitle>
        <CardDescription>
          Generate and share this code for teachers and students to join your school
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {generatedCode ? (
          <div className="space-y-3">
            <div className="p-3 bg-muted rounded-md border flex items-center justify-between">
              <code className="font-mono text-lg">{generatedCode}</code>
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
                "Generate New Code"
              )}
            </Button>
          </div>
        ) : (
          <Button
            onClick={handleGenerateCode}
            disabled={isGenerating}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Generating...
              </>
            ) : (
              "Generate School Code"
            )}
          </Button>
        )}
        <p className="text-xs text-muted-foreground mt-2">
          This code can be used by teachers and students to join your school.
          Generating a new code will invalidate the previous one.
        </p>
      </CardContent>
    </Card>
  );
};

export default SchoolCodeGenerator;
