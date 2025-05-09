import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RefreshCcw, Copy, CheckCircle, AlertCircle, Info, HelpCircle } from "lucide-react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [codeInfo, setCodeInfo] = useState<SchoolCodeInfo | null>(null);

  useEffect(() => {
    if (currentCode) {
      fetchCodeInfo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCode, schoolId]);

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
        generatedAt: logData?.generated_at || null,
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
      const newCode = await generateCode(schoolId);

      if (newCode) {
        onCodeGenerated(newCode);
        setShowDialog(true);
        toast.success("New school code generated successfully");
        await fetchCodeInfo();
      }
    } catch (error) {
      console.error("Failed to generate code:", error);
      toast.error("Could not generate a new code");
    }
  };

  const copyToClipboard = () => {
    if (!currentCode) return;

    navigator.clipboard
      .writeText(currentCode)
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
      const hoursRemaining = Math.round(
        (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60)
      );

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
          <Alert className="mt-2 border-yellow-200 bg-yellow-50 text-yellow-800">
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
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium flex items-center">
          School Code
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-auto p-1">
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 text-sm">
              <p>This code is required for teachers and students to register and join your school.</p>
              <ul className="list-disc pl-4 mt-2 space-y-1">
                <li>Share this code with your teachers and students</li>
                <li>Codes expire after 24 hours for security</li>
                <li>Generating a new code invalidates the old one</li>
              </ul>
            </PopoverContent>
          </Popover>
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowHelpDialog(true)}
          className="text-xs"
        >
          How to use
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        <div className="flex-1 bg-muted rounded-md border overflow-hidden">
          <div className="flex items-center justify-between p-2">
            <code className="bg-background px-2 py-1 rounded font-mono text-sm">
              {currentCode || "No code available"}
            </code>
            <Button
              variant="ghost"
              size="sm"
              onClick={copyToClipboard}
              disabled={!currentCode}
              className="h-7 px-2"
            >
              {codeCopied ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        <Button
          variant="secondary"
          onClick={handleGenerateCode}
          disabled={isGenerating}
          className="flex items-center gap-1"
        >
          {isGenerating ? (
            <>
              <RefreshCcw className="h-4 w-4 animate-spin" />
              <span>Generating...</span>
            </>
          ) : (
            <>
              <RefreshCcw className="h-4 w-4" />
              <span>Generate New</span>
            </>
          )}
        </Button>
      </div>

      {getExpiryStatus()}

      {/* Help dialog */}
      <Dialog open={showHelpDialog} onOpenChange={setShowHelpDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>How School Codes Work</DialogTitle>
            <DialogDescription>
              Understanding how to use and share school codes for registration
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-md bg-blue-50 p-4 border border-blue-100">
              <div className="flex">
                <div className="flex-shrink-0">
                  <Info className="h-5 w-5 text-blue-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-700">What are school codes?</h3>
                  <p className="mt-2 text-sm text-blue-600">
                    School codes are unique identifiers that connect teachers and students to your school during registration.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">How to use your school code:</h4>
              <ol className="list-decimal pl-5 space-y-2 text-sm">
                <li>Generate a new code (codes expire after 24 hours)</li>
                <li>Copy the code and share it with teachers or students who need to register</li>
                <li>Teachers and students will enter this code during the registration process</li>
                <li>Once registered, they will be automatically connected to your school</li>
              </ol>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">Important notes:</h4>
              <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
                <li>For security reasons, codes automatically expire after 24 hours</li>
                <li>Generating a new code invalidates any previous codes</li>
                <li>You may regenerate codes as often as needed</li>
                <li>Share codes only with individuals you want to join your school</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button>Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

          <div className="space-y-4">
            {codeInfo?.expiresAt && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4 text-blue-800">
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

            <div className="space-y-1">
              <h4 className="font-semibold">Next steps:</h4>
              <ol className="list-decimal pl-5 text-sm space-y-1">
                <li>Copy this code and keep it secure</li>
                <li>Share it with teachers who need to register</li>
                <li>Teachers will enter this code during registration</li>
                <li>You can generate a new code anytime if needed</li>
              </ol>
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