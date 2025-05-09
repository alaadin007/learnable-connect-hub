
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SchoolCodeGenerator from './SchoolCodeGenerator';
import { useSchoolCode } from '@/hooks/use-school-code';
import { ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SchoolCodeManagerProps {
  schoolId: string;
  currentCode?: string;
  onCodeGenerated?: (code: string) => void;
  variant?: string;
  label?: string;
  description?: string;
}

const SchoolCodeManager = ({ 
  schoolId, 
  currentCode, 
  onCodeGenerated,
  variant,
  label = "School Invitation Code",
  description = "Share this code with teachers to join your school"
}: SchoolCodeManagerProps) => {
  const [activeTab, setActiveTab] = useState("teacher");
  const [teacherCode, setTeacherCode] = useState(currentCode || '');
  const [studentCode, setStudentCode] = useState('');
  const { generateStudentInviteCode } = useSchoolCode();
  
  useEffect(() => {
    if (currentCode) {
      setTeacherCode(currentCode);
    }
  }, [currentCode]);

  const handleGenerateStudentCode = async () => {
    const code = await generateStudentInviteCode(schoolId);
    if (code) {
      setStudentCode(code);
      toast.success("New student invitation code generated");
    }
  };
  
  const handleTeacherCodeGenerated = (code: string) => {
    setTeacherCode(code);
    if (onCodeGenerated) {
      onCodeGenerated(code);
    }
  };

  if (variant === "small") {
    return (
      <div className="mb-4">
        <h3 className="text-lg font-medium mb-2">{label}</h3>
        <p className="text-sm text-gray-500 mb-2">{description}</p>
        <SchoolCodeGenerator 
          onCodeGenerated={handleTeacherCodeGenerated}
          variant="small"
        />
      </div>
    );
  }

  return (
    <div>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="teacher">Teacher Code</TabsTrigger>
          <TabsTrigger value="student">Student Code</TabsTrigger>
        </TabsList>
        <TabsContent value="teacher">
          <div className="space-y-4">
            <Card className="border-0 shadow-none">
              <CardContent className="p-0">
                <SchoolCodeGenerator 
                  onCodeGenerated={handleTeacherCodeGenerated}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="student">
          <Card className="border-0 shadow-none">
            <CardContent className="p-0">
              {studentCode ? (
                <div className="flex flex-col space-y-4">
                  <Card className="p-4">
                    <div className="text-center">
                      <div className="text-xl font-mono font-semibold mb-2">{studentCode}</div>
                      <p className="text-sm text-gray-500">
                        This code expires in 7 days
                      </p>
                    </div>
                  </Card>
                  <Button onClick={handleGenerateStudentCode}>
                    Generate New Student Code
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col space-y-4">
                  <p className="text-sm text-gray-600">
                    Generate a one-time code that students can use to register for your school.
                    Each code can be used multiple times until it expires.
                  </p>
                  <Button onClick={handleGenerateStudentCode} className="flex items-center">
                    Generate Student Code <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SchoolCodeManager;
