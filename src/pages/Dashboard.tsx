
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Users, Book, BarChart2, UserPlus, School, LogOut } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

// Placeholder dashboard - will be expanded in future iterations
const Dashboard = () => {
  const { userRole, isSuperviser, signOut } = useAuth();
  
  const handleSignOut = async () => {
    await signOut();
  };
  
  return (
    <div className="container mx-auto p-6">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold gradient-text mb-2">Dashboard</h1>
          <p className="text-learnable-gray">
            Welcome to your LearnAble dashboard.
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={handleSignOut}
          className="flex items-center gap-2"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-medium">Students</CardTitle>
            <Users className="h-5 w-5 text-learnable-blue" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Active students</p>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-medium">Conversations</CardTitle>
            <MessageSquare className="h-5 w-5 text-learnable-green" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">AI conversations this month</p>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-medium">Subjects</CardTitle>
            <Book className="h-5 w-5 text-learnable-blue" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Active learning subjects</p>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-medium">Progress</CardTitle>
            <BarChart2 className="h-5 w-5 text-learnable-green" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">Average learning progress</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="card-hover">
          <CardHeader>
            <CardTitle>AI Learning Assistant</CardTitle>
            <CardDescription>Start a conversation with the AI learning assistant</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full gradient-bg" 
              onClick={() => toast.info("AI assistant feature coming soon.")}
            >
              <MessageSquare className="mr-2 h-4 w-4" /> Start a conversation
            </Button>
          </CardContent>
        </Card>
        
        <Card className="card-hover">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and actions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {userRole === 'school' && isSuperviser && (
              <Button 
                variant="outline" 
                className="w-full justify-start"
                asChild
              >
                <Link to="/school-admin">
                  <School className="mr-2 h-4 w-4" /> School Admin Panel
                </Link>
              </Button>
            )}
            
            {(userRole === 'school' || userRole === 'teacher') && (
              <Button 
                variant="outline" 
                className="w-full justify-start" 
                asChild
              >
                <Link to="/students">
                  <Users className="mr-2 h-4 w-4" /> Manage Students
                </Link>
              </Button>
            )}
            
            {userRole === 'school' && isSuperviser && (
              <Button 
                variant="outline" 
                className="w-full justify-start"
                asChild
              >
                <Link to="/school-admin">
                  <UserPlus className="mr-2 h-4 w-4" /> Invite Teachers
                </Link>
              </Button>
            )}
            
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => toast.info("Reports and analytics coming soon.")}
            >
              <BarChart2 className="mr-2 h-4 w-4" /> View Reports
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
