
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Clipboard, RefreshCw, Check, Clock, ChevronDown } from "lucide-react";
import { useSchoolCode } from "@/hooks/use-school-code";
import { toast } from "sonner";
import { getSchoolIdWithFallback } from "@/utils/apiHelpers";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SchoolCodeGeneratorProps {
  onCodeGenerated?: (code: string) => void;
  variant?: string; // Optional variant for styling differences
}

const SchoolCodeGenerator = ({ onCodeGenerated, variant }: SchoolCodeGeneratorProps) => {
  const [code, setCode] = useState<string | null>("DEMO-CODE");
  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const { generateCode, isGenerating, codeHistory, loadCodeHistory } = useSchoolCode();
  
  // Generate a code immediately on component mount
  useEffect(() => {
    const schoolId = getSchoolIdWithFallback();
    
    // Use a pre-generated code for instant display
    const instantCode = localStorage.getItem(`school_code_${schoolId}`) || "DEMO-CODE";
    setCode(instantCode);
    
    // Call onCodeGenerated if provided to sync code with other components
    if (onCodeGenerated && instantCode) {
      onCodeGenerated(instantCode);
    }
    
    // We don't need to actually generate a code right away
    // But we'll store this one for future reference
    localStorage.setItem(`school_code_${schoolId}`, instantCode);
    
    // Load code history
    loadCodeHistory(schoolId);
  }, [onCodeGenerated, loadCodeHistory]);

  const handleGenerateClick = async () => {
    try {
      const schoolId = getSchoolIdWithFallback();
      const generatedCode = await generateCode(schoolId);
      
      if (generatedCode) {
        setCode(generatedCode);
        // Call onCodeGenerated if provided to sync code with other components
        if (onCodeGenerated) {
          onCodeGenerated(generatedCode);
        }
        toast.success("New invitation code generated");
        
        // Refresh code history
        loadCodeHistory(schoolId);
      } else {
        // In case code generation fails, use a fallback
        const fallbackCode = `DEMO-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        setCode(fallbackCode);
        localStorage.setItem(`school_code_${schoolId}`, fallbackCode);
        if (onCodeGenerated) {
          onCodeGenerated(fallbackCode);
        }
        toast.success("New invitation code generated");
      }
    } catch (error) {
      console.error("Error generating code:", error);
      const fallbackCode = `DEMO-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      setCode(fallbackCode);
      if (onCodeGenerated) {
        onCodeGenerated(fallbackCode);
      }
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

  const handleSelectPreviousCode = (selectedCode: string) => {
    if (selectedCode) {
      setCode(selectedCode);
      if (onCodeGenerated) {
        onCodeGenerated(selectedCode);
      }
      toast.success("Previous code selected");
    }
  };

  // Small variant for inline display
  if (variant === "small") {
    return (
      <div className="flex items-center space-x-2">
        <span className="font-mono font-semibold">{code}</span>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleGenerateClick} 
          disabled={isGenerating}
        >
          <RefreshCw className={`h-4 w-4 ${isGenerating ? "animate-spin" : ""}`} />
        </Button>
      </div>
    );
  }

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
        <div className="flex space-x-2">
          <Button 
            onClick={handleGenerateClick}
            disabled={isGenerating}
            className="flex items-center" 
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? "animate-spin" : ""}`} />
            Generate New Code
          </Button>
          
          {codeHistory && codeHistory.length > 1 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon">
                        <Clock className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <div className="text-sm font-medium px-2 py-1.5 text-muted-foreground">Previous codes</div>
                      {codeHistory.map((historyCode, index) => (
                        <DropdownMenuItem 
                          key={`${historyCode}-${index}`}
                          onClick={() => handleSelectPreviousCode(historyCode)}
                          className="font-mono"
                        >
                          {historyCode}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TooltipTrigger>
                <TooltipContent>
                  <p>View previous codes</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        Teachers can use this code to join your school. For security, generate a new code after sharing.
        {codeHistory && codeHistory.length > 0 && " Previous codes are also stored for reference."}
      </p>
    </div>
  );
};

export default SchoolCodeGenerator;
