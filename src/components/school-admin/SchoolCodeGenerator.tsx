
import React, { useState } from 'react';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, CheckCircle } from "lucide-react";
import { useSchoolCode } from "@/hooks/use-school-code";

export interface SchoolCodeGeneratorProps {
  onCodeGenerated?: (code: string) => void;
}

const SchoolCodeGenerator = ({ onCodeGenerated }: SchoolCodeGeneratorProps) => {
  const [schoolCode, setSchoolCode] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const { generateCode, isGenerating } = useSchoolCode();

  const handleGenerateCode = async () => {
    try {
      const code = await generateCode();
      if (code) {
        setSchoolCode(code);
        
        // Call the onCodeGenerated callback if provided
        if (onCodeGenerated) {
          onCodeGenerated(code);
        }
      }
    } catch (error: any) {
      console.error("Error generating school code:", error);
      toast.error("Failed to generate school code");
    }
  };

  const copyToClipboard = () => {
    if (schoolCode) {
      navigator.clipboard.writeText(schoolCode);
      setIsCopied(true);
      toast.success("School code copied to clipboard");
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Teacher Invitation Code</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <p className="text-sm text-gray-500">
            Generate a unique code for teachers to join your school.
          </p>
        </div>
        <div className="flex items-center space-x-2 mb-4">
          <Input
            type="text"
            value={schoolCode || ""}
            readOnly
            placeholder="Generate a school code"
            className="flex-grow"
          />
          <Button
            variant="outline"
            onClick={copyToClipboard}
            disabled={!schoolCode || isCopied}
          >
            {isCopied ? <CheckCircle className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
            {isCopied ? "Copied!" : "Copy"}
          </Button>
        </div>
        <Button
          className="w-full gradient-bg"
          onClick={handleGenerateCode}
          disabled={isGenerating}
        >
          {isGenerating ? "Generating..." : "Generate Teacher Code"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default SchoolCodeGenerator;
