
import React from "react";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, RefreshCw, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface StudentInvite {
  id: string;
  email: string | null;
  code: string | null;
  created_at: string;
  expires_at: string;
  status: string;
}

interface StudentInviteListProps {
  invites: StudentInvite[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  onRefresh: () => void;
}

const StudentInviteList = ({
  invites,
  isLoading,
  isError,
  error,
  onRefresh
}: StudentInviteListProps) => {

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Code copied to clipboard");
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Student Invitations</CardTitle>
          <CardDescription>Recent student invitations and codes</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={onRefresh} className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {error?.message || "Failed to load invitations"}
            </AlertDescription>
          </Alert>
        )}
        
        {!isError && invites.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email/Code</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.map((invite) => {
                  const isExpired = new Date(invite.expires_at) < new Date();
                  const status = isExpired && invite.status === 'pending' ? 'expired' : invite.status;
                  
                  return (
                    <TableRow key={invite.id}>
                      <TableCell>
                        {invite.email || (
                          <div className="flex items-center">
                            <code className="bg-muted p-1 rounded text-xs font-mono">
                              {invite.code || "N/A"}
                            </code>
                            {invite.code && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleCopyCode(invite.code!)}
                                className="ml-2 h-6 w-6 p-0"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{new Date(invite.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {invite.expires_at ? (
                          <span>
                            {new Date(invite.expires_at).toLocaleDateString()}
                            {isExpired && invite.status === 'pending' && (
                              <span className="ml-2 text-xs text-red-500">(Expired)</span>
                            )}
                          </span>
                        ) : "N/A"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            status === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : status === "accepted" || status === "used"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }
                        >
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : !isLoading && !isError ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No invitations found. Create one above.</p>
          </div>
        ) : null}
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground">Student invitations expire after 7 days.</p>
      </CardFooter>
    </Card>
  );
};

export default StudentInviteList;
