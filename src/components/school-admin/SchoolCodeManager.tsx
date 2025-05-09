
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RefreshCcw, Copy, CheckCircle, AlertCircle } from "lucide-react";
import { useSchoolCode } from "@/hooks/use-school-code";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

interface SchoolCodeManagerProps {
  schoolId: string;
  currentCode: string;
  onCodeGenerated: (code: string) => void;
}

const SchoolCodeManager: React.FC<SchoolCodeManagerProps> = ({
  schoolId,
  currentCode,
  onCodeGenerated,
}) => {
  const { generateCode, isGenerating } = useSchoolCode();
  const [showDialog, setShowDialog] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  
  const handleGenerateCode = async () => {
    if (!schoolId) {
      toast.error("School ID is required to generate a code");
      return;
    }

    try {
      console.log("Generating code for school ID:", schoolId);
      const newCode = await generateCode(schoolId);
      console.log("Generated new code:", newCode);
      
      if (newCode) {
        onCodeGenerated(newCode);
        setShowDialog(true);
        toast.success("New school code generated successfully");
      }
    } catch (error) {
      console.error("Failed to generate code:", error);
      toast.error("Could not generate a new code");
    }
  };

  const copyToClipboard = () => {
    if (!currentCode) return;
    
    navigator.clipboard.writeText(currentCode)
      .then(() => {
        setCodeCopied(true);
        setTimeout(() => setCodeCopied(false), 2000);
        toast.success("School code copied to clipboard");
      })
      .catch(() => {
        toast.error("Failed to copy code to clipboard");
      });
  };

  return (
    <div>
      <div className="flex items-center space-x-2">
        <code className="bg-background p-3 rounded border flex-1 text-center font-mono">
          {currentCode || "No code available"}
        </code>
        <Button
          variant="outline"
          onClick={handleGenerateCode}
          disabled={isGenerating}
          className="flex items-center gap-2 bg-primary text-white hover:bg-primary/90"
        >
          {isGenerating ? (
            <>
              <RefreshCcw className="h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <RefreshCcw className="h-4 w-4" />
              Generate New
            </>
          )}
        </Button>
      </div>
      <p className="text-sm text-muted-foreground mt-2">
        This code is used by teachers and students to join your school.
        Generating a new code will invalidate the old one.
      </p>

      {/* Dialog to show the new code */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New School Code Generated</DialogTitle>
            <DialogDescription>
              Your new school code is ready. Make sure to share it with your teachers and students.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted p-4 rounded-md my-4">
            <div className="flex items-center justify-between">
              <code className="font-mono text-xl">{currentCode}</code>
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-2"
                onClick={copyToClipboard}
              >
                {codeCopied ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-md p-4 text-amber-800">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <h4 className="font-semibold mb-1">Important</h4>
                <p className="text-sm">
                  This action has invalidated your previous school code. Anyone using the old code 
                  will no longer be able to join your school.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button className="w-full sm:w-auto">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SchoolCodeManager;
