
import React from "react";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface EmailExistsAlertProps {
  email: string;
  userRole: string | null;
}

const EmailExistsAlert: React.FC<EmailExistsAlertProps> = ({ email, userRole }) => {
  return (
    <Alert variant="destructive" className="mb-6">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>
        {userRole ? `Email Already Registered as ${userRole}` : 'Email Already Registered'}
      </AlertTitle>
      <AlertDescription>
        The email address "{email}" is already registered
        {userRole ? ` as a ${userRole} account` : ''}.
        Please use a different email or <a href="/login" className="font-medium underline">login</a> if this is your account.
        Each user can only have one role in the system.
      </AlertDescription>
    </Alert>
  );
};

export default EmailExistsAlert;
