import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { toast } from 'sonner';
import { supabase, TEST_SCHOOL_CODE } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface SchoolCodeData {
  id: string;
  name: string;
  code: string;
  active: boolean;
}

export const RegisterForm: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [schoolCode, setSchoolCode] = useState('');
  const [userType, setUserType] = useState<"teacher" | "student" | "school">('student');
  const [schoolName, setSchoolName] = useState<string | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [schoolCodeValid, setSchoolCodeValid] = useState(false);
  const [schoolCodeLoading, setSchoolCodeLoading] = useState(false);
  const [schoolCodeError, setSchoolCodeError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { signUp } = useAuth();

  useEffect(() => {
    // Check if the school code is the test school code
    if (schoolCode.trim().toUpperCase() === TEST_SCHOOL_CODE) {
      setSchoolName('Test School');
      setSchoolCodeValid(true);
      setSchoolCodeError(null);
      return;
    }

    if (schoolCode.trim() === '') {
      setSchoolName(null);
      setSchoolCodeValid(false);
      setSchoolCodeError(null);
      return;
    }

    const checkSchoolCode = async () => {
      setSchoolCodeLoading(true);
      setSchoolCodeError(null);
      try {
        const { data, error } = await supabase
          .from('schools')
          .select('*')
          .eq('code', schoolCode)
          .single();

        if (error) {
          console.error("Error fetching school:", error);
          setSchoolName(null);
          setSchoolCodeValid(false);
          setSchoolCodeError("Invalid school code");
        } else if (data) {
          const schoolData = processSchool(data);
          if (schoolData.active) {
            setSchoolName(schoolData.name);
            setSchoolId(schoolData.id);
            setSchoolCodeValid(true);
          } else {
            setSchoolName(null);
            setSchoolCodeValid(false);
            setSchoolCodeError("School code is not active");
          }
        } else {
          setSchoolName(null);
          setSchoolCodeValid(false);
          setSchoolCodeError("School code not found");
        }
      } catch (err) {
        console.error("Error:", err);
        setSchoolName(null);
        setSchoolCodeValid(false);
        setSchoolCodeError("Failed to validate school code");
      } finally {
        setSchoolCodeLoading(false);
      }
    };

    checkSchoolCode();
  }, [schoolCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!schoolCodeValid) {
      toast.error("Please enter a valid school code.");
      return;
    }

    setIsSubmitting(true);
    try {
      const metadata = {
        full_name: fullName,
        user_type: userType,
        school_code: schoolCode
      };

      const { error } = await signUp(email, password, metadata);

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Registration successful! Please check your email to verify your account.");
        navigate('/login');
      }
    } catch (err) {
      console.error("Error during registration:", err);
      toast.error("An unexpected error occurred during registration.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const processSchool = (data: any): SchoolCodeData => {
    return {
      id: data.id,
      name: data.name,
      code: data.school_code || data.code, // Handle both field formats
      active: data.active !== undefined ? data.active : true
    };
  };

  const handleUserTypeChange = (value: string) => {
    setUserType(value as "teacher" | "student" | "school");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="fullName">Full Name</Label>
        <Input
          type="text"
          id="fullName"
          placeholder="Enter your full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          type="email"
          id="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          type="password"
          id="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor="schoolCode">School Code</Label>
        <Input
          type="text"
          id="schoolCode"
          placeholder="Enter your school code"
          value={schoolCode}
          onChange={(e) => setSchoolCode(e.target.value)}
          required
        />
        {schoolCodeLoading && <p className="text-sm text-gray-500">Validating school code...</p>}
        {schoolCodeError && <p className="text-sm text-red-500">{schoolCodeError}</p>}
        {schoolName && !schoolCodeError && <p className="text-sm text-green-500">School: {schoolName}</p>}
      </div>
      <div>
        <Label htmlFor="userType">User Type</Label>
        <Select onValueChange={handleUserTypeChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select user type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="student">Student</SelectItem>
            <SelectItem value="teacher">Teacher</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={isSubmitting || !schoolCodeValid} className="w-full">
        {isSubmitting ? 'Submitting...' : 'Register'}
      </Button>
    </form>
  );
};
