
import React, { useState, useEffect } from "react";
import { 
  Copy, 
  CheckCircle, 
  X, 
  AlertCircle 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface SchoolCodePopupProps {
  isOpen: boolean;
  onClose: () => void;
  code: string;
  expiresAt?: string;
}

const SchoolCodePopup = ({ isOpen, onClose, code, expiresAt }: SchoolCodePopupProps) => {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  // Sync the internal open state with the isOpen prop
  useEffect(() => {
    setOpen(isOpen);
  }, [isOpen]);
  
  // Call the onClose callback when the internal open state changes to false
  useEffect(() => {
    if (!open && isOpen) {
      onClose();
    }
  }, [open, isOpen, onClose]);

  const copyToClipboard = () => {
    if (!code) return;

    navigator.clipboard.writeText(code)
      .then(() => {
        setCopied(true);
        toast.success("School code copied to clipboard");
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((err) => {
        console.error("Failed to copy:", err);
        toast.error("Failed to copy code");
      });
  };

  const formatExpiryDate = (dateString?: string) => {
    if (!dateString) return "No expiration set";
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch (e) {
      return "Invalid date";
    }
  };

  // If no code is provided, don't render the dialog
  if (!code) {
    return null;
  }

  return (
    <Dialog 
      open={open} 
      onOpenChange={(newOpen) => {
        setOpen(newOpen);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>School Invitation Code</DialogTitle>
          <DialogDescription>
            Use this code for teachers and students to register and join your school
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex items-center space-x-2">
          <div className="grid flex-1 gap-2">
            <div className="bg-muted p-6 rounded-md text-center">
              <code className="font-mono text-xl">{code || "No code available"}</code>
            </div>
          </div>
          <Button 
            size="icon"
            variant="outline"
            onClick={copyToClipboard}
            className={copied ? "text-green-500" : ""}
          >
            {copied ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>

        {expiresAt && (
          <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-amber-800 flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">This code will expire on {formatExpiryDate(expiresAt)}</p>
              <p className="text-xs mt-1">After expiration, you'll need to generate a new code.</p>
            </div>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-blue-800">
          <h4 className="text-sm font-medium mb-1">How to use</h4>
          <ol className="text-xs space-y-1 pl-5 list-decimal">
            <li>Share this code with teachers and students</li>
            <li>They will enter this code during registration</li>
            <li>The code connects users to your school automatically</li>
          </ol>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Close
          </Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700 flex items-center gap-1"
            onClick={copyToClipboard}
          >
            {copied ? (
              <>
                <CheckCircle className="h-4 w-4" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                <span>Copy Code</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SchoolCodePopup;
