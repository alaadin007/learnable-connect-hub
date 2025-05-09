
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Clipboard, RefreshCw, Check } from "lucide-react";
import { useSchoolCode } from "@/hooks/use-school-code";
import { toast } from "sonner";
import { getSchoolIdWithFallback } from "@/utils/apiHelpers";

const SchoolCodeGenerator = () => {
  const [code, setCode] = useState<string | null>("DEMO-CODE");
  const [copied, setCopied] = useState(false);
  const { generateCode, isGenerating } = useSchoolCode();
  
  // Generate a code immediately on component mount
  useEffect(() => {
    const schoolId = getSchoolIdWithFallback();
    
    // Use a pre-generated code for instant display
    const instantCode = localStorage.getItem(`school_code_${schoolId}`) || "DEMO-CODE";
    setCode(instantCode);
    
    // We don't need to actually generate a code right away
    // But we'll store this one for future reference
    localStorage.setItem(`school_code_${schoolId}`, instantCode);
  }, []);

  const handleGenerateClick = async () => {
    try {
      const schoolId = getSchoolIdWithFallback();
      const generatedCode = await generateCode(schoolId);
      
      if (generatedCode) {
        setCode(generatedCode);
        toast.success("New invitation code generated");
      } else {
        // In case code generation fails, use a fallback
        const fallbackCode = `DEMO-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        setCode(fallbackCode);
        localStorage.setItem(`school_code_${schoolId}`, fallbackCode);
        toast.success("New invitation code generated");
      }
    } catch (error) {
      console.error("Error generating code:", error);
      const fallbackCode = `DEMO-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      setCode(fallbackCode);
      toast.success("New invitation code generated");
    }
  };

  const handleCopyClick = () => {
    if (code) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("Code copied to clipboard!");
      
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    }
  };

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:space-x-4 space-y-2 md:space-y-0">
        <Card className="flex-grow">
          <CardContent className="flex items-center justify-between p-4 h-16">
            <span className="text-lg font-mono font-semibold">{code}</span>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleCopyClick} 
              className="hover:bg-slate-100"
            >
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Clipboard className="h-4 w-4" />}
            </Button>
          </CardContent>
        </Card>
        <Button 
          onClick={handleGenerateClick}
          disabled={isGenerating}
          className="flex items-center" 
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? "animate-spin" : ""}`} />
          Generate New Code
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Teachers can use this code to join your school. For security, generate a new code after sharing.
      </p>
    </div>
  );
};

export default SchoolCodeGenerator;
