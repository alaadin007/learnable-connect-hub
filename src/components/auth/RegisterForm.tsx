import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate, Link } from "react-router-dom"; 
import { isDataResponse, isValidData } from "@/utils/supabaseHelpers";

interface RegisterFormProps {
  onSuccess?: () => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [userType, setUserType] = useState("student");
  const [schoolCode, setSchoolCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleEmailChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value);
    setRegistrationError(null);
  };

  const handlePasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(event.target.value);
    setRegistrationError(null);
  };

  const handleFullNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFullName(event.target.value);
    setRegistrationError(null);
  };

  const handleUserTypeChange = (value: string | null) => {
    if (value) {
      setUserType(value);
      setRegistrationError(null);
    }
  };

  const handleSchoolCodeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSchoolCode(event.target.value);
    setRegistrationError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setRegistrationError(null);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            full_name: fullName,
            user_type: userType,
            school_code: schoolCode,
          }
        },
      });

      if (error) {
        console.error("Registration error:", error);
        setRegistrationError(error.message || "An error occurred during registration.");
        return;
      }

      if (data?.user?.id) {
        // Get the user role from the profiles table
        const role = await getUserRole(data.user.id);

        // Redirect based on user type
        if (userType === 'school') {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }

        toast.success("Registration successful! Please check your email to verify your account.");
        if (onSuccess) {
          onSuccess();
        }
      } else {
        setRegistrationError("Failed to retrieve user information after registration.");
      }
    } catch (error: any) {
      console.error("Registration catch block error:", error);
      setRegistrationError(error.message || "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update the getUserRole function to use the helper
  const getUserRole = async (userId: string) => {
    try {
      const response = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', userId)
        .limit(1);
        
      if (!isDataResponse(response) || response.data.length === 0) {
        return null;
      }
      
      const profile = response.data[0];
      if (!profile || !('user_type' in profile)) {
        return null;
      }
      
      const userTypeValue = profile.user_type;
      if (!userTypeValue) {
        return null;
      }
      
      switch (userTypeValue) {
        case 'school':
          return 'School Admin';
        case 'teacher':
          return 'Teacher';
        case 'student':
          return 'Student';
        default:
          return userTypeValue;
      }
    } catch (error) {
      console.error('Error getting user role:', error);
      return null;
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-learnable-super-light">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">Register</CardTitle>
          <CardDescription className="text-center">Create an account to continue</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {registrationError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{registrationError}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSubmit}>
            <div className="grid gap-2 mb-4">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                placeholder="Enter your email"
                type="email"
                value={email}
                onChange={handleEmailChange}
                disabled={isSubmitting}
                required
              />
            </div>
            <div className="grid gap-2 mb-4">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                placeholder="Enter your password"
                type="password"
                value={password}
                onChange={handlePasswordChange}
                disabled={isSubmitting}
                required
              />
            </div>
            <div className="grid gap-2 mb-4">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                placeholder="Enter your full name"
                type="text"
                value={fullName}
                onChange={handleFullNameChange}
                disabled={isSubmitting}
                required
              />
            </div>
            <div className="grid gap-2 mb-4">
              <Label>User Type</Label>
              <RadioGroup defaultValue={userType} onValueChange={handleUserTypeChange}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="student" id="student" disabled={isSubmitting} />
                  <Label htmlFor="student">Student</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="teacher" id="teacher" disabled={isSubmitting} />
                  <Label htmlFor="teacher">Teacher</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="school" id="school" disabled={isSubmitting} />
                  <Label htmlFor="school">School Admin</Label>
                </div>
              </RadioGroup>
            </div>
            {userType !== 'student' && (
              <div className="grid gap-2 mb-4">
                <Label htmlFor="schoolCode">School Code</Label>
                <Input
                  id="schoolCode"
                  placeholder="Enter your school code"
                  type="text"
                  value={schoolCode}
                  onChange={handleSchoolCodeChange}
                  disabled={isSubmitting}
                />
              </div>
            )}
            <Button className="w-full gradient-bg" type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registering...
                </>
              ) : (
                "Register"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="text-center">
          <p className="text-sm text-gray-500">
            Already have an account?{" "}
            <Link to="/login" className="text-blue-600 hover:underline">
              Log In
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default RegisterForm;
