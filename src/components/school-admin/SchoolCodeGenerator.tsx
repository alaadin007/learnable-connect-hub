import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Copy, CheckCircle, RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import useSchoolCode from "@/hooks/use-school-code";

const SchoolCodeGenerator = () => {
  const [schoolCode, setSchoolCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const { toast } = useToast();
  
  const { generateCode, isGenerating } = useSchoolCode();
  
  useEffect(() => {
    // Load existing school code or generate a new one on mount
    const loadInitialCode = async () => {
      try {
        setIsLoading(true);
        
        // Call generateCode without arguments now
        const newCode = await generateCode();
        
        if (newCode) {
          setSchoolCode(newCode);
        }
      } catch (error: any) {
        console.error("Error loading initial code:", error);
        toast({
          variant: "destructive",
          title: "Failed to load school code",
          description: "Please try again or contact support.",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadInitialCode();
  }, [generateCode, toast]);
  
  const handleGenerateClick = async () => {
    try {
      setIsLoading(true);
      
      // Call generateCode without arguments now
      const newCode = await generateCode();
      
      if (newCode) {
        setSchoolCode(newCode);
        toast({
          title: "New school code generated!",
          description: "Share this code with teachers and students to invite them to your school.",
        });
      }
    } catch (error: any) {
      console.error("Error generating code:", error);
      toast.error("Failed to generate school code");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Use proper method calls without arguments
  const copyCodeToClipboard = () => {
    if (schoolCode) {
      navigator.clipboard.writeText(schoolCode);
      setIsCopied(true);
      toast({
        title: "Code copied to clipboard!",
      });
      setTimeout(() => setIsCopied(false), 2000);
    }
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>School Code Generator</CardTitle>
        <CardDescription>
          Generate a unique code for your school to invite teachers and
          students.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <Input
            type="text"
            value={schoolCode || "No code generated"}
            readOnly
            className="flex-grow"
          />
          <Button
            variant="secondary"
            onClick={copyCodeToClipboard}
            disabled={!schoolCode || isCopied}
          >
            {isCopied ? (
              <CheckCircle className="h-4 w-4 mr-2" />
            ) : (
              <Copy className="h-4 w-4 mr-2" />
            )}
            {isCopied ? "Copied!" : "Copy"}
          </Button>
        </div>
        <Button
          className="w-full gradient-bg"
          onClick={handleGenerateClick}
          disabled={isLoading || isGenerating}
        >
          {isLoading || isGenerating ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            "Generate New Code"
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default SchoolCodeGenerator;
