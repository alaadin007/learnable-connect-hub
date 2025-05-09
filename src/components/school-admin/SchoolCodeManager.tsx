
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RefreshCcw, Copy, CheckCircle, AlertCircle, Info } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SchoolCodeManagerProps {
  schoolId: string;
  currentCode: string;
  onCodeGenerated: (code: string) => void;
}

interface SchoolCodeInfo {
  code: string;
  expiresAt: string | null;
  generatedAt: string | null;
}

const SchoolCodeManager: React.FC<SchoolCodeManagerProps> = ({
  schoolId,
  currentCode,
  onCodeGenerated,
}) => {
  const { generateCode, isGenerating } = useSchoolCode();
  const [showDialog, setShowDialog] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [codeInfo, setCodeInfo] = useState<SchoolCodeInfo | null>(null);
  
  useEffect(() => {
    if (currentCode) {
      fetchCodeInfo();
    }
  }, [currentCode]);
  
  const fetchCodeInfo = async () => {
    try {
      // Get code expiration and generation time
      const { data, error } = await supabase
        .from("schools")
        .select("code, code_expires_at")
        .eq("id", schoolId)
        .single();
        
      if (error) {
        console.error("Failed to fetch code info:", error);
        return;
      }
      
      // Get the most recent generation timestamp from logs
      const { data: logData } = await supabase
        .from("school_code_logs")
        .select("generated_at")
        .eq("school_id", schoolId)
        .eq("code", currentCode)
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      setCodeInfo({
        code: data.code,
        expiresAt: data.code_expires_at,
        generatedAt: logData?.generated_at || null
      });
    } catch (error) {
      console.error("Error fetching code info:", error);
    }
  };
  
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
        
        // Fetch updated code info
        await fetchCodeInfo();
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
  
  const formatExpiryDate = (dateString: string | null) => {
    if (!dateString) return "No expiration set";
    
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch (e) {
      return "Invalid date";
    }
  };
  
  const getExpiryStatus = () => {
    if (!codeInfo?.expiresAt) return null;
    
    try {
      const expiryDate = new Date(codeInfo.expiresAt);
      const now = new Date();
      const hoursRemaining = Math.round((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60));
      
      if (expiryDate < now) {
        return (
          <Alert variant="destructive" className="mt-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This code has expired. Generate a new code.
            </AlertDescription>
          </Alert>
        );
      }
      
      if (hoursRemaining < 6) {
        return (
          <Alert variant="warning" className="mt-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This code will expire soon (in {hoursRemaining} hours). Consider generating a new code.
            </AlertDescription>
          </Alert>
        );
      }
      
      return (
        <Alert className="mt-2 bg-green-50">
          <Info className="h-4 w-4" />
          <AlertDescription>
            Code valid until {formatExpiryDate(codeInfo.expiresAt)}
          </AlertDescription>
        </Alert>
      );
    } catch (e) {
      return null;
    }
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
          className="flex items-center gap-2"
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
      {getExpiryStatus()}
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
          {codeInfo?.expiresAt && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 text-blue-800 mb-4">
              <div className="flex items-start gap-2">
                <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold mb-1">Expiration</h4>
                  <p className="text-sm">
                    This code will expire on {formatExpiryDate(codeInfo.expiresAt)}.
                  </p>
                </div>
              </div>
            </div>
          )}
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
