
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { removeUserByEmail } from "@/utils/userManagement";

const UserRemovalTool = () => {
  const [email, setEmail] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleRemoveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error("Please enter an email address");
      return;
    }
    
    if (!confirm(`Are you sure you want to completely remove the user ${email} from the database? This action cannot be undone.`)) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      const result = await removeUserByEmail(email);
      
      if (result.success) {
        toast.success(result.message);
        setEmail("");
      } else {
        toast.error(result.message);
      }
    } catch (error: any) {
      toast.error(`Failed to remove user: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Remove User</CardTitle>
        <CardDescription>
          Completely remove a user from the database including all associated data.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleRemoveUser}>
        <CardContent>
          <div className="grid w-full items-center gap-4">
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                placeholder="user@example.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={() => setEmail("")}
            type="button"
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button 
            variant="destructive"
            type="submit"
            disabled={isLoading || !email.trim()}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Removing...
              </>
            ) : (
              "Remove User"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default UserRemovalTool;
