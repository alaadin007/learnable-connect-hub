
import React, { useState, useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/landing/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const StudentSettings = () => {
  const { user, profile } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>(undefined);
  const [subjects, setSubjects] = useState("");
  const [board, setBoard] = useState("");
  const [level, setLevel] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Load initial profile data from the Auth context
    if (profile) {
      setFullName(profile.full_name || "");
      setEmail(user?.email || "");
    }

    // Fetch additional student profile data if available
    const fetchProfileData = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (error) throw error;
        
        if (data) {
          // Set data from profiles table
          if (data.full_name) setFullName(data.full_name);
          
          // Try to get additional metadata if available
          const metadata = user.user_metadata || {};
          
          if (metadata.date_of_birth) {
            setDateOfBirth(new Date(metadata.date_of_birth));
          }
          
          if (metadata.subjects) {
            setSubjects(Array.isArray(metadata.subjects) 
              ? metadata.subjects.join(", ") 
              : metadata.subjects);
          }
          
          if (metadata.board) {
            setBoard(metadata.board);
          }
          
          if (metadata.level) {
            setLevel(metadata.level);
          }
        }
      } catch (error) {
        console.error("Error fetching student profile:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfileData();
  }, [user, profile]);

  const handleSaveProfile = async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      // Convert subjects string to array
      const subjectsArray = subjects
        .split(",")
        .map(subject => subject.trim())
        .filter(subject => subject !== "");
        
      // Update the profiles table
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          updated_at: new Date().toISOString()
        })
        .eq("id", user.id);
        
      if (profileError) throw profileError;
      
      // Update user metadata
      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          date_of_birth: dateOfBirth ? dateOfBirth.toISOString().split('T')[0] : null,
          subjects: subjectsArray,
          board,
          level
        }
      });
      
      if (metadataError) throw metadataError;

      toast.success("Profile updated successfully!");
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error(error.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow bg-learnable-super-light py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold mb-6 gradient-text">Student Settings</h1>
          
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal information and academic details
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p>Loading your profile...</p>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input 
                        id="fullName" 
                        value={fullName} 
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Your full name" 
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input 
                        id="email" 
                        value={email} 
                        disabled
                        placeholder="Your email address" 
                      />
                      <p className="text-sm text-muted-foreground">
                        Email cannot be changed
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Date of Birth</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !dateOfBirth && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateOfBirth ? format(dateOfBirth, "PPP") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={dateOfBirth}
                            onSelect={setDateOfBirth}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="board">Examination Board</Label>
                      <Input 
                        id="board" 
                        value={board} 
                        onChange={(e) => setBoard(e.target.value)}
                        placeholder="e.g., AQA, OCR, AP, IB" 
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="level">Academic Level</Label>
                      <Input 
                        id="level" 
                        value={level} 
                        onChange={(e) => setLevel(e.target.value)}
                        placeholder="e.g., GCSE, A-Level, AP Course" 
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="subjects">Subjects</Label>
                    <Textarea 
                      id="subjects" 
                      value={subjects} 
                      onChange={(e) => setSubjects(e.target.value)}
                      placeholder="Enter subjects separated by commas (e.g., Biology, Chemistry, Physics)" 
                      rows={3}
                    />
                    <p className="text-sm text-muted-foreground">
                      List the subjects you are studying, separated by commas
                    </p>
                  </div>
                  
                  <Button 
                    onClick={handleSaveProfile} 
                    disabled={isSaving}
                    className="gradient-bg"
                  >
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default StudentSettings;
