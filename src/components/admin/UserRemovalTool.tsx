
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { AlertCircle, Trash2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { removeUserByEmail } from '@/utils/userManagement';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";

const UserRemovalTool = () => {
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [isRemoving, setIsRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRemove = async () => {
    if (!email || email !== confirmEmail) {
      setError("Email addresses must match");
      return;
    }

    setIsRemoving(true);
    setError(null);

    try {
      const result = await removeUserByEmail(email);
      
      if (result.success) {
        toast.success("User removed successfully", {
          description: result.message
        });
        setEmail("");
        setConfirmEmail("");
      } else {
        setError(result.message);
      }
    } catch (err: any) {
      setError(`An unexpected error occurred: ${err.message}`);
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-destructive flex items-center">
          <Trash2 className="h-5 w-5 mr-2" />
          Remove User
        </CardTitle>
        <CardDescription>
          Permanently delete a user and all associated data
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">User Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter email to remove"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirmEmail">Confirm Email</Label>
            <Input
              id="confirmEmail"
              type="email"
              placeholder="Re-enter email to confirm"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              className={email !== confirmEmail && confirmEmail ? "border-red-500" : ""}
            />
            {email !== confirmEmail && confirmEmail && (
              <p className="text-xs text-destructive mt-1">Email addresses must match</p>
            )}
          </div>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button 
                variant="destructive" 
                className="w-full"
                disabled={!email || email !== confirmEmail || isRemoving}
              >
                {isRemoving ? "Removing..." : "Remove User"}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirm User Removal</DialogTitle>
                <DialogDescription>
                  This action cannot be undone. The user <span className="font-semibold">{email}</span> and 
                  all associated data will be permanently deleted from the system.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Warning</AlertTitle>
                  <AlertDescription>
                    This is a destructive operation that will remove all user data including chats,
                    assessments, and other content.
                  </AlertDescription>
                </Alert>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button 
                  variant="destructive" 
                  onClick={handleRemove}
                  disabled={isRemoving}
                >
                  {isRemoving ? "Removing..." : "Confirm Removal"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserRemovalTool;
